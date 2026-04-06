const GYMS = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'WTF Bandra Command Center', city: 'Mumbai', capacity: 92, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'WTF Indiranagar Pulse', city: 'Bengaluru', capacity: 128, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'WTF Powai Hub', city: 'Mumbai', capacity: 176, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000004', name: 'WTF Koramangala Forge', city: 'Bengaluru', capacity: 194, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000005', name: 'WTF Andheri Core', city: 'Mumbai', capacity: 208, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000006', name: 'WTF Gurugram Lift House', city: 'Gurugram', capacity: 220, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000007', name: 'WTF South Delhi Peak', city: 'Delhi', capacity: 242, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000008', name: 'WTF Whitefield Vault', city: 'Bengaluru', capacity: 256, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000009', name: 'WTF Pune Circuit', city: 'Pune', capacity: 280, status: 'active', opens_at: '06:00', closes_at: '22:00' },
  { id: '00000000-0000-4000-8000-000000000010', name: 'WTF Noida Grid', city: 'Noida', capacity: 300, status: 'active', opens_at: '06:00', closes_at: '22:00' },
];

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Ishaan', 'Arjun', 'Rohan', 'Karan', 'Kabir', 'Anaya', 'Diya', 'Meera', 'Kiara', 'Naina', 'Ira', 'Sara', 'Tara'];
const LAST_NAMES = ['Sharma', 'Patel', 'Gupta', 'Singh', 'Verma', 'Reddy', 'Nair', 'Kapoor', 'Mehta', 'Jain', 'Bose', 'Iyer', 'Malhotra', 'Das', 'Chopra', 'Saxena'];
const PLAN_AMOUNTS = { monthly: 1499, quarterly: 3999, annual: 11999 };

function makeUuid(index) {
  const suffix = String(index + 1).padStart(12, '0');
  return `00000000-0000-4000-8000-${suffix}`;
}

function formatTimestamp(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60000).toISOString();
}

function buildMembersForGym(gym, gymIndex) {
  return Array.from({ length: 30 }, (_, index) => {
    const memberIndex = gymIndex * 100 + index;
    const first = FIRST_NAMES[(memberIndex + index) % FIRST_NAMES.length];
    const last = LAST_NAMES[(memberIndex + gymIndex) % LAST_NAMES.length];
    return {
      id: makeUuid(memberIndex),
      gym_id: gym.id,
      name: `${first} ${last}`,
      plan_type: ['monthly', 'quarterly', 'annual'][memberIndex % 3],
      payment_type: memberIndex % 4 === 0 ? 'renewal' : 'new',
      last_checkin_at: formatTimestamp(24 * 60 + index * 20),
    };
  });
}

function buildHeatmapSeed(base = 4) {
  return Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day_of_week: day,
      hour_of_day: hour,
      checkin_count: hour >= 6 && hour <= 9 ? base + 12 : hour >= 17 && hour <= 20 ? base + 9 : base,
    })),
  ).flat();
}

