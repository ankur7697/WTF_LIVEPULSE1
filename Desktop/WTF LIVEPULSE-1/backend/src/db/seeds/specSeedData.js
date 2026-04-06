const crypto = require('crypto');
const {
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  toDate,
} = require('../../utils/time');
const { createRng, pickWeighted, randomInt, shuffle } = require('../../utils/random');

const PLAN_PRICING = {
  monthly: 1499,
  quarterly: 3999,
  annual: 11999,
};

const PLAN_DURATIONS = {
  monthly: 30,
  quarterly: 90,
  annual: 365,
};

const WEEKDAY_WEIGHTS = [1.0, 0.95, 0.9, 0.95, 0.85, 0.7, 0.45];

const HOUR_BLOCKS = [
  { start: 330, end: 419, weight: 0.6 },
  { start: 420, end: 599, weight: 1.0 },
  { start: 600, end: 719, weight: 0.4 },
  { start: 720, end: 839, weight: 0.3 },
  { start: 840, end: 1019, weight: 0.2 },
  { start: 1020, end: 1259, weight: 0.9 },
  { start: 1260, end: 1350, weight: 0.35 },
];

const FIRST_NAMES = [
  'Aarav', 'Aaryan', 'Aditya', 'Ajay', 'Akash', 'Aman', 'Amit', 'Anand',
  'Anaya', 'Anika', 'Anjali', 'Ankit', 'Arjun', 'Arnav', 'Asha', 'Avani',
  'Bhavesh', 'Bharat', 'Chetan', 'Deepak', 'Dev', 'Diya', 'Gautam', 'Harsh',
  'Isha', 'Ishaan', 'Ishita', 'Kabir', 'Karan', 'Kavya', 'Kiara', 'Laksh',
  'Manish', 'Meera', 'Mira', 'Neha', 'Nikhil', 'Nisha', 'Om', 'Parth',
  'Pooja', 'Priya', 'Rahul', 'Rajat', 'Rakesh', 'Rhea', 'Riya', 'Rohan',
  'Rohit', 'Sakshi', 'Sameer', 'Sara', 'Shreya', 'Siddharth', 'Soham', 'Sonia',
  'Tarun', 'Tara', 'Ujjwal', 'Varun', 'Vikram', 'Vivaan', 'Yash', 'Zoya',
];

const LAST_NAMES = [
  'Ahuja', 'Bansal', 'Basu', 'Bhat', 'Bose', 'Chatterjee', 'Chaudhary', 'Chopra',
  'Das', 'Desai', 'Dhawan', 'Ganguly', 'Ghosh', 'Gupta', 'Jain', 'Kapoor',
  'Kaul', 'Khanna', 'Kohli', 'Malhotra', 'Mehta', 'Menon', 'Nair', 'Narayan',
  'Pillai', 'Prasad', 'Rao', 'Reddy', 'Saxena', 'Shah', 'Sharma', 'Shetty',
  'Singh', 'Sinha', 'Varma', 'Vasudevan', 'Verma', 'Wadhwa', 'Yadav', 'Zaveri',
];

