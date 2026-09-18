import { expect, test } from '@playwright/test';

test('a saved hiring process shows on an application that reaches screening', async ({ page }) => {
  const uniqueEmail = `recruiter-${Date.now()}@example.test`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Name').fill('Sam Candidate');
  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your search' })).toBeVisible();

  await page.getByRole('button', { name: /Add application/i }).click();
  await page.getByLabel('Company').fill('Northwind Systems');
  await page.getByLabel('Role').fill('Backend Developer');
  await page.getByLabel('Status').selectOption('SCREENING');
  await page.getByRole('button', { name: 'Save application' }).click();

  const drawer = page.getByLabel('Northwind Systems details');
  await expect(drawer.getByText('No process saved for Northwind Systems yet.')).toBeVisible();

  await drawer.getByRole('button', { name: /Save Northwind Systems/ }).click();
  await page.getByRole('button', { name: 'Startup fast track' }).click();
  await page.getByRole('button', { name: 'Save process' }).click();

  await expect(drawer.getByRole('heading', { name: 'How Northwind Systems recruits' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /Take-home task/ })).toBeVisible();

  // Marking the current round labels the board card with that stage.
  await drawer.getByRole('button', { name: /Technical deep dive/ }).click();
  await expect(drawer.getByText('You are here — click again to clear')).toBeVisible();
  await drawer.getByRole('button', { name: 'Close details' }).click();
  await expect(page.getByText('Technical deep dive').first()).toBeVisible();
});
