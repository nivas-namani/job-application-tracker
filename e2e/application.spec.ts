import { expect, test } from '@playwright/test';

test('a new user can create a job application', async ({ page }) => {
  const uniqueEmail = `candidate-${Date.now()}@example.test`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Name').fill('Taylor Candidate');
  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Your search' })).toBeVisible();
  await page.getByRole('button', { name: /Add application/i }).click();
  await page.getByLabel('Company').fill('BrightPath Labs');
  await page.getByLabel('Role').fill('Full Stack Developer');
  await page.getByRole('button', { name: 'Save application' }).click();

  await expect(page.getByRole('heading', { name: 'BrightPath Labs' })).toBeVisible();
  await expect(page.getByText('Full Stack Developer')).toBeVisible();
});
