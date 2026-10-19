import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { makeStore } from '../app/store';
import App from '../app/App';
import { credentials, signedOut } from '../app/authSlice';
import { baseApi, renew } from '../app/baseApi';
import { validFilters } from '../features/jobs/filters';
const wrap = (path = '/') =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>
  );
function emptyNavigationResponse(req) {
  const isDashboard = new URL(req.url).pathname.endsWith('/admin/dashboard');
  return Response.json({
    success: true,
    data: isDashboard
      ? {
          totalJobs: 0,
          publishedJobs: 0,
          draftJobs: 0,
          closedJobs: 0,
          candidates: 0,
          applications: 0,
          recentJobs: []
        }
      : [],
    meta: { total: 0 }
  });
}
function mockApi(handler) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) => {
      const request =
        input instanceof Request ? input : new Request(new URL(input, 'http://localhost'));
      const path = new URL(request.url).pathname;
      if (path.endsWith('/auth/refresh'))
        return Response.json(
          { success: false, error: { code: 'UNAUTHENTICATED' } },
          { status: 401 }
        );
      return handler(path, request);
    })
  );
}
it('normalizes malicious and invalid URL filters', () => {
  expect(
    validFilters(
      new URLSearchParams('page=-3&sort=sql&categoryId=bad&workMode=remote&status=draft')
    )
  ).toEqual({ page: 1, workMode: 'remote' });
});
it('shows API-backed home sections and real empty states', async () => {
  mockApi((path) =>
    Response.json({
      success: true,
      data: path.endsWith('categories') ? [{ id: 1, name: 'Engineering', jobCount: 0 }] : [],
      meta: { total: 0 }
    })
  );
  wrap();
  expect(await screen.findByRole('heading', { name: /find work/i })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Engineering' })).toBeInTheDocument();
  expect((await screen.findAllByText('Nothing here yet')).length).toBeGreaterThan(0);
});
it('home shortcuts use active option names and codes from the API', async () => {
  mockApi((path) =>
    Response.json({
      success: true,
      data: path.endsWith('/job-options')
        ? {
            workMode: [{ code: 'anywhere', name: 'Anywhere work', isActive: 1 }],
            experienceLevel: [
              { code: 'retired', name: 'Retired option', isActive: 0 },
              { code: 'principal', name: 'Principal roles', isActive: 1 }
            ],
            employmentType: []
          }
        : [],
      meta: { total: 0 }
    })
  );
  wrap();
  expect(await screen.findByRole('link', { name: 'Anywhere work', exact: true })).toHaveAttribute(
    'href',
    '/jobs?workMode=anywhere'
  );
  expect(screen.getByRole('link', { name: 'Principal roles', exact: true })).toHaveAttribute(
    'href',
    '/jobs?experienceLevel=principal'
  );
  expect(
    screen.queryByRole('link', { name: 'Retired option', exact: true })
  ).not.toBeInTheDocument();
});
it('requires both email and mobile during registration', async () => {
  mockApi(() => Response.json({ success: true, data: [] }));
  wrap('/register');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Full name'), 'Candidate');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'a long passphrase');
  await user.type(screen.getByLabelText('Confirm password'), 'a long passphrase');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByText('Email is required')).toBeInTheDocument();
  expect(screen.getByText('Mobile number is required')).toBeInTheDocument();
  expect(screen.getByLabelText('Email', { exact: true })).toBeRequired();
  expect(screen.getByLabelText('Mobile with country code')).toBeRequired();
});
it('all registration fields are required and show field-specific errors', async () => {
  mockApi(() => Response.json({ data: [] }));
  wrap('/register');
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Create account' }));
  for (const message of [
    'Full name is required',
    'Email is required',
    'Mobile number is required',
    'Password is required',
    'Confirm your password'
  ])
    expect(screen.getByText(message)).toBeInTheDocument();
  for (const label of [
    'Full name',
    'Email',
    'Mobile with country code',
    'Password',
    'Confirm password'
  ])
    expect(screen.getByLabelText(label, { exact: true })).toBeRequired();
});
it.each(['email', 'mobileNumber'])(
  'registration cannot submit when only %s is missing',
  async (missing) => {
    mockApi(() => Response.json({ data: [] }));
    wrap('/register');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Full name'), 'Candidate');
    if (missing !== 'email')
      await user.type(screen.getByLabelText('Email', { exact: true }), 'candidate@example.test');
    if (missing !== 'mobileNumber')
      await user.type(screen.getByLabelText('Mobile with country code'), '+919876543210');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'a test passphrase');
    await user.type(screen.getByLabelText('Confirm password'), 'a test passphrase');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      screen.getByText(missing === 'email' ? 'Email is required' : 'Mobile number is required')
    ).toBeInTheDocument();
    expect(
      fetch.mock.calls.some(([req]) => new URL(req.url).pathname.endsWith('/auth/register'))
    ).toBe(false);
  }
);
it('validates email on blur and updates the error while correcting it without submitting', async () => {
  mockApi(() => Response.json({ data: [] }));
  wrap('/register');
  const user = userEvent.setup();
  const email = await screen.findByLabelText('Email', { exact: true });
  await user.type(email, 'wrong-email');
  expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
  await user.tab();
  expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
  expect(email).toHaveAttribute('aria-invalid', 'true');
  expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
  await user.clear(email);
  expect(screen.getByText('Email is required')).toBeInTheDocument();
  await user.type(email, 'candidate@example.test');
  expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
  expect(email).toHaveAttribute('aria-invalid', 'false');
  expect(
    fetch.mock.calls.some(([req]) => new URL(req.url).pathname.endsWith('/auth/register'))
  ).toBe(false);
});
it('validates required fields and password confirmation on blur, including password changes', async () => {
  mockApi(() => Response.json({ data: [] }));
  wrap('/register');
  const user = userEvent.setup();
  await user.click(await screen.findByLabelText('Full name'));
  await user.tab();
  expect(screen.getByText('Full name is required')).toBeInTheDocument();
  await user.click(screen.getByLabelText('Mobile with country code'));
  await user.tab();
  expect(screen.getByText('Mobile number is required')).toBeInTheDocument();
  const password = screen.getByLabelText('Password', { exact: true });
  await user.type(password, 'short');
  await user.tab();
  expect(screen.getByText('Use at least 10 characters')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Confirm password'), 'long passphrase');
  await user.tab();
  expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  await user.clear(password);
  await user.type(password, 'long passphrase');
  expect(screen.queryByText('Use at least 10 characters')).not.toBeInTheDocument();
  expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
  await user.type(password, '!');
  expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
});
it.each(['letters', '+919876abc210', '9876543210', '+12', '+1234567890123456'])(
  'rejects invalid mobile input %s on blur and clears the error after correction',
  async (value) => {
    mockApi(() => Response.json({ data: [] }));
    wrap('/register');
    const user = userEvent.setup();
    const mobile = await screen.findByLabelText('Mobile with country code');
    await user.type(mobile, value);
    await user.tab();
    expect(mobile).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText('Enter a valid mobile number with country code, e.g. +919876543210')
    ).toBeInTheDocument();
    await user.clear(mobile);
    await user.type(mobile, '+91 98765 43210');
    expect(mobile).toHaveAttribute('aria-invalid', 'false');
    expect(
      screen.queryByText('Enter a valid mobile number with country code, e.g. +919876543210')
    ).not.toBeInTheDocument();
    expect(
      fetch.mock.calls.some(([req]) => new URL(req.url).pathname.endsWith('/auth/register'))
    ).toBe(false);
  }
);
it('anonymous protected routes lead to sign in', async () => {
  mockApi(() => Response.json({ data: [] }));
  wrap('/profile');
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
});
it('network failure during bootstrap is recoverable and is not rendered as signed out', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Network error')))
  );
  wrap();
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument();
});
it('concurrent protected requests coordinate one refresh and retry with the new access token', async () => {
  let refreshes = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req) => {
      const path = new URL(req.url).pathname;
      if (path.endsWith('/auth/refresh')) {
        refreshes++;
        await new Promise((resolve) => setTimeout(resolve, 25));
        return Response.json({
          success: true,
          data: { user: { id: 1, role: 'candidate' }, accessToken: 'fresh' }
        });
      }
      if (req.headers.get('Authorization') !== 'Bearer fresh')
        return Response.json({ success: false }, { status: 401 });
      return Response.json({ success: true, data: [] });
    })
  );
  const store = makeStore();
  store.dispatch(credentials({ user: { id: 1, role: 'candidate' }, accessToken: 'expired' }));
  const results = await Promise.all([
    store.dispatch(baseApi.endpoints.profile.initiate()),
    store.dispatch(baseApi.endpoints.applications.initiate({ page: 1 }))
  ]);
  expect(results.every((r) => r.isSuccess)).toBe(true);
  expect(refreshes).toBe(1);
  expect(store.getState().auth.accessToken).toBe('fresh');
  store.dispatch(baseApi.util.resetApiState());
  await waitFor(() => expect(store.getState().api.queries).toEqual({}));
});
it('a late refresh cannot restore a signed-out account', async () => {
  let finish;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    )
  );
  const store = makeStore();
  store.dispatch(credentials({ user: { id: 1, role: 'candidate' }, accessToken: 'old' }));
  const promise = renew({
    dispatch: store.dispatch,
    getState: store.getState,
    signal: new AbortController().signal
  });
  await waitFor(() => expect(finish).toBeDefined());
  store.dispatch(signedOut());
  finish(
    Response.json({
      success: true,
      data: { user: { id: 1, role: 'candidate' }, accessToken: 'late' }
    })
  );
  expect((await promise).error.status).toBe(401);
  expect(store.getState().auth.user).toBeNull();
});

