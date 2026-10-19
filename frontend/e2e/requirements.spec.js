import { test, expect } from '@playwright/test';

const api = 'http://localhost:14000/api';
const origin = process.env.E2E_FRONTEND_ORIGIN || 'http://localhost:5173';
let adminHeaders, categoryId;
const jobs = [];
const query = 'Pagination QA';
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});
async function signIn(page, role = 'candidate') {
  await page.goto(role === 'admin' ? '/admin/login' : '/login');
  await page.getByLabel('Email or mobile number').fill(`browser-${role}@example.test`);
  await page
    .getByLabel('Password', { exact: true })
    .fill(role === 'admin' ? process.env.E2E_ADMIN_PASSWORD : process.env.E2E_CANDIDATE_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(role === 'admin' ? /\/admin(?:\/jobs)?$/ : /\/jobs$/);
}
test.beforeAll(async ({ request }) => {
  const login = await request.post(`${api}/auth/login`, {
    headers: { Origin: origin },
    data: { identifier: 'browser-admin@example.test', password: process.env.E2E_ADMIN_PASSWORD }
  });
  expect(login.status()).toBe(200);
  adminHeaders = { Authorization: `Bearer ${(await login.json()).data.accessToken}` };
  categoryId = (await (await request.get(`${api}/categories`)).json()).data.find(
    (c) => c.name === 'Engineering'
  ).id;
  for (let i = 0; i < 17; i++) {
    const result = await request.post(`${api}/admin/jobs`, {
      headers: adminHeaders,
      data: {
        title: `${query} ${String(i).padStart(2, '0')}`,
        companyName: 'QA Fixture Company',
        categoryId,
        locationCity: 'Kochi',
        employmentType: 'full_time',
        workMode: i % 2 ? 'hybrid' : 'remote',
        experienceLevel: i < 8 ? 'junior' : 'mid',
        minExperienceMonths: 0,
        maxExperienceMonths: 60,
        salaryMinAnnualInr: 400000,
        salaryMaxAnnualInr: 500000 + i * 10000,
        description: 'Isolated pagination and filter test fixture.',
        skills: ['Testing'],
        isFeatured: false,
        status: i === 15 ? 'draft' : i === 16 ? 'closed' : 'published'
      }
    });
    expect(result.status()).toBe(201);
    jobs.push((await result.json()).data.id);
  }
});
test.afterAll(async ({ request }) => {
  for (const id of jobs)
    expect(
      (await request.delete(`${api}/admin/jobs/${id}`, { headers: adminHeaders })).status()
    ).toBe(204);
});

test('public pagination, combined filters, sorting, reset, and browser history use real API data', async ({
  page
}) => {
  await page.goto(`/jobs?q=${encodeURIComponent(query)}`);
  await expect(page.locator('.job-card')).toHaveCount(12);
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  const firstPage = await page.locator('.job-card h3').allTextContents();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.locator('.job-card')).toHaveCount(3);
  const secondPage = await page.locator('.job-card h3').allTextContents();
  expect(secondPage.some((title) => firstPage.includes(title))).toBe(false);
  await page.goBack();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await page.getByLabel('Category', { exact: true }).selectOption(String(categoryId));
  await page.getByLabel('Experience', { exact: true }).selectOption('junior');
  await page.getByLabel('Work mode').selectOption('remote');
  await expect(page.locator('.job-card')).toHaveCount(4);
  await page.getByLabel('City', { exact: true }).fill('Kochi');
  await page.getByLabel('Employment', { exact: true }).selectOption('full_time');
  await page.getByLabel('Sort by').selectOption('salary');
  await expect(page.locator('.job-card h3').first()).toHaveText(`${query} 06`);
  await expect(page.getByRole('navigation', { name: 'Pagination' })).toHaveCount(0);
  await page.getByLabel('City', { exact: true }).fill('NoSuchCity');
  await expect(page.getByText('Nothing here yet')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.locator('.job-card')).toHaveCount(12);
});