function createMockDataset() {
  const membersByGym = {};
  const liveByGymId = {};
  const analyticsByGymId = {};

  GYMS.forEach((gym, index) => {
    const members = buildMembersForGym(gym, index);
    membersByGym[gym.id] = members;
  });

  GYMS.forEach((gym, index) => {
    const occupancy = 18 + index * 6;
    const todayRevenue = 12000 + index * 2400;
    const capacityPct = Math.round((occupancy / gym.capacity) * 100);
    const recentEvents = Array.from({ length: 12 }, (_, eventIndex) => {
      const member = membersByGym[gym.id][eventIndex % membersByGym[gym.id].length];
      const type = eventIndex % 3 === 0 ? 'CHECKIN_EVENT' : eventIndex % 3 === 1 ? 'CHECKOUT_EVENT' : 'PAYMENT_EVENT';
      return {
        type,
        member_name: member.name,
        gym: gym.name,
        timestamp: formatTimestamp(eventIndex * 11 + index * 4),
        amount: type === 'PAYMENT_EVENT' ? PLAN_AMOUNTS[member.plan_type] : null,
        plan_type: type === 'PAYMENT_EVENT' ? member.plan_type : null,
      };
    });

    liveByGymId[gym.id] = {
      gym,
      current_occupancy: occupancy,
      capacity_pct: capacityPct,
      occupancy_tone: capacityPct > 85 ? 'critical' : capacityPct >= 60 ? 'warning' : 'ok',
      today_revenue: todayRevenue,
      last_week_revenue: todayRevenue + 4200,
      last_checkin_at: formatTimestamp(12),
      recent_events: recentEvents,
      active_anomalies: index === 0 ? [
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          gym_id: gym.id,
          gym_name: gym.name,
          type: 'capacity_breach',
          severity: 'critical',
          message: `${gym.name} is above 90% capacity.`,
          resolved: false,
          dismissed: false,
          detected_at: formatTimestamp(8),
          resolved_at: null,
        },
      ] : [],
      summary: {
        total_members_checked_in: 184,
        total_today_revenue: 126540,
        active_anomalies: 2,
      },
    };

    const heatmap = buildHeatmapSeed(3 + (index % 4));
    const revenueByPlan = [
      { plan_type: 'monthly', total_revenue: 4000 + index * 340 },
      { plan_type: 'quarterly', total_revenue: 5000 + index * 420 },
      { plan_type: 'annual', total_revenue: 7000 + index * 530 },
    ];

    analyticsByGymId[gym.id] = {
      gym,
      date_range: '30d',
      heatmap,
      revenue_by_plan: revenueByPlan,
      churn_risk: membersByGym[gym.id].slice(0, 6).map((member, churnIndex) => ({
        id: member.id,
        name: member.name,
        email: `${member.name.split(' ').join('.').toLowerCase()}@wtf.live`,
        phone: '+91 9000000000',
        plan_type: member.plan_type,
        member_type: member.payment_type,
        status: 'active',
        joined_at: formatTimestamp(90 * 24 * 60),
        plan_expires_at: formatTimestamp(-12 * 60),
        last_checkin_at: formatTimestamp((45 + churnIndex * 4) * 24 * 60),
        days_since_checkin: 45 + churnIndex * 4,
        risk_level: churnIndex >= 3 ? 'Critical' : 'High',
      })),
      new_renewal_ratio: {
        total: 80 + index * 3,
        new_joiner_pct: 66,
        renewal_pct: 34,
        new_count: 53 + index,
        renewal_count: 27 + index,
      },
    };
  });

  const crossGymRevenue = GYMS.map((gym, index) => ({
    gym_id: gym.id,
    gym_name: gym.name,
    total_revenue: 260000 - index * 18000,
    rank: index + 1,
  }));

  const anomalies = [
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      gym_id: GYMS[0].id,
      gym_name: GYMS[0].name,
      type: 'capacity_breach',
      severity: 'critical',
      message: `${GYMS[0].name} is above 90% capacity.`,
      resolved: false,
      dismissed: false,
      detected_at: formatTimestamp(8),
      resolved_at: null,
    },
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      gym_id: GYMS[2].id,
      gym_name: GYMS[2].name,
      type: 'zero_checkins',
      severity: 'warning',
      message: `${GYMS[2].name} has not recorded a check-in in the last 2 hours.`,
      resolved: false,
      dismissed: false,
      detected_at: formatTimestamp(18),
      resolved_at: null,
    },
  ];

  const feed = GYMS.flatMap((gym, index) => liveByGymId[gym.id].recent_events.slice(0, 2 + (index % 3))).slice(0, 20);

  const summary = {
    total_members_checked_in: 184,
    total_today_revenue: 126540,
    active_anomalies: anomalies.filter((anomaly) => !anomaly.resolved).length,
  };

  return {
    gyms: GYMS,
    membersByGym,
    liveByGymId,
    analyticsByGymId,
    crossGymRevenue,
    anomalies,
    feed,
    summary,
    simulator: {
      status: 'paused',
      speed: 1,
    },
  };
}

export {
  GYMS,
  createMockDataset,
  makeUuid,
};
