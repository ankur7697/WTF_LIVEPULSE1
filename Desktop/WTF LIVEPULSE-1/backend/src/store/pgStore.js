const { getPool } = require('../db/pool');
const { seedDatabase } = require('../db/seeds/seed');
const {
  buildChurnRiskMembers,
  buildLiveSummary,
  calculateCapacityPct,
  getDateRangeStart,
  getOccupancyTone,
} = require('../services/statsService');
const { canDismissAnomaly } = require('../services/anomalyService');

function toNumber(value) {
  return Number(value || 0);
}

function mapGym(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address,
    capacity: row.capacity,
    status: row.status,
    opens_at: row.opens_at,
    closes_at: row.closes_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapAnomaly(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    gym_id: row.gym_id,
    gym_name: row.gym_name,
    type: row.type,
    severity: row.severity,
    message: row.message,
    resolved: row.resolved,
    dismissed: row.dismissed,
    detected_at: row.detected_at,
    resolved_at: row.resolved_at,
  };
}

function createPgStore({ pool = getPool() } = {}) {
  async function ensureSeeded() {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM gyms');

    if (rows[0].count > 0) {
      return false;
    }

    const client = await pool.connect();
    try {
      await seedDatabase(client);
      return true;
    } finally {
      client.release();
    }
  }

  async function listGymsWithStats() {
    const { rows } = await pool.query(`
      SELECT
        g.id,
        g.name,
        g.city,
        g.address,
        g.capacity,
        g.status,
        COALESCE(occ.current_occupancy, 0)::int AS current_occupancy,
        COALESCE(rev.today_revenue, 0)::numeric(10, 2) AS today_revenue
      FROM gyms g
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS current_occupancy
        FROM checkins c
        WHERE c.gym_id = g.id AND c.checked_out IS NULL
      ) occ ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(amount), 0)::numeric(10, 2) AS today_revenue
        FROM payments p
        WHERE p.gym_id = g.id AND p.paid_at >= CURRENT_DATE
      ) rev ON TRUE
      ORDER BY occ.current_occupancy DESC, g.name ASC
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      address: row.address,
      capacity: row.capacity,
      status: row.status,
      current_occupancy: row.current_occupancy,
      today_revenue: toNumber(row.today_revenue),
      occupancy_pct: calculateCapacityPct(row.current_occupancy, row.capacity),
      occupancy_tone: getOccupancyTone(calculateCapacityPct(row.current_occupancy, row.capacity)),
    }));
  }

  async function getGymById(gymId) {
    const { rows } = await pool.query('SELECT * FROM gyms WHERE id = $1 LIMIT 1', [gymId]);
    return mapGym(rows[0]);
  }

  async function getCurrentOccupancy(gymId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS current_occupancy FROM checkins WHERE gym_id = $1 AND checked_out IS NULL',
      [gymId],
    );
    return rows[0]?.current_occupancy || 0;
  }

  async function getTodayRevenue(gymId) {
    const { rows } = await pool.query(
      'SELECT COALESCE(SUM(amount), 0)::numeric(10, 2) AS today_revenue FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE',
      [gymId],
    );
    return toNumber(rows[0]?.today_revenue);
  }

  async function getLastWeekRevenue(gymId) {
    const { rows } = await pool.query(
      `
        SELECT COALESCE(SUM(amount), 0)::numeric(10, 2) AS last_week_revenue
        FROM payments
        WHERE gym_id = $1
          AND paid_at >= date_trunc('day', NOW() - INTERVAL '7 days')
          AND paid_at < date_trunc('day', NOW() - INTERVAL '6 days')
      `,
      [gymId],
    );
    return toNumber(rows[0]?.last_week_revenue);
  }

  async function getLastCheckinAt(gymId) {
    const { rows } = await pool.query(
      'SELECT MAX(checked_in) AS last_checkin_at FROM checkins WHERE gym_id = $1',
      [gymId],
    );
    return rows[0]?.last_checkin_at || null;
  }

  async function getRecentEvents(gymId = null, limit = 20) {
    const { rows } = await pool.query(
      `
        SELECT *
        FROM (
          SELECT
            'CHECKIN_EVENT' AS type,
            m.name AS member_name,
            g.name AS gym,
            c.checked_in AS event_time,
            NULL::numeric AS amount,
            NULL::text AS plan_type
          FROM checkins c
          JOIN members m ON m.id = c.member_id
          JOIN gyms g ON g.id = c.gym_id
          WHERE ($1::uuid IS NULL OR c.gym_id = $1)

          UNION ALL

          SELECT
            'CHECKOUT_EVENT' AS type,
            m.name AS member_name,
            g.name AS gym,
            c.checked_out AS event_time,
            NULL::numeric AS amount,
            NULL::text AS plan_type
          FROM checkins c
          JOIN members m ON m.id = c.member_id
          JOIN gyms g ON g.id = c.gym_id
          WHERE c.checked_out IS NOT NULL AND ($1::uuid IS NULL OR c.gym_id = $1)

          UNION ALL

          SELECT
            'PAYMENT_EVENT' AS type,
            m.name AS member_name,
            g.name AS gym,
            p.paid_at AS event_time,
            p.amount AS amount,
            p.plan_type AS plan_type
          FROM payments p
          JOIN members m ON m.id = p.member_id
          JOIN gyms g ON g.id = p.gym_id
          WHERE ($1::uuid IS NULL OR p.gym_id = $1)
        ) events
        WHERE event_time IS NOT NULL
        ORDER BY event_time DESC
        LIMIT $2
      `,
      [gymId, limit],
    );

    return rows.map((row) => ({
      type: row.type,
      member_name: row.member_name,
      gym: row.gym,
      timestamp: row.timestamp,
      amount: row.amount === null ? null : toNumber(row.amount),
      plan_type: row.plan_type || null,
    }));
  }

  async function getActiveAnomalies(filters = {}) {
    const { rows } = await pool.query(
      `
        SELECT a.*, g.name AS gym_name
        FROM anomalies a
        JOIN gyms g ON g.id = a.gym_id
        WHERE ($1::uuid IS NULL OR a.gym_id = $1)
          AND ($2::text IS NULL OR a.severity = $2)
          AND (a.resolved = FALSE OR a.resolved_at >= NOW() - INTERVAL '24 hours')
        ORDER BY a.detected_at DESC
      `,
      [filters.gym_id || null, filters.severity || null],
    );

    return rows.map(mapAnomaly);
  }

  async function getUnreadAnomalyCount() {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM anomalies WHERE resolved = FALSE AND dismissed = FALSE',
    );
    return rows[0]?.count || 0;
  }

  async function insertAnomaly(anomaly) {
    const { rows } = await pool.query(
      `
        INSERT INTO anomalies (gym_id, type, severity, message, resolved, dismissed, detected_at, resolved_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), $8)
        RETURNING *
      `,
      [
        anomaly.gym_id,
        anomaly.type,
        anomaly.severity,
        anomaly.message,
        Boolean(anomaly.resolved),
        Boolean(anomaly.dismissed),
        anomaly.detected_at || null,
        anomaly.resolved_at || null,
      ],
    );
    return rows[0];
  }

  async function resolveAnomaly(id) {
    const { rows } = await pool.query(
      `
        UPDATE anomalies
        SET resolved = TRUE, resolved_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id],
    );

    return rows[0] || null;
  }

  async function dismissAnomaly(id) {
    const existing = await pool.query('SELECT * FROM anomalies WHERE id = $1 LIMIT 1', [id]);
    const anomaly = existing.rows[0];

    if (!anomaly) {
      const error = new Error('Anomaly not found');
      error.status = 404;
      throw error;
    }

    if (!canDismissAnomaly(anomaly)) {
      const error = new Error('Critical anomalies cannot be dismissed');
      error.status = 403;
      throw error;
    }

    const { rows } = await pool.query(
      `
        UPDATE anomalies
        SET dismissed = TRUE, resolved = TRUE, resolved_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id],
    );

    return rows[0];
  }

  async function getMembersForGym(gymId) {
    const { rows } = await pool.query(
      `
        SELECT id, gym_id, name, email, phone, plan_type, member_type, status, joined_at, plan_expires_at, last_checkin_at
        FROM members
        WHERE gym_id = $1
        ORDER BY name
      `,
      [gymId],
    );

    return rows;
  }

  async function getOpenCheckinsForGym(gymId) {
    const { rows } = await pool.query(
      `
        SELECT c.*, m.name AS member_name, g.name AS gym_name
        FROM checkins c
        JOIN members m ON m.id = c.member_id
        JOIN gyms g ON g.id = c.gym_id
        WHERE c.gym_id = $1 AND c.checked_out IS NULL
        ORDER BY c.checked_in DESC
      `,
      [gymId],
    );

    return rows;
  }

  async function recordCheckin({ gym_id, member_id, checked_in, member_name = null, gym_name = null }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insertResult = await client.query(
        `
          INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
          VALUES ($1, $2, COALESCE($3, NOW()), NULL)
          RETURNING *
        `,
        [member_id, gym_id, checked_in || null],
      );

      await client.query(
        'UPDATE members SET last_checkin_at = COALESCE($1, NOW()) WHERE id = $2',
        [checked_in || null, member_id],
      );

      await client.query('COMMIT');
      return {
        ...insertResult.rows[0],
        member_name,
        gym_name,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function recordCheckout({ gym_id, member_id = null, checked_out = new Date().toISOString() }) {
    const { rows } = await pool.query(
      `
        WITH updated AS (
          UPDATE checkins
          SET checked_out = COALESCE($1, NOW())
          WHERE id = (
            SELECT id
            FROM checkins
            WHERE gym_id = $2
              AND checked_out IS NULL
              AND ($3::uuid IS NULL OR member_id = $3)
            ORDER BY checked_in DESC
            LIMIT 1
          )
          RETURNING *
        )
        SELECT
          updated.*,
          m.name AS member_name,
          g.name AS gym_name
        FROM updated
        JOIN members m ON m.id = updated.member_id
        JOIN gyms g ON g.id = updated.gym_id
      `,
      [checked_out || null, gym_id, member_id || null],
    );

    return rows[0] || null;
  }

  async function recordPayment({
    gym_id,
    member_id,
    amount,
    plan_type,
    payment_type = 'new',
    paid_at = new Date().toISOString(),
    notes = null,
    member_name = null,
    gym_name = null,
  }) {
    const { rows } = await pool.query(
      `
        INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7)
        RETURNING *
      `,
      [member_id, gym_id, amount, plan_type, payment_type, paid_at || null, notes],
    );

    return {
      ...rows[0],
      member_name,
      gym_name,
    };
  }

  async function resetLiveState() {
    const { rowCount } = await pool.query(
      `
        UPDATE checkins
        SET checked_out = NOW()
        WHERE checked_out IS NULL
      `,
    );
    return { closed: rowCount || 0 };
  }

  async function refreshMaterializedViews() {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY gym_hourly_stats');
    return { ok: true };
  }

  async function getGymAnalytics(gymId, dateRange = '30d') {
    const gym = await getGymById(gymId);
    const dateRangeStart = getDateRangeStart(dateRange);

    const [heatmapResult, revenueResult, churnResult, ratioResult] = await Promise.all([
      pool.query(
        `
          SELECT day_of_week, hour_of_day, checkin_count
          FROM gym_hourly_stats
          WHERE gym_id = $1
          ORDER BY day_of_week, hour_of_day
        `,
        [gymId],
      ),
      pool.query(
        `
          SELECT plan_type, COALESCE(SUM(amount), 0)::numeric(10, 2) AS total_revenue
          FROM payments
          WHERE gym_id = $1 AND paid_at >= $2
          GROUP BY plan_type
        `,
        [gymId, dateRangeStart.toISOString()],
      ),
      pool.query(
        `
          SELECT id, name, email, phone, plan_type, member_type, status, joined_at, plan_expires_at, last_checkin_at
          FROM members
          WHERE gym_id = $1
            AND status = 'active'
            AND last_checkin_at <= NOW() - INTERVAL '45 days'
          ORDER BY last_checkin_at ASC
        `,
        [gymId],
      ),
      pool.query(
        `
          SELECT payment_type, COUNT(*)::int AS count
          FROM payments
          WHERE gym_id = $1 AND paid_at >= $2
          GROUP BY payment_type
        `,
        [gymId, dateRangeStart.toISOString()],
      ),
    ]);

    const revenueByPlan = ['monthly', 'quarterly', 'annual'].map((planType) => ({
      plan_type: planType,
      total_revenue: Number(
        Number(revenueResult.rows.find((row) => row.plan_type === planType)?.total_revenue || 0).toFixed(2),
      ),
    }));

    const ratioCounts = ratioResult.rows.reduce((accumulator, row) => {
      accumulator[row.payment_type] = row.count;
      return accumulator;
    }, { new: 0, renewal: 0 });

    const total = ratioCounts.new + ratioCounts.renewal;

    return {
      gym,
      date_range: dateRange,
      heatmap: heatmapResult.rows,
      revenue_by_plan: revenueByPlan,
      churn_risk: buildChurnRiskMembers(churnResult.rows),
      new_renewal_ratio: {
        total,
        new_joiner_pct: total ? Math.round((ratioCounts.new / total) * 100) : 0,
        renewal_pct: total ? Math.round((ratioCounts.renewal / total) * 100) : 0,
        new_count: ratioCounts.new,
        renewal_count: ratioCounts.renewal,
      },
    };
  }

  async function getCrossGymRevenue(dateRange = '30d') {
    const dateRangeStart = getDateRangeStart(dateRange);
    const { rows } = await pool.query(
      `
        SELECT
          g.id AS gym_id,
          g.name AS gym_name,
          COALESCE(SUM(p.amount), 0)::numeric(10, 2) AS total_revenue
        FROM gyms g
        LEFT JOIN payments p ON p.gym_id = g.id AND p.paid_at >= $1
        GROUP BY g.id, g.name
        ORDER BY total_revenue DESC
      `,
      [dateRangeStart.toISOString()],
    );

    return rows.map((row, index) => ({
      gym_id: row.gym_id,
      gym_name: row.gym_name,
      total_revenue: toNumber(row.total_revenue),
      rank: index + 1,
    }));
  }

  async function buildLiveSummaryQuery() {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM checkins WHERE checked_out IS NULL) AS total_members_checked_in,
        (SELECT COALESCE(SUM(amount), 0)::numeric(10, 2) FROM payments WHERE paid_at >= CURRENT_DATE) AS total_today_revenue,
        (SELECT COUNT(*)::int FROM anomalies WHERE resolved = FALSE AND dismissed = FALSE) AS active_anomalies
    `);

    return {
      total_members_checked_in: rows[0]?.total_members_checked_in || 0,
      total_today_revenue: toNumber(rows[0]?.total_today_revenue),
      active_anomalies: rows[0]?.active_anomalies || 0,
    };
  }

  async function getGymLiveSnapshot(gymId) {
    const gym = await getGymById(gymId);

    if (!gym) {
      const error = new Error('Gym not found');
      error.status = 404;
      throw error;
    }

    const [currentOccupancy, todayRevenue, lastWeekRevenue, lastCheckinAt, recentEvents, activeAnomalies] =
      await Promise.all([
        getCurrentOccupancy(gymId),
        getTodayRevenue(gymId),
        getLastWeekRevenue(gymId),
        getLastCheckinAt(gymId),
        getRecentEvents(gymId, 20),
        getActiveAnomalies({ gym_id: gymId }),
      ]);

    const occupancyPct = calculateCapacityPct(currentOccupancy, gym.capacity);

    return {
      gym,
      current_occupancy: currentOccupancy,
      capacity_pct: occupancyPct,
      occupancy_tone: getOccupancyTone(occupancyPct),
      today_revenue: Number(todayRevenue.toFixed(2)),
      last_week_revenue: Number(lastWeekRevenue.toFixed(2)),
      last_checkin_at: lastCheckinAt,
      recent_events: recentEvents,
      active_anomalies: activeAnomalies,
      summary: await buildLiveSummaryQuery(),
    };
  }

  return {
    type: 'postgres',
    ensureSeeded,
    listGymsWithStats,
    listGyms: listGymsWithStats,
    getGymById,
    getGymLiveSnapshot,
    getGymAnalytics,
    getCrossGymRevenue,
    listAnomalies: getActiveAnomalies,
    getUnreadAnomalyCount,
    insertAnomaly,
    resolveAnomaly,
    dismissAnomaly,
    getMembersForGym,
    getOpenCheckinsForGym,
    recordCheckin,
    recordCheckout,
    recordPayment,
    resetLiveState,
    refreshMaterializedViews,
    getCurrentOccupancy,
    getTodayRevenue,
    getLastWeekRevenue,
    getLastCheckinAt,
    createEventRowsForGym: getRecentEvents,
    buildLiveSummary: buildLiveSummaryQuery,
  };
}

module.exports = {
  createPgStore,
};
