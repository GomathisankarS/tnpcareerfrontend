import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
const { PDFDocument } = createRequire(import.meta.url)('../../backend/node_modules/pdf-lib');
test('candidate discovers a job, saves a profile, applies, and restores login on reload', async ({
  page
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /find work/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured opportunities.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Find your kind of work.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email or mobile number').fill('browser-candidate@example.test');
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_CANDIDATE_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await page.getByRole('link', { name: 'My profile', exact: true }).click();
  await page.getByLabel('Current city').fill('Kochi');
  await page.getByLabel('Total experience (months)').fill('12');
  await page.getByLabel('Skills (comma separated)').fill('React, MySQL');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(
    page.getByText('Choose a PDF resume up to 5 MiB to save your profile.')
  ).toBeVisible();
  const pdf = await PDFDocument.create();
  pdf.addPage();
  await page.getByLabel('Choose PDF resume').setInputFiles({
    name: 'browser-resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save())
  });
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('browser-resume.pdf', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('browser-resume.pdf', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download resume' }).click();
  expect((await download).suggestedFilename()).toBe('browser-resume.pdf');
  await page.getByRole('link', { name: 'Find a job', exact: true }).click();
  await page.getByLabel('Search jobs', { exact: true }).fill('Frontend');
  await expect(page).toHaveURL(/q=Frontend/);
  await page
    .getByRole('heading', { name: 'Frontend Developer', exact: true })
    .getByRole('link')
    .click();
  await page.getByLabel('Cover note (optional)').fill('I would like to join this team.');
  await page.getByRole('button', { name: 'Apply for this role' }).click();
  await expect(page.getByText('Application submitted.', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Already applied', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Already applied', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Apply for this role', exact: true })).toHaveCount(
    0
  );
  await page.getByRole('link', { name: 'My applications', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Frontend Developer' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Frontend Developer' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.screenshot({ path: 'test-results/candidate-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
test('admin creates, edits, filters and soft-deletes a job', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email or mobile number').fill('browser-admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Total jobs', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true });
  await page.getByRole('link', { name: 'Create a job' }).click();
  await page.getByLabel('Job title', { exact: true }).fill('Browser QA Engineer');
  await page.getByLabel('Company name').fill('Browser Test Company');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Engineering' });
  await page.getByLabel('City', { exact: true }).fill('Kochi');
  await page.getByLabel('Job description (plain text)').fill('Help us build reliable software.');
  await page.getByLabel('Skills (comma separated)').fill('Testing, JavaScript');
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByRole('button', { name: 'Save opportunity' }).click();
  await expect(page).toHaveURL(/\/admin\/jobs$/);
  await page.getByLabel('Search jobs', { exact: true }).fill('Browser QA Engineer');
  await expect(page).toHaveURL(/q=Browser/);
  await page.getByRole('link', { name: 'Edit Browser QA Engineer' }).click();
  await page.getByLabel('Job title', { exact: true }).fill('Browser QA Engineer Updated');
  await page.getByRole('button', { name: 'Save opportunity' }).click();
  await page.getByLabel('Search jobs', { exact: true }).fill('Browser QA Engineer Updated');
  await page.getByRole('button', { name: 'Delete Browser QA Engineer Updated' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete job', exact: true }).click();
  await expect(page.getByText('Nothing here yet')).toBeVisible();
});
test('mobile home and listings fit the viewport and show form validation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /find work/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured opportunities.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Find a job', exact: true }).click();
  await page.getByLabel('Work mode').selectOption('remote');
  await expect(page).toHaveURL(/workMode=remote/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/register');
  await page.getByLabel('Full name').fill('New Candidate');
  await page.getByLabel('Password', { exact: true }).fill('example-test-passphrase');
  await page.getByLabel('Confirm password').fill('example-test-passphrase');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Email is required')).toBeVisible();
  await expect(page.getByText('Mobile number is required')).toBeVisible();
});

test('candidate registers with both contacts and signs in using mobile', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Mobile Applicant');
  await page.getByLabel('Email', { exact: true }).fill('new-candidate@example.test');
  await page.getByLabel('Mobile with country code').fill('+919876543210');
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_CANDIDATE_PASSWORD);
  await page.getByLabel('Confirm password').fill(process.env.E2E_CANDIDATE_PASSWORD);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email or mobile number').fill('+919876543210');
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_CANDIDATE_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByRole('link', { name: 'My applications', exact: true })).toBeVisible();
});
