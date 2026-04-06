const { bulkInsertRows } = require('./bulkInsert');
const { generateSeedData } = require('./generateSeedData');

async function seedDatabase(client, options = {}) {
  const seed = generateSeedData(options);

  await client.query('BEGIN');

  try {
    await client.query('SET LOCAL synchronous_commit = OFF');

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

    await bulkInsertRows(client, 'checkins', [
      'member_id',
      'gym_id',
      'checked_in',
      'checked_out',
    ], seed.checkins, 750);

    await bulkInsertRows(client, 'payments', [
      'id',
      'member_id',
      'gym_id',
      'amount',
      'plan_type',
      'payment_type',
      'paid_at',
      'notes',
    ], seed.payments, 750);

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