const GYM_SPECS = [
  {
    name: 'WTF Gyms — Lajpat Nagar',
    city: 'New Delhi',
    capacity: 220,
    opens_at: '05:30',
    closes_at: '22:30',
    member_count: 650,
    active_pct: 88,
    plan_counts: { monthly: 325, quarterly: 195, annual: 130 },
    churn_high: 20,
    churn_critical: 10,
    open_checkins: 20,
    revenue_target: 325000,
  },
  {
    name: 'WTF Gyms — Connaught Place',
    city: 'New Delhi',
    capacity: 180,
    opens_at: '06:00',
    closes_at: '22:00',
    member_count: 550,
    active_pct: 85,
    plan_counts: { monthly: 220, quarterly: 220, annual: 110 },
    churn_high: 15,
    churn_critical: 10,
    open_checkins: 18,
    revenue_target: 270000,
  },
  {
    name: 'WTF Gyms — Bandra West',
    city: 'Mumbai',
    capacity: 300,
    opens_at: '05:00',
    closes_at: '23:00',
    member_count: 750,
    active_pct: 90,
    plan_counts: { monthly: 300, quarterly: 300, annual: 150 },
    churn_high: 40,
    churn_critical: 20,
    open_checkins: 285,
    revenue_target: 450000,
  },
  {
    name: 'WTF Gyms — Powai',
    city: 'Mumbai',
    capacity: 250,
    opens_at: '05:30',
    closes_at: '22:30',
    member_count: 600,
    active_pct: 87,
    plan_counts: { monthly: 240, quarterly: 240, annual: 120 },
    churn_high: 25,
    churn_critical: 10,
    open_checkins: 30,
    revenue_target: 390000,
  },
  {
    name: 'WTF Gyms — Indiranagar',
    city: 'Bengaluru',
    capacity: 200,
    opens_at: '05:30',
    closes_at: '22:00',
    member_count: 550,
    active_pct: 89,
    plan_counts: { monthly: 220, quarterly: 220, annual: 110 },
    churn_high: 15,
    churn_critical: 10,
    open_checkins: 20,
    revenue_target: 300000,
  },
  {
    name: 'WTF Gyms — Koramangala',
    city: 'Bengaluru',
    capacity: 180,
    opens_at: '06:00',
    closes_at: '22:00',
    member_count: 500,
    active_pct: 86,
    plan_counts: { monthly: 200, quarterly: 200, annual: 100 },
    churn_high: 10,
    churn_critical: 5,
    open_checkins: 18,
    revenue_target: 240000,
  },
  {
    name: 'WTF Gyms — Banjara Hills',
    city: 'Hyderabad',
    capacity: 160,
    opens_at: '06:00',
    closes_at: '22:00',
    member_count: 450,
    active_pct: 84,
    plan_counts: { monthly: 225, quarterly: 135, annual: 90 },
    churn_high: 10,
    churn_critical: 5,
    open_checkins: 18,
    revenue_target: 200000,
  },
  {
    name: 'WTF Gyms — Sector 18 Noida',
    city: 'Noida',
    capacity: 140,
    opens_at: '06:00',
    closes_at: '21:30',
    member_count: 400,
    active_pct: 82,
    plan_counts: { monthly: 240, quarterly: 100, annual: 60 },
    churn_high: 5,
    churn_critical: 5,
    open_checkins: 12,
    revenue_target: 160000,
  },
  {
    name: 'WTF Gyms — Salt Lake',
    city: 'Kolkata',
    capacity: 120,
    opens_at: '06:00',
    closes_at: '21:00',
    member_count: 300,
    active_pct: 80,
    plan_counts: { monthly: 180, quarterly: 90, annual: 30 },
    churn_high: 5,
    churn_critical: 3,
    open_checkins: 10,
    revenue_target: 120000,
    revenue_drop_today: 2998,
    revenue_drop_last_week: 15992,
  },
  {
    name: 'WTF Gyms — Velachery',
    city: 'Chennai',
    capacity: 110,
    opens_at: '06:00',
    closes_at: '21:00',
    member_count: 250,
    active_pct: 78,
    plan_counts: { monthly: 150, quarterly: 75, annual: 25 },
    churn_high: 5,
    churn_critical: 2,
    open_checkins: 0,
    revenue_target: 100000,
  },
];

function iso(value) {
  return toDate(value).toISOString();
}