it.each([null, 'candidate', 'admin'])(
  'admin navigation is visible only for an admin (role: %s)',
  async (role) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req) => {
        if (new URL(req.url).pathname.endsWith('/auth/refresh')) {
          return role
            ? Response.json({
                success: true,
                data: { user: { id: 1, fullName: 'Test User', role }, accessToken: 'test-access' }
              })
            : Response.json({ success: false }, { status: 401 });
        }
        return emptyNavigationResponse(req);
      })
    );
    wrap();
    await screen.findByRole('heading', {
      name: role === 'admin' ? /a little overview/i : /find work/i
    });
    const adminLinks = screen
      .queryAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/admin'));
    if (role === 'admin') {
      expect(
        screen.queryByRole('link', { name: 'Find a job', exact: true })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Find opportunities', exact: true })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Candidate profile', exact: true })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dashboard', exact: true })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Manage jobs', exact: true })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Admin portal', exact: true })).toHaveAttribute(
        'href',
        '/admin'
      );
    } else {
      expect(screen.getByRole('link', { name: 'Find a job', exact: true })).toBeInTheDocument();
      expect(adminLinks).toHaveLength(0);
      expect(
        screen.queryByRole('link', { name: 'Dashboard', exact: true })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Manage jobs', exact: true })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Admin portal', exact: true })
      ).not.toBeInTheDocument();
    }
  }
);

