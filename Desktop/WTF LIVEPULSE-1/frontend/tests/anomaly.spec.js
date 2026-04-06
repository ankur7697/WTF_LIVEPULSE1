import { expect, test } from '@playwright/test';

test('warning anomalies can be dismissed from the table', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Anomalies' }).click();

  await expect(page.getByRole('heading', { name: 'Anomaly log' })).toBeVisible();
  await expect(page.locator('.table').getByRole('button', { name: 'Dismiss' }).first()).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.table').getByRole('button', { name: 'Dismiss' }).first().click();
  await expect(page.locator('.table')).toContainText('Dismissed');
});