function makeUuid() {
  return crypto.randomUUID();
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function buildPlanPool(planCounts, rng) {
  const pool = [];

  Object.entries(planCounts).forEach(([planType, count]) => {
    for (let index = 0; index < count; index += 1) {
      pool.push(planType);
    }
  });

  return shuffle(pool, rng);
}

function buildOperatingIntervals(gym) {
  const openMinutes = timeToMinutes(gym.opens_at);
  const closeMinutes = timeToMinutes(gym.closes_at);
  const windows = [];

  HOUR_BLOCKS.forEach((block) => {
    const start = Math.max(block.start, openMinutes, 330);
    const end = Math.min(block.end, closeMinutes);

    if (end >= start) {
      windows.push({
        start,
        end,
        weight: block.weight * (end - start + 1),
      });
    }
  });

  return windows;
}

function sampleBusinessTimestamp(daysAgo, now, rng, { minHour = 8, maxHour = 20 } = {}) {
  const base = startOfDay(addDays(now, -daysAgo));
  const date = new Date(base);
  date.setHours(randomInt(rng, minHour, maxHour), randomInt(rng, 0, 59), randomInt(rng, 0, 59), 0);
  return date;
}

function sampleRecentOffset(rng, { saltLake = false, today = false } = {}) {
  if (today) {
    return 0;
  }

  return randomInt(rng, 20, 29);
}

function chooseRecentPaymentSlots({ gymSpec, candidateSlots, rng }) {
  const recentSlots = [];
  const sortedByAmountDesc = [...candidateSlots].sort((left, right) => right.amount - left.amount);
  const sortedByAmountAsc = [...candidateSlots].sort((left, right) => left.amount - right.amount);
  const target = gymSpec.revenue_target;

  if (gymSpec.name.includes('Salt Lake')) {
    const todayCount = 2;
    const lastWeekCount = 8;
    const todaySlots = sortedByAmountAsc
      .filter((slot) => slot.is_renewal_second && slot.amount <= PLAN_PRICING.monthly)
      .slice(0, todayCount);
    const lastWeekSlots = sortedByAmountDesc.slice(0, lastWeekCount);
    const reserved = new Set([...todaySlots, ...lastWeekSlots].map((slot) => slot.slot_id));

    todaySlots.forEach((slot) => recentSlots.push({ ...slot, dayOffset: 0 }));
    lastWeekSlots.forEach((slot) => recentSlots.push({ ...slot, dayOffset: 7 }));

    let revenue = recentSlots.reduce((sum, slot) => sum + slot.amount, 0);

    for (const slot of sortedByAmountDesc) {
      if (revenue >= target || reserved.has(slot.slot_id)) {
        continue;
      }

      recentSlots.push({
        ...slot,
        dayOffset: sampleRecentOffset(rng),
      });
      revenue += slot.amount;
    }

    return recentSlots;
  }

  let revenue = 0;
  for (const slot of sortedByAmountDesc) {
    recentSlots.push({
      ...slot,
      dayOffset: sampleRecentOffset(rng),
    });
    revenue += slot.amount;

    if (revenue >= target) {
      break;
    }
  }

  return recentSlots;
}

function buildMemberEmail(firstName, lastName, globalIndex) {
  const localPart = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '');
  return `${localPart}+${globalIndex}@gmail.com`;
}

function buildMemberPhone(globalIndex) {
  const prefixes = ['9', '8', '7'];
  const prefix = prefixes[globalIndex % prefixes.length];
  const suffix = String(100000000 + globalIndex).slice(-9);
  return `${prefix}${suffix}`;
}

function pickName(globalIndex) {
  const first = FIRST_NAMES[globalIndex % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(globalIndex / FIRST_NAMES.length) % LAST_NAMES.length];
  return { first, last, full: `${first} ${last}` };
}

function buildGymMemberSlots(gymSpec, rng) {
  const activeCount = Math.round((gymSpec.member_count * gymSpec.active_pct) / 100);
  const inactiveCount = Math.round((gymSpec.member_count - activeCount) * (2 / 3));
  const frozenCount = gymSpec.member_count - activeCount - inactiveCount;
  const newCount = Math.round(gymSpec.member_count * 0.8);
  const renewalCount = gymSpec.member_count - newCount;
  const activeNewCount = Math.min(activeCount, newCount);
  const activeRenewalCount = activeCount - activeNewCount;
  const inactiveNewCount = newCount - activeNewCount;
  const inactiveRenewalCount = renewalCount - activeRenewalCount;

  const statusSlots = [
    ...Array.from({ length: activeCount }, () => 'active'),
    ...Array.from({ length: inactiveCount }, () => 'inactive'),
    ...Array.from({ length: frozenCount }, () => 'frozen'),
  ];

  const memberTypeSlots = [
    ...Array.from({ length: newCount }, () => 'new'),
    ...Array.from({ length: renewalCount }, () => 'renewal'),
  ];

  const planPool = buildPlanPool(gymSpec.plan_counts, rng);
  const slots = [];

  for (let index = 0; index < gymSpec.member_count; index += 1) {
    const status = statusSlots[index];
    const memberType = memberTypeSlots[index];
    const planType = planPool[index];
    slots.push({
      status,
      member_type: memberType,
      plan_type: planType,
      amount: PLAN_PRICING[planType],
    });
  }

  const activeNewSlots = [];
  const activeRenewalSlots = [];
  const inactiveNewSlots = [];
  const inactiveRenewalSlots = [];

  slots.forEach((slot) => {
    if (slot.status === 'active' && slot.member_type === 'new') {
      activeNewSlots.push(slot);
      return;
    }

    if (slot.status === 'active' && slot.member_type === 'renewal') {
      activeRenewalSlots.push(slot);
      return;
    }

    if (slot.member_type === 'new') {
      inactiveNewSlots.push(slot);
      return;
    }

    inactiveRenewalSlots.push(slot);
  });

  const churnCritical = Math.min(gymSpec.churn_critical, activeNewSlots.length);
  const churnHigh = Math.min(gymSpec.churn_high, Math.max(0, activeNewSlots.length - churnCritical));

  const groups = {
    activeNewHealthy: activeNewSlots.slice(churnCritical + churnHigh),
    activeNewHigh: activeNewSlots.slice(churnCritical, churnCritical + churnHigh),
    activeNewCritical: activeNewSlots.slice(0, churnCritical),
    activeRenewal: activeRenewalSlots,
    inactiveNew: inactiveNewSlots,
    inactiveRenewal: inactiveRenewalSlots,
  };

  return {
    activeCount,
    inactiveCount,
    frozenCount,
    newCount,
    renewalCount,
    activeNewCount,
    activeRenewalCount,
    inactiveNewCount,
    inactiveRenewalCount,
    groups,
  };
}