it('signing out removes admin links from both header and footer', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req) => {
      const path = new URL(req.url).pathname;
      if (path.endsWith('/auth/refresh'))
        return Response.json({
          success: true,
          data: {
            user: { id: 1, fullName: 'Test Admin', role: 'admin' },
            accessToken: 'test-access'
          }
        });
      if (path.endsWith('/auth/logout')) return new Response(null, { status: 204 });
      return emptyNavigationResponse(req);
    })
  );
  wrap();
  await screen.findByRole('link', { name: 'Admin portal' });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('link', { name: 'Sign in', exact: true });
  expect(
    screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/admin'))
  ).toHaveLength(0);
});

it.each(['/jobs', '/jobs/1'])(
  'admin visiting %s is redirected to the dashboard without loading candidate jobs',
  async (path) => {
    const fetchMock = vi.fn(async (req) => {
      if (new URL(req.url).pathname.endsWith('/auth/refresh'))
        return Response.json({
          success: true,
          data: { user: { id: 1, fullName: 'Admin', role: 'admin' }, accessToken: 'test-access' }
        });
      return emptyNavigationResponse(req);
    });
    vi.stubGlobal('fetch', fetchMock);
    wrap(path);
    expect(await screen.findByRole('heading', { name: /a little overview/i })).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([req]) => /^\/api\/jobs(?:\/|$)/.test(new URL(req.url).pathname))
    ).toBe(false);
  }
);

it.each([
  ['/login', 'candidate'],
  ['/admin/login', 'admin']
])(
  'login at %s sends its intended role and displays a mismatch without signing in',
  async (route, role) => {
    let submitted;
    mockApi(async (path, req) => {
      if (path.endsWith('/auth/login')) {
        submitted = await req.json();
        return Response.json(
          {
            success: false,
            error: {
              code: 'LOGIN_ROLE_MISMATCH',
              message: 'Please use the correct login page.'
            }
          },
          { status: 403 }
        );
      }
      return emptyNavigationResponse(req);
    });
    wrap(route);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email or mobile number'), 'role@example.test');
    await user.type(screen.getByLabelText('Password'), 'a-test-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Please use the correct login page.')).toBeInTheDocument();
    expect(submitted.loginRole).toBe(role);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  }
);
