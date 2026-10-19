import { test, expect } from '@playwright/test';
const api = 'http://localhost:14000/api';
const origin = process.env.E2E_FRONTEND_ORIGIN || 'http://localhost:5173';
async function login(page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email or mobile number').fill('browser-admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('link', { name: 'Job options', exact: true }).click();
}
for (const [kind, code] of [
  ['categories', 'qa-category'],
  ['experienceLevel', 'qa_principal'],
  ['workMode', 'qa_flexible'],
  ['employmentType', 'qa_temporary']
]) {
  test(`admin creates, renames and deletes an unused ${kind} option`, async ({ page, request }) => {
    await login(page);
    await page.getByLabel('Option group').selectOption(kind);
    await page.getByRole('button', { name: 'Create option', exact: true }).click();
    await page.getByLabel('Display name').fill(`QA ${kind}`);
    await page.locator('input[name="code"]').fill(code);
    await page.getByRole('button', { name: 'Save option', exact: true }).click();
    await expect(page.getByRole('cell', { name: `QA ${kind}`, exact: true })).toBeVisible();
    if (kind === 'categories') {
      await page.screenshot({ path: 'test-results/admin-options-desktop.png', fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.screenshot({ path: 'test-results/admin-options-mobile.png', fullPage: true });
    }
    await page.getByRole('button', { name: `Edit QA ${kind}`, exact: true }).click();
    await expect(page.locator('input[name="code"]')).toHaveAttribute('readonly', '');
    await page.getByLabel('Display name').fill(`Updated QA ${kind}`);
    await page.getByRole('button', { name: 'Save option', exact: true }).click();
    await expect(page.getByRole('cell', { name: `Updated QA ${kind}`, exact: true })).toBeVisible();
    const r = await request.get(`${api}/${kind === 'categories' ? 'categories' : 'job-options'}`);
    const body = await r.json();
    if (kind !== 'categories') {
      const option = body.data[kind].find((o) => o.code === code);
      expect(option.requiresCity).toBe(kind === 'workMode' ? 1 : null);
    }
    expect(
      kind === 'categories'
        ? body.data.some((o) => o.name === `Updated QA ${kind}`)
        : body.data[kind].some((o) => o.name === `Updated QA ${kind}`)
    ).toBe(true);
    await page.getByRole('button', { name: `Delete Updated QA ${kind}`, exact: true }).click();
    await page.getByRole('button', { name: 'Confirm delete', exact: true }).click();
    await expect(page.getByRole('cell', { name: `Updated QA ${kind}`, exact: true })).toHaveCount(
      0
    );
  });
}
test('custom dropdowns create a real job and used options can be deactivated without breaking editing', async ({
  page,
  request
}) => {
  const auth = await request.post(`${api}/auth/login`, {
    headers: { Origin: origin },
    data: { identifier: 'browser-admin@example.test', password: process.env.E2E_ADMIN_PASSWORD }
  });
  const headers = { Authorization: `Bearer ${(await auth.json()).data.accessToken}` };
  const definitions = [
    ['categories', 'catalog-test', 'Catalog testing'],
    ['experienceLevel', 'expert', 'Expert level'],
    ['workMode', 'flexible', 'Flexible location'],
    ['employmentType', 'seasonal', 'Seasonal work']
  ];
  const ids = {};
  for (const [kind, code, name] of definitions) {
    const r = await request.post(`${api}/admin/catalog/${kind}`, {
      headers,
      data: { name, code, isActive: true, requiresCity: false }
    });
    expect(r.status()).toBe(201);
    ids[kind] = (await r.json()).data.id;
  }
  await login(page);
  await page.getByRole('link', { name: 'Manage jobs', exact: true }).click();
  await page.getByRole('link', { name: 'Create a job', exact: true }).click();
  await page.getByLabel('Job title', { exact: true }).fill('Managed options browser job');
  await page.getByLabel('Company name').fill('Catalog QA');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Catalog testing' });
  await page.getByLabel('Employment type').selectOption({ label: 'Seasonal work' });
  await page.getByLabel('Work mode').selectOption({ label: 'Flexible location' });
  await page.getByLabel('Experience level').selectOption({ label: 'Expert level' });
  await expect(page.getByLabel('City', { exact: true })).not.toHaveAttribute('required', '');
  await page.getByLabel('Job description (plain text)').fill('A job using admin-managed options.');
  await page.getByLabel('Skills (comma separated)').fill('Testing');
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByRole('button', { name: 'Save opportunity' }).click();
  await expect(page).toHaveURL(/\/admin\/jobs$/);
  const listed = await (
    await request.get(`${api}/jobs?q=Managed%20options%20browser%20job`)
  ).json();
  expect(listed.data[0].experienceLevelName).toBe('Expert level');
  const job = listed.data[0];
  expect(
    (
      await request.delete(`${api}/admin/catalog/experienceLevel/${ids.experienceLevel}`, {
        headers
      })
    ).status()
  ).toBe(409);
  await page.getByRole('link', { name: 'Job options', exact: true }).click();
  await page.getByLabel('Option group').selectOption('experienceLevel');
  await page.getByRole('button', { name: 'Edit Expert level', exact: true }).click();
  await page.getByLabel('Active for new jobs').uncheck();
  await page.getByRole('button', { name: 'Save option', exact: true }).click();
  await expect(
    page
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: 'Expert level', exact: true }) })
  ).toContainText('Inactive');
  await page.goto(`/admin/jobs/${job.id}/edit`);
  await expect(page.getByLabel('Experience level')).toHaveValue('expert');
  await page.getByLabel('Job title', { exact: true }).fill('Edited managed options job');
  await page.getByRole('button', { name: 'Save opportunity' }).click();
  await expect(page).toHaveURL(/\/admin\/jobs$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await page.goto('/jobs?experienceLevel=expert');
  await expect(
    page.getByRole('heading', { name: 'Edited managed options job', exact: true })
  ).toBeVisible();
  await expect(page.getByLabel('Experience')).toHaveValue('expert');
  await page
    .getByRole('heading', { name: 'Edited managed options job', exact: true })
    .getByRole('link')
    .click();
  await expect(page.getByRole('definition').filter({ hasText: 'Expert level' })).toBeVisible();
  expect((await request.delete(`${api}/admin/jobs/${job.id}`, { headers })).status()).toBe(204);
});