function buildDateRangeCandidates(startDate, endDate) {
  const candidates = [];
  let cursor = startOfDay(startDate);
  const final = startOfDay(endDate);

  while (cursor <= final) {
    candidates.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return candidates;
}

function sampleCheckinTimestamp({ gym, startDate, endDate, rng, operatingWindows }) {
  const candidates = buildDateRangeCandidates(startDate, endDate);

  if (!candidates.length) {
    const fallback = new Date(startOfDay(startDate));
    const firstWindow = operatingWindows[0];
    if (firstWindow) {
      fallback.setHours(Math.floor(firstWindow.start / 60), firstWindow.start % 60, 0, 0);
    } else {
      fallback.setHours(6, 0, 0, 0);
    }
    return fallback;
  }

  const day = pickWeighted(candidates, candidates.map((candidate) => WEEKDAY_WEIGHTS[candidate.getDay()]), rng);
  const interval = pickWeighted(operatingWindows, operatingWindows.map((window) => window.weight), rng);
  const minuteOfDay = randomInt(rng, interval.start, interval.end);
  const timestamp = new Date(day);

  timestamp.setHours(0, 0, 0, 0);
  timestamp.setMinutes(minuteOfDay, randomInt(rng, 0, 59), 0);

  return timestamp;
}

function buildHistoricalCheckins({ gymSpec, gymId, members, now, rng }) {
  const operatingWindows = buildOperatingIntervals(gymSpec);
  const checkins = [];

  members.forEach((member) => {
    const visitCount =
      member.cohort === 'activeNewHealthy' || member.cohort === 'activeRenewal'
        ? 63
        : member.cohort === 'activeNewHigh'
          ? 8
          : member.cohort === 'activeNewCritical'
            ? 6
            : 17;

    const firstCheckin = new Date(member.last_checkin_at);

    const joinedAt = new Date(member.joined_at);
    const historyEnd = member.open_session
      ? addDays(startOfDay(now), -1)
      : addDays(startOfDay(firstCheckin), -1);
    const historyStart = addDays(startOfDay(joinedAt), 1);

    const rows = [{
      member_id: member.id,
      gym_id: gymId,
      checked_in: iso(firstCheckin),
      checked_out: member.open_session ? null : iso(addMinutes(firstCheckin, randomInt(rng, 45, 90))),
    }];

    for (let index = 1; index < visitCount; index += 1) {
      const lowerBound = historyStart <= historyEnd ? historyStart : joinedAt;
      const upperBound = historyStart <= historyEnd ? historyEnd : joinedAt;

      const timestamp = sampleCheckinTimestamp({
        gym: gymSpec,
        startDate: lowerBound,
        endDate: upperBound,
        rng,
        operatingWindows,
      });

      rows.push({
        member_id: member.id,
        gym_id: gymId,
        checked_in: iso(timestamp),
        checked_out: iso(addMinutes(timestamp, randomInt(rng, 45, 90))),
      });
    }

    checkins.push(...rows);
  });

  return checkins;
}

function buildSpecSeedData({ now = new Date(), seed = 42 } = {}) {
  const rng = createRng(seed);
  const gyms = [];
  const members = [];
  const checkins = [];
  const payments = [];
  const gymStateByName = new Map();
  const globalMemberIndex = { value: 0 };

  GYM_SPECS.forEach((gymSpec) => {
    const gymId = makeUuid();
    const createdAt = iso(now);
    const gym = {
      id: gymId,
      name: gymSpec.name,
      city: gymSpec.city,
      address: `${gymSpec.city} - ${gymSpec.name}`,
      capacity: gymSpec.capacity,
      status: 'active',
      opens_at: gymSpec.opens_at,
      closes_at: gymSpec.closes_at,
      created_at: createdAt,
      updated_at: createdAt,
    };

    gyms.push(gym);
    gymStateByName.set(gymSpec.name, {
      gymSpec,
      gym,
      slots: buildGymMemberSlots(gymSpec, rng),
      members: [],
      candidateSlots: [],
      selectedSlots: [],
      openSessions: [],
    });
  });

  GYM_SPECS.forEach((gymSpec) => {
    const state = gymStateByName.get(gymSpec.name);
    const groupOrder = [
      ['activeNewHealthy', state.slots.groups.activeNewHealthy],
      ['activeNewHigh', state.slots.groups.activeNewHigh],
      ['activeNewCritical', state.slots.groups.activeNewCritical],
      ['activeRenewal', state.slots.groups.activeRenewal],
      ['inactiveNew', state.slots.groups.inactiveNew],
      ['inactiveRenewal', state.slots.groups.inactiveRenewal],
    ];

    groupOrder.forEach(([cohortName, groupSlots]) => {
      groupSlots.forEach((slot) => {
        const name = pickName(globalMemberIndex.value);
        const id = makeUuid();
        const email = buildMemberEmail(name.first, name.last, globalMemberIndex.value);
        const phone = buildMemberPhone(globalMemberIndex.value);
        const planDays = PLAN_DURATIONS[slot.plan_type];
        const baseMember = {
          id,
          gym_id: state.gym.id,
          name: name.full,
          email,
          phone,
          plan_type: slot.plan_type,
          member_type: slot.member_type,
          status: slot.status,
          joined_at: null,
          plan_expires_at: null,
          last_checkin_at: null,
          created_at: iso(now),
          _slot: slot,
          cohort: cohortName,
          _plan_days: planDays,
        };

        members.push(baseMember);
        state.members.push(baseMember);
        globalMemberIndex.value += 1;
      });
    });
  });

  GYM_SPECS.forEach((gymSpec) => {
    const state = gymStateByName.get(gymSpec.name);
    const candidateSlots = [];

    state.members.forEach((member) => {
      if (member.cohort === 'activeNewHigh' || member.cohort === 'activeNewCritical' || member.cohort === 'inactiveNew') {
        return;
      }

      candidateSlots.push({
        slot_id: `${member.id}:current`,
        member_id: member.id,
        gym_id: member.gym_id,
        plan_type: member.plan_type,
        amount: PLAN_PRICING[member.plan_type],
        is_renewal_second: member.member_type === 'renewal',
      });
    });

    const selectedSlots = chooseRecentPaymentSlots({
      gymSpec,
      candidateSlots,
      rng,
    });

    const selectedByMemberId = new Map(selectedSlots.map((slot) => [slot.member_id, slot]));

    state.members.forEach((member) => {
      const selectedSlot = selectedByMemberId.get(member.id);
      const isRenewal = member.member_type === 'renewal';
      const paymentDaysAgo = selectedSlot
        ? selectedSlot.dayOffset
        : isRenewal
          ? randomInt(rng, member._plan_days === 30 ? 61 : member._plan_days === 90 ? 121 : 396, member._plan_days === 30 ? 120 : member._plan_days === 90 ? 240 : 540)
          : randomInt(rng, 31, 89);
      const paymentDate = sampleBusinessTimestamp(paymentDaysAgo, now, rng, { minHour: 8, maxHour: 19 });
      const joinedAt = isRenewal
        ? addDays(paymentDate, -member._plan_days)
        : paymentDate;

      member.joined_at = iso(joinedAt);
      member.plan_expires_at = iso(addDays(joinedAt, member._plan_days));
      member.created_at = iso(joinedAt);

      if (selectedSlot) {
        selectedSlot.paymentDate = paymentDate;
      }

      if (member.cohort === 'activeNewHealthy') {
        const lastCheckinAge = member.member_type === 'new' && selectedSlot
          ? randomInt(rng, 1, Math.max(1, Math.min(10, paymentDaysAgo - 1)))
          : randomInt(rng, 10, Math.max(10, Math.min(29, paymentDaysAgo - 10)));
        member.last_checkin_at = iso(addDays(now, -lastCheckinAge));
      } else if (member.cohort === 'activeRenewal') {
        const lastCheckinAge = randomInt(rng, 20, 29);
        member.last_checkin_at = iso(addDays(now, -lastCheckinAge));
      } else if (member.cohort === 'activeNewHigh') {
        const joinAge = randomInt(rng, 60, 89);
        const lastCheckinAge = randomInt(rng, 45, Math.min(58, joinAge - 2));
        member.joined_at = iso(addDays(now, -joinAge));
        member.plan_expires_at = iso(addDays(toDate(member.joined_at), member._plan_days));
        member.created_at = member.joined_at;
        member.last_checkin_at = iso(addDays(now, -lastCheckinAge));
      } else if (member.cohort === 'activeNewCritical') {
        const joinAge = randomInt(rng, 63, 89);
        const lastCheckinAge = randomInt(rng, 61, Math.min(87, joinAge - 2));
        member.joined_at = iso(addDays(now, -joinAge));
        member.plan_expires_at = iso(addDays(toDate(member.joined_at), member._plan_days));
        member.created_at = member.joined_at;
        member.last_checkin_at = iso(addDays(now, -lastCheckinAge));
      } else if (member.cohort === 'inactiveNew') {
        const joinAge = randomInt(rng, 91, 180);
        const lastCheckinAge = randomInt(rng, 61, Math.min(88, joinAge));
        member.joined_at = iso(addDays(now, -joinAge));
        member.plan_expires_at = iso(addDays(toDate(member.joined_at), member._plan_days));
        member.created_at = member.joined_at;
        member.last_checkin_at = iso(addDays(now, -lastCheckinAge));
      } else {
        const joinAgeByPlan = member.plan_type === 'monthly'
          ? randomInt(rng, 61, 120)
          : member.plan_type === 'quarterly'
            ? randomInt(rng, 121, 210)
            : randomInt(rng, 396, 540);
        const lastCheckinAge = member.status === 'active'
          ? randomInt(rng, 1, 44)
          : randomInt(rng, 61, 88);
        member.joined_at = iso(addDays(now, -joinAgeByPlan));
        member.plan_expires_at = iso(addDays(toDate(member.joined_at), member._plan_days));
        member.created_at = member.joined_at;
        member.last_checkin_at = iso(addDays(now, -Math.min(lastCheckinAge, joinAgeByPlan - 1)));
      }
    });

    const openCount = gymSpec.open_checkins;
    const openPool = state.members
      .filter((member) => member.status === 'active' && member.cohort === 'activeNewHealthy')
      .sort((left, right) => new Date(left.joined_at) - new Date(right.joined_at));

    for (let index = 0; index < openCount; index += 1) {
      const member = openPool[index];
      if (!member) {
        break;
      }

      member.open_session = true;
      member.last_checkin_at = iso(addMinutes(now, -randomInt(rng, 5, 90)));
    }

    const memberSlots = state.members.map((member) => ({
      ...member,
    }));

    const gymCheckins = buildHistoricalCheckins({
      gymSpec,
      gymId: state.gym.id,
      members: memberSlots,
      now,
      rng,
    });

    checkins.push(...gymCheckins);

    state.members.forEach((member) => {
      const selectedSlot = selectedByMemberId.get(member.id);
      const paymentDate = selectedSlot?.paymentDate || sampleBusinessTimestamp(
        selectedSlot ? selectedSlot.dayOffset : randomInt(rng, 31, 89),
        now,
        rng,
      );

      if (member.member_type === 'renewal') {
        payments.push({
          id: makeUuid(),
          member_id: member.id,
          gym_id: member.gym_id,
          amount: PLAN_PRICING[member.plan_type],
          plan_type: member.plan_type,
          payment_type: 'new',
          paid_at: member.joined_at,
          notes: 'seed original renewal payment',
        });
      }

      payments.push({
        id: makeUuid(),
        member_id: member.id,
        gym_id: member.gym_id,
        amount: PLAN_PRICING[member.plan_type],
        plan_type: member.plan_type,
        payment_type: member.member_type === 'renewal' ? 'renewal' : 'new',
        paid_at: iso(paymentDate),
        notes: member.member_type === 'renewal' ? 'seed renewal payment' : 'seed new payment',
      });
    });
  });

  members.forEach((member) => {
    delete member._slot;
    delete member._plan_days;
    delete member.open_session;
  });

  return {
    generated_at: iso(now),
    gyms,
    members,
    checkins,
    payments,
    anomalies: [],
  };
}

module.exports = {
  buildSpecSeedData,
};