test('admin pagination and status filters include drafts and closed jobs', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto(`/admin/jobs?q=${encodeURIComponent(query)}`);
  await expect(page.locator('tbody tr')).toHaveCount(12);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByLabel('Status', { exact: true }).selectOption('draft');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText(`${query} 15`);
  await expect(page).not.toHaveURL(/page=2/);
  await page.getByLabel('Status', { exact: true }).selectOption('closed');
  await expect(page.locator('tbody')).toContainText(`${query} 16`);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true });
});

test('guest and candidate cannot use admin navigation or APIs; admin cannot browse candidate jobs', async ({
  page,
  request
}) => {
  await page.goto('/admin/jobs');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.locator('a[href="/admin"],a[href="/admin/jobs"]')).toHaveCount(0);
  expect((await request.get(`${api}/admin/jobs`)).status()).toBe(401);
  await signIn(page);
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  const candidate = await request.post(`${api}/auth/login`, {
    headers: { Origin: origin },
    data: {
      identifier: 'browser-candidate@example.test',
      password: process.env.E2E_CANDIDATE_PASSWORD
    }
  });
  const headers = { Authorization: `Bearer ${(await candidate.json()).data.accessToken}` };
  expect((await request.get(`${api}/admin/jobs`, { headers })).status()).toBe(403);
  expect((await request.delete(`${api}/admin/jobs/${jobs[0]}`, { headers })).status()).toBe(403);
  await page.goto('/admin/jobs');
  await expect(page.getByRole('heading', { name: 'This space is for admins.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await signIn(page, 'admin');
  await expect(page.getByRole('link', { name: 'Find a job', exact: true })).toHaveCount(0);
  await page.goto(`/jobs/${jobs[0]}`);
  await expect(page).toHaveURL(/\/admin$/);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Manage jobs' })).toBeVisible();
});

test('guest job details require sign-in and restore the selected job after login', async ({
  page
}) => {
  await page.goto(`/jobs/${jobs[0]}`);
  await expect(page.getByRole('heading', { name: `${query} 00`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply for this role' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Sign in to apply' }).click();
  await page.getByLabel('Email or mobile number').fill('browser-candidate@example.test');
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_CANDIDATE_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/jobs/${jobs[0]}$`));
  await expect(page.getByRole('button', { name: 'Apply for this role' })).toBeVisible();
});

test('registration reports email/mobile/password errors on blur and backend rejects invalid phone input', async ({
  page,
  request
}) => {
  await page.goto('/register');
  await page.getByLabel('Email', { exact: true }).fill('invalid-email');
  await page.getByLabel('Mobile with country code').fill('letters');
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('short');
  await expect(
    page.getByText('Enter a valid mobile number with country code, e.g. +919876543210')
  ).toBeVisible();
  await page.getByLabel('Confirm password').fill('different');
  await expect(page.getByText('Use at least 10 characters')).toBeVisible();
  await page.getByLabel('Full name').click();
  await expect(page.getByText('Passwords do not match')).toBeVisible();
  await page.getByLabel('Mobile with country code').fill('+919876543210');
  await expect(
    page.getByText('Enter a valid mobile number with country code, e.g. +919876543210')
  ).toHaveCount(0);
  const invalid = await request.post(`${api}/auth/register`, {
    headers: { Origin: origin },
    data: {
      fullName: 'Invalid Phone',
      email: 'invalid-phone@example.test',
      mobileNumber: 'letters',
      password: process.env.E2E_CANDIDATE_PASSWORD
    }
  });
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error.code).toBe('VALIDATION_ERROR');
});

test('job list shows loading, a safe failure, and retry recovery', async ({ page }) => {
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/jobs?**', async (route) => {
    await held;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Jobs temporarily unavailable. Please retry.'
        }
      })
    });
  });
  await page.goto('/jobs');
  await expect(page.getByText('Loading opportunities…')).toBeVisible();
  release();
  await expect(page.getByRole('alert')).toContainText(
    'Jobs temporarily unavailable. Please retry.'
  );
  await page.unroute('**/api/jobs?**');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.job-card')).toHaveCount(12);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('candidate profile and job details fit mobile and tablet viewports', async ({ page }) => {
  await signIn(page);
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/profile');
    await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.goto(`/jobs/${jobs[0]}`);
    await expect(page.getByRole('heading', { name: `${query} 00`, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
  await page.screenshot({ path: 'test-results/candidate-tablet.png', fullPage: true });
});
