const {
  addDays,
  differenceInDays,
  formatTime,
  startOfDay,
  toDate,
} = require('../utils/time');

const PLAN_TYPES = ['monthly', 'quarterly', 'annual'];

function calculateCapacityPct(occupancy, capacity) {
  if (!capacity) {
    return 0;
  }

  return Math.round((occupancy / capacity) * 100);
}

function getOccupancyTone(occupancyPct) {
  if (occupancyPct > 85) {
    return 'critical';
  }

  if (occupancyPct >= 60) {
    return 'warning';
  }

  return 'ok';
}

function getDateRangeStart(dateRange, now = new Date()) {
  const safeRange = dateRange || '30d';

  if (safeRange === '7d') {
    return addDays(startOfDay(now), -6);
  }

  if (safeRange === '90d') {
    return addDays(startOfDay(now), -89);
  }

  return addDays(startOfDay(now), -29);
}

function buildHeatmapFromCheckins(checkins, gymId, now = new Date()) {
  const start = addDays(startOfDay(now), -6);
  const grid = new Map();

  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const key = `${day}:${hour}`;
      grid.set(key, 0);
    }
  }

  checkins
    .filter((row) => row.gym_id === gymId && toDate(row.checked_in) >= start)
    .forEach((row) => {
      const checkedIn = toDate(row.checked_in);
      const dayOfWeek = checkedIn.getDay();
      const hourOfDay = checkedIn.getHours();
      const key = `${dayOfWeek}:${hourOfDay}`;
      grid.set(key, (grid.get(key) || 0) + 1);
    });

  return Array.from(grid.entries())
    .map(([key, count]) => {
      const [day_of_week, hour_of_day] = key.split(':').map(Number);
      return {
        day_of_week,
        hour_of_day,
        checkin_count: count,
      };
    })
    .sort((left, right) => {
      if (left.day_of_week !== right.day_of_week) {
        return left.day_of_week - right.day_of_week;
      }

      return left.hour_of_day - right.hour_of_day;
    });
}

function buildRevenueByPlan(payments, gymId, dateRangeStart) {
  const totals = Object.fromEntries(PLAN_TYPES.map((planType) => [planType, 0]));

  payments
    .filter((row) => row.gym_id === gymId && toDate(row.paid_at) >= dateRangeStart)
    .forEach((row) => {
      totals[row.plan_type] += Number(row.amount);
    });

  return PLAN_TYPES.map((planType) => ({
    plan_type: planType,
    total_revenue: Number(totals[planType].toFixed(2)),
  }));
}

function buildChurnRiskMembers(members, now = new Date()) {
  return members
    .filter((member) => member.status === 'active' && member.last_checkin_at)
    .map((member) => {
      const daysSinceCheckin = differenceInDays(now, member.last_checkin_at);
      const risk = daysSinceCheckin >= 60 ? 'Critical' : daysSinceCheckin >= 45 ? 'High' : null;

      return {
        ...member,
        days_since_checkin: daysSinceCheckin,
        risk_level: risk,
      };
    })
    .filter((member) => member.risk_level)
    .sort((left, right) => right.days_since_checkin - left.days_since_checkin);
}

function buildNewRenewalRatio(payments, gymId, dateRangeStart) {
  const filtered = payments.filter(
    (row) => row.gym_id === gymId && toDate(row.paid_at) >= dateRangeStart,
  );
  const counts = filtered.reduce(
    (accumulator, row) => {
      accumulator[row.payment_type] += 1;
      return accumulator;
    },
    { new: 0, renewal: 0 },
  );

  const total = counts.new + counts.renewal;

  return {
    total,
    new_joiner_pct: total ? Math.round((counts.new / total) * 100) : 0,
    renewal_pct: total ? Math.round((counts.renewal / total) * 100) : 0,
    new_count: counts.new,
    renewal_count: counts.renewal,
  };
}

function buildCrossGymRevenue(payments, gyms, dateRangeStart) {
  const totals = new Map();

  gyms.forEach((gym) => totals.set(gym.id, 0));

  payments
    .filter((row) => toDate(row.paid_at) >= dateRangeStart)
    .forEach((row) => {
      totals.set(row.gym_id, (totals.get(row.gym_id) || 0) + Number(row.amount));
    });

  return gyms
    .map((gym) => ({
      gym_id: gym.id,
      gym_name: gym.name,
      total_revenue: Number((totals.get(gym.id) || 0).toFixed(2)),
    }))
    .sort((left, right) => right.total_revenue - left.total_revenue)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function buildRecentEvents({ checkins, payments, membersById, gymsById, gymId = null, limit = 20 }) {
  const events = [];

  checkins.forEach((row) => {
    const member = membersById.get(row.member_id);
    const gym = gymsById.get(row.gym_id);

    if (gymId && row.gym_id !== gymId) {
      return;
    }

    events.push({
      type: 'CHECKIN_EVENT',
      member_name: member ? member.name : 'Unknown member',
      gym: gym ? gym.name : 'Unknown gym',
      timestamp: formatTime(row.checked_in),
    });

    if (row.checked_out) {
      events.push({
        type: 'CHECKOUT_EVENT',
        member_name: member ? member.name : 'Unknown member',
        gym: gym ? gym.name : 'Unknown gym',
        timestamp: formatTime(row.checked_out),
      });
    }
  });

  payments.forEach((row) => {
    if (gymId && row.gym_id !== gymId) {
      return;
    }

    const member = membersById.get(row.member_id);
    const gym = gymsById.get(row.gym_id);

    events.push({
      type: 'PAYMENT_EVENT',
      member_name: member ? member.name : 'Unknown member',
      gym: gym ? gym.name : 'Unknown gym',
      timestamp: formatTime(row.paid_at),
      amount: Number(row.amount),
      plan_type: row.plan_type,
    });
  });

  return events
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
    .slice(0, limit);
}

function buildLiveSummary({ gyms, checkins, payments, anomalies }) {
  const todayStart = startOfDay(new Date());
  const totalMembersCheckedIn = checkins.filter((row) => !row.checked_out).length;
  const totalRevenueToday = payments
    .filter((row) => toDate(row.paid_at) >= todayStart)
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const activeAnomalies = anomalies.filter((row) => !row.resolved).length;

  return {
    total_members_checked_in: totalMembersCheckedIn,
    total_today_revenue: Number(totalRevenueToday.toFixed(2)),
    active_anomalies: activeAnomalies,
  };
}

module.exports = {
  buildChurnRiskMembers,
  buildCrossGymRevenue,
  buildHeatmapFromCheckins,
  buildLiveSummary,
  buildNewRenewalRatio,
  buildRecentEvents,
  buildRevenueByPlan,
  calculateCapacityPct,
  getDateRangeStart,
  getOccupancyTone,
};

