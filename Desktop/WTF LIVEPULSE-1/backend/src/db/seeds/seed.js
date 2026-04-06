const { bulkInsertRows } = require('./bulkInsert');
const { generateSeedData } = require('./generateSeedData');

async function seedDatabase(client, options = {}) {
  const seed = generateSeedData({
    ...options,
    specSeed: true,
  });

  await client.query('BEGIN');

  try {
    await client.query('SET LOCAL synchronous_commit = OFF');

    // eslint-disable-next-line no-console
    console.log('Seeding gyms...');
    await bulkInsertRows(client, 'gyms', [
      'id',
      'name',
      'city',
      'address',
      'capacity',
      'status',
      'opens_at',
      'closes_at',
      'created_at',
      'updated_at',
    ], seed.gyms);
    // eslint-disable-next-line no-console
    console.log('Seeding gyms... done');

    // eslint-disable-next-line no-console
    console.log(`Seeding ${seed.members.length} members...`);
    await bulkInsertRows(client, 'members', [
      'id',
      'gym_id',
      'name',
      'email',
      'phone',
      'plan_type',
      'member_type',
      'status',
      'joined_at',
      'plan_expires_at',
      'last_checkin_at',
      'created_at',
    ], seed.members);
    // eslint-disable-next-line no-console
    console.log(`Seeding ${seed.members.length} members... done`);

    // eslint-disable-next-line no-console
    console.log('Seeding 90 days of check-ins...');
    await bulkInsertRows(client, 'checkins', [
      'member_id',
      'gym_id',
      'checked_in',
      'checked_out',
    ], seed.checkins, 1000);

    await client.query(`
      UPDATE members m
      SET last_checkin_at = activity.last_checkin_at
      FROM (
        SELECT member_id, MAX(checked_in) AS last_checkin_at
        FROM checkins
        GROUP BY member_id
      ) activity
      WHERE m.id = activity.member_id
    `);
    // eslint-disable-next-line no-console
    console.log('Seeding 90 days of check-ins... done');

    // eslint-disable-next-line no-console
    console.log('Seeding payment history...');
    await bulkInsertRows(client, 'payments', [
      'id',
      'member_id',
      'gym_id',
      'amount',
      'plan_type',
      'payment_type',
      'paid_at',
      'notes',
    ], seed.payments, 1000);
    // eslint-disable-next-line no-console
    console.log('Seeding payment history... done');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY gym_hourly_stats');
  await client.query('ANALYZE gyms, members, checkins, payments, anomalies, gym_hourly_stats');

  return seed;
}

module.exports = {
  seedDatabase,
};
