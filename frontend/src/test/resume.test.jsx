import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import App from '../app/App';
import { makeStore } from '../app/store';
const savedResume = {
  originalName: 'selected-resume.pdf',
  sizeBytes: 100,
  uploadedAt: '2026-10-18T09:00:00Z'
};
function profileSession(initialProfile = null) {
  let profile = initialProfile;
  const fetchMock = vi.fn(async (req) => {
    const path = new URL(req.url).pathname;
    if (path.endsWith('/auth/refresh'))
      return Response.json({
        success: true,
        data: {
          user: { id: 1, fullName: 'Test Candidate', role: 'candidate' },
          accessToken: 'test-access'
        }
      });
    if (path === '/api/profile' && req.method === 'PUT')
      profile = {
        currentCity: 'Kochi',
        totalExperienceMonths: 0,
        skills: ['React', 'SQL'],
        resume: profile?.resume || savedResume
      };
    return Response.json({ success: true, data: profile });
  });
  vi.stubGlobal('fetch', fetchMock);
  const mount = () =>
    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      </Provider>
    );
  let view = mount();
  return {
    fetchMock,
    refresh() {
      view.unmount();
      view = mount();
    }
  };
}
async function fillDetails(user) {
  await user.type(await screen.findByLabelText('Current city'), 'Kochi');
  await user.type(screen.getByLabelText('Skills (comma separated)'), 'React, SQL');
}
it('requires a PDF before a new profile can be saved', async () => {
  const { fetchMock } = profileSession(),
    user = userEvent.setup();
  await fillDetails(user);
  await user.click(screen.getByRole('button', { name: 'Save profile', exact: true }));
  expect(
    screen.getByText('Choose a PDF resume up to 5 MiB to save your profile.')
  ).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([req]) => req.method === 'PUT')).toBe(false);
});
it('saves profile and PDF together and displays the saved resume/download after a fresh session', async () => {
  const session = profileSession(),
    user = userEvent.setup();
  await fillDetails(user);
  await user.upload(
    screen.getByLabelText('Choose PDF resume'),
    new File(['%PDF-test'], 'selected-resume.pdf', { type: 'application/pdf' })
  );
  await user.click(screen.getByRole('button', { name: 'Save profile', exact: true }));
  expect(await screen.findByText('selected-resume.pdf', { exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download resume' })).toBeInTheDocument();
  expect(session.fetchMock.mock.calls.filter(([req]) => req.method === 'PUT')).toHaveLength(1);
  expect(
    session.fetchMock.mock.calls.some(([req]) =>
      new URL(req.url).pathname.endsWith('/profile/resume')
    )
  ).toBe(false);
  session.refresh();
  expect(await screen.findByText('selected-resume.pdf', { exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download resume' })).toBeInTheDocument();
  expect(screen.getByLabelText('Replace PDF resume').files).toHaveLength(0);
});
it('can edit a saved profile without selecting its resume again', async () => {
  const { fetchMock } = profileSession({
    currentCity: 'Kochi',
    totalExperienceMonths: 0,
    skills: ['React'],
    resume: savedResume
  });
  const user = userEvent.setup();
  await screen.findByText('selected-resume.pdf', { exact: true });
  await user.click(screen.getByRole('button', { name: 'Save profile', exact: true }));
  expect(await screen.findByRole('status')).toHaveTextContent('Profile and resume saved');
  expect(fetchMock.mock.calls.some(([req]) => req.method === 'PUT')).toBe(true);
});
it('rejects an invalid file without submitting profile data', async () => {
  const { fetchMock } = profileSession(),
    user = userEvent.setup({ applyAccept: false });
  await fillDetails(user);
  await user.upload(
    screen.getByLabelText('Choose PDF resume'),
    new File(['not PDF'], 'photo.png', { type: 'image/png' })
  );
  await user.click(screen.getByRole('button', { name: 'Save profile', exact: true }));
  expect(screen.getByText('Choose a PDF file up to 5 MiB.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([req]) => req.method === 'PUT')).toBe(false);
});
