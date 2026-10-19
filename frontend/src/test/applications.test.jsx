import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import JobDetails from '../features/jobs/JobDetails';
import { ToastProvider } from '../shared/ui';
import { makeStore } from '../app/store';
import { credentials } from '../app/authSlice';
const job = {
  id: 9,
  title: 'Developer',
  companyName: 'Test Company',
  categoryName: 'Engineering',
  locationCity: 'Kochi',
  workMode: 'hybrid',
  employmentType: 'full_time',
  experienceLevel: 'junior',
  minExperienceMonths: 0,
  maxExperienceMonths: 24,
  salaryMinAnnualInr: null,
  salaryMaxAnnualInr: null,
  description: 'Build useful software',
  skills: ['React']
};
function session({ status = null, statusFails = false, conflict = false } = {}) {
  let current = status;
  const fetchMock = vi.fn(async (req) => {
    const path = new URL(req.url).pathname;
    if (path === '/api/jobs/9') return Response.json({ success: true, data: job });
    if (path === '/api/applications/job/9')
      return statusFails
        ? Response.json(
            { success: false, error: { message: 'Could not check application status' } },
            { status: 503 }
          )
        : Response.json({
            success: true,
            data: current ? { id: 1, jobId: 9, status: current } : null
          });
    if (path === '/api/applications' && req.method === 'POST') {
      current = 'submitted';
      return conflict
        ? Response.json(
            {
              success: false,
              error: { code: 'ALREADY_APPLIED', message: 'You have already applied for this job' }
            },
            { status: 409 }
          )
        : Response.json(
            { success: true, data: { id: 1, jobId: 9, status: current } },
            { status: 201 }
          );
    }
    throw new Error('Unexpected test request');
  });
  vi.stubGlobal('fetch', fetchMock);
  const mount = () => {
    const store = makeStore();
    store.dispatch(
      credentials({
        user: { id: 1, fullName: 'Candidate', role: 'candidate' },
        accessToken: 'test-access'
      })
    );
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/jobs/9']}>
          <ToastProvider>
            <Routes>
              <Route path="/jobs/:id" element={<JobDetails />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </Provider>
    );
  };
  let view = mount();
  return {
    fetchMock,
    refresh() {
      view.unmount();
      view = mount();
    },
    posts: () => fetchMock.mock.calls.filter(([req]) => req.method === 'POST')
  };
}
it.each(['submitted', 'reviewed', 'shortlisted', 'rejected'])(
  'an existing %s application disables repeat apply',
  async (status) => {
    const s = session({ status });
    expect(await screen.findByRole('button', { name: 'Already applied' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Apply for this role' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cover note (optional)')).not.toBeInTheDocument();
    expect(s.posts()).toHaveLength(0);
  }
);
it('a successful application stays disabled after a fresh page session', async () => {
  const s = session(),
    user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Apply for this role' }));
  expect(await screen.findByRole('button', { name: 'Already applied' })).toBeDisabled();
  expect(s.posts()).toHaveLength(1);
  s.refresh();
  expect(await screen.findByRole('button', { name: 'Already applied' })).toBeDisabled();
  expect(s.posts()).toHaveLength(1);
});
it('an application-status failure offers retry instead of allowing an unchecked submission', async () => {
  const s = session({ statusFails: true });
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Apply for this role' })).not.toBeInTheDocument();
  expect(s.posts()).toHaveLength(0);
});
it('a duplicate conflict from another tab changes the page to Already applied', async () => {
  const s = session({ conflict: true }),
    user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Apply for this role' }));
  expect(await screen.findByRole('button', { name: 'Already applied' })).toBeDisabled();
  expect(s.posts()).toHaveLength(1);
});
