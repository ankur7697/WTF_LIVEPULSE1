import { expect, test } from '@playwright/test';

test('dashboard loads and displays the gym roster', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner').getByText('WTF LivePulse')).toBeVisible();
  await expect(page.locator('.gym-tab')).toHaveCount(10);
  await expect(page.getByRole('banner').getByText('Total checked in')).toBeVisible();
  await expect(page.getByRole('banner').getByText("Today's revenue")).toBeVisible();
  await expect(page.getByRole('banner').getByText('Active anomalies')).toBeVisible();
});

test('switching gyms updates the occupancy panel', async ({ page }) => {
  await page.goto('/');

  const occupancyValue = page.locator('.kpi-card').filter({ hasText: 'Current occupancy' }).locator('.kpi-card__value');
  const selectedGymTitle = page.locator('.screen-grid.dashboard .panel-card').first().locator('.panel-card__title');
  await expect(occupancyValue).toBeVisible();

  const before = await occupancyValue.textContent();
  await page.getByRole('button', { name: 'WTF Powai Hub' }).click();

  await expect(selectedGymTitle).toHaveText('WTF Powai Hub');
  await expect(occupancyValue).not.toHaveText(before || '');
});

test('live events update the feed and anomaly badge', async ({ page }) => {
  await page.goto('/');

  const feedEntry = page.locator('.feed-item').filter({ hasText: 'Playwright Member' }).first();
  const anomalyValue = page.locator('.summary-card').filter({ hasText: 'Active anomalies' }).locator('.summary-card__value');
  const before = await anomalyValue.textContent();

  await page.evaluate(() => {
    const live = window.__WTF_LIVEPULSE__;
    const state = live.getState();
    const gym = state.gyms[0];
    live.emit({
      type: 'CHECKIN_EVENT',
      gym_id: gym.id,
      gym_name: gym.name,
      member_name: 'Playwright Member',
      timestamp: new Date().toISOString(),
      current_occupancy: gym.current_occupancy + 1,
      capacity_pct: gym.occupancy_pct + 1,
    });
    live.emit({
      type: 'ANOMALY_DETECTED',
      anomaly_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      gym_id: gym.id,
      gym_name: gym.name,
      anomaly_type: 'capacity_breach',
      severity: 'critical',
      message: 'Capacity breach detected',
      timestamp: new Date().toISOString(),
    });
  });

  await expect(feedEntry).toBeVisible();
  await expect(page.getByText('Capacity breach detected', { exact: true })).toBeVisible();
  await expect(anomalyValue).not.toHaveText(before || '');
});
