const crypto = require('crypto');
const {
  addDays,
  addHours,
  addMinutes,
  startOfDay,
  toDate,
} = require('../../utils/time');
const { createRng, pick, pickWeighted, randomInt } = require('../../utils/random');
const { getTrafficWeightForHour } = require('../../services/simulatorService');

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Ishaan', 'Arjun', 'Rohan', 'Karan', 'Kabir',
  'Anaya', 'Diya', 'Meera', 'Kiara', 'Naina', 'Ira', 'Sara', 'Tara',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Gupta', 'Singh', 'Verma', 'Reddy', 'Nair', 'Kapoor',
  'Mehta', 'Jain', 'Bose', 'Iyer', 'Malhotra', 'Das', 'Chopra', 'Saxena',
];

const GYM_NAMES = [
  'WTF Bandra Command Center',
  'WTF Indiranagar Pulse',
  'WTF Powai Hub',
  'WTF Koramangala Forge',
  'WTF Andheri Core',
  'WTF Gurugram Lift House',
  'WTF South Delhi Peak',
  'WTF Whitefield Vault',
  'WTF Pune Circuit',
  'WTF Noida Grid',
];

const PLAN_PRICING = {
  monthly: 1499,
  quarterly: 3999,
  annual: 11999,
};

const WEEKDAY_FACTORS = [0.82, 1, 1.02, 1.04, 1.1, 1.18, 0.9];

function makeUuid(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
  const versioned = `${hash.slice(0, 12)}4${hash.slice(13, 16)}a${hash.slice(17, 32)}`;
  return [
    versioned.slice(0, 8),
    versioned.slice(8, 12),
    versioned.slice(12, 16),
    versioned.slice(16, 20),
    versioned.slice(20, 32),
  ].join('-');
}

function formatDateTime(date) {
  return toDate(date).toISOString();
}

function allocateCounts(total, weights) {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map((weight) => (total * weight) / weightTotal);
  const counts = raw.map((value) => Math.floor(value));
  let remainder = total - counts.reduce((sum, value) => sum + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  for (let index = 0; index < order.length && remainder > 0; index += 1) {
    counts[order[index].index] += 1;
    remainder -= 1;
  }

  return counts;
}

function chooseHour(rng, maxHour = 23) {
  const hourWeights = Array.from({ length: maxHour + 1 }, (_, hour) => getTrafficWeightForHour(hour));
  return pickWeighted(
    Array.from({ length: maxHour + 1 }, (_, hour) => hour),
    hourWeights,
    rng,
  );
}

function createGymList() {
  return GYM_NAMES.map((name, index) => {
    const capacity = [92, 128, 176, 194, 208, 220, 242, 256, 280, 300][index];
    const city = [
      'Mumbai', 'Bengaluru', 'Pune', 'Mumbai', 'Delhi', 'Gurugram', 'Delhi', 'Bengaluru', 'Pune', 'Noida',
    ][index];

    return {
      id: makeUuid(`gym:${index}`),
      name,
      city,
      address: `${index + 1} Fitness Avenue, ${city}`,
      capacity,
      status: 'active',
      opens_at: '06:00',
      closes_at: '22:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

function createMemberPool({ gyms, memberCount, rng }) {
  const weights = gyms.map((gym) => gym.capacity);
  const membersByGym = new Map(gyms.map((gym) => [gym.id, []]));
  const members = [];

  const guaranteedMembers = Math.min(memberCount, gyms.length);

  for (let index = 0; index < guaranteedMembers; index += 1) {
    const gym = gyms[index];
    const planType = pickWeighted(['monthly', 'quarterly', 'annual'], [0.58, 0.27, 0.15], rng);
    const memberType = rng() > 0.72 ? 'renewal' : 'new';
    const joinedAt = addDays(startOfDay(new Date()), -randomInt(rng, 35, 420));
    const planDays = planType === 'annual' ? 365 : planType === 'quarterly' ? 90 : 30;
    const expiresAt = addDays(joinedAt, planDays);
    const member = {
      id: makeUuid(`member:${index}`),
      gym_id: gym.id,
      name: `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`,
      email: `member${index + 1}@wtf.live`,
      phone: `+91${randomInt(rng, 6000000000, 9999999999)}`,
      plan_type: planType,
      member_type: memberType,
      status: rng() > 0.92 ? 'frozen' : 'active',
      joined_at: formatDateTime(joinedAt),
      plan_expires_at: formatDateTime(expiresAt),
      last_checkin_at: null,
      created_at: formatDateTime(joinedAt),
    };

    members.push(member);
    membersByGym.get(gym.id).push(member);
  }

  for (let index = guaranteedMembers; index < memberCount; index += 1) {
    const gym = pickWeighted(gyms, weights, rng);
    const planType = pickWeighted(['monthly', 'quarterly', 'annual'], [0.58, 0.27, 0.15], rng);
    const memberType = rng() > 0.72 ? 'renewal' : 'new';
    const joinedAt = addDays(startOfDay(new Date()), -randomInt(rng, 35, 420));
    const planDays = planType === 'annual' ? 365 : planType === 'quarterly' ? 90 : 30;
    const expiresAt = addDays(joinedAt, planDays);
    const member = {
      id: makeUuid(`member:${index}`),
      gym_id: gym.id,
      name: `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`,
      email: `member${index + 1}@wtf.live`,
      phone: `+91${randomInt(rng, 6000000000, 9999999999)}`,
      plan_type: planType,
      member_type: memberType,
      status: rng() > 0.92 ? 'frozen' : 'active',
      joined_at: formatDateTime(joinedAt),
      plan_expires_at: formatDateTime(expiresAt),
      last_checkin_at: null,
      created_at: formatDateTime(joinedAt),
    };

    members.push(member);
    membersByGym.get(gym.id).push(member);
  }

  return { members, membersByGym };
}

function buildHistoricalActivity({ gyms, membersByGym, days, baseCheckins, basePayments, rng, now }) {
  const checkins = [];
  const payments = [];
  const memberLastCheckin = new Map();

  const today = startOfDay(now);
  const startDate = addDays(today, -(days - 1));

  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const day = addDays(startDate, dayIndex);
    const dayOfWeek = day.getDay();
    const dayFactor = WEEKDAY_FACTORS[dayOfWeek];
    const totalCheckins = Math.max(120, Math.round(baseCheckins * dayFactor));
    const totalPayments = Math.max(20, Math.round(basePayments * dayFactor));
    const perGymCheckins = allocateCounts(totalCheckins, gyms.map((gym) => gym.capacity));
    const perGymPayments = allocateCounts(totalPayments, gyms.map((gym) => gym.capacity));

    gyms.forEach((gym, gymIndex) => {
      const gymMembers = membersByGym.get(gym.id);
      const checkinCount = perGymCheckins[gymIndex];
      const paymentCount = perGymPayments[gymIndex];
      const isToday = dayIndex === days - 1;
      const isRevenueDropGym = gymIndex === 2;
      const isQuietGym = gymIndex === 1;
      const isPeakGym = gymIndex === 0;

      const checkinWindowEnd = isToday ? now : addHours(addDays(startOfDay(day), 1), -1);
      const checkinWindowStart = isToday ? addHours(now, -8) : startOfDay(day);

      const currentCheckinCount = isToday && isPeakGym
        ? Math.round(gym.capacity * 0.95)
        : isToday && isQuietGym
          ? Math.max(3, Math.round(checkinCount * 0.3))
          : checkinCount;

      const currentPaymentCount = isToday && isRevenueDropGym
        ? Math.max(2, Math.round(paymentCount * 0.35))
        : paymentCount;

      const currentPaymentMultiplier = isToday && isRevenueDropGym ? 0.35 : 1;

      for (let index = 0; index < currentCheckinCount; index += 1) {
        const member = pick(gymMembers, rng);
        let timestamp;

        if (isToday && isPeakGym) {
          timestamp = addMinutes(now, -randomInt(rng, 0, 20));
        } else if (isToday && isQuietGym) {
          timestamp = addMinutes(now, -randomInt(rng, 180, 360));
        } else {
          const hour = chooseHour(rng, 21);
          const minute = randomInt(rng, 0, 59);
          timestamp = new Date(day);
          timestamp.setHours(hour, minute, randomInt(rng, 0, 59), 0);

          if (timestamp < checkinWindowStart) {
            timestamp = new Date(checkinWindowStart);
          }

          if (timestamp > checkinWindowEnd) {
            timestamp = new Date(checkinWindowEnd);
          }
        }

        const open = isToday && isPeakGym && index < currentCheckinCount;
        const checkoutTime = open
          ? null
          : formatDateTime(addMinutes(timestamp, randomInt(rng, 25, 95)));

        const checkinRow = {
          member_id: member.id,
          gym_id: gym.id,
          checked_in: formatDateTime(timestamp),
          checked_out: checkoutTime,
        };

        checkins.push(checkinRow);
        memberLastCheckin.set(member.id, checkinRow.checked_in);
      }

      const paymentPlanTypes = ['monthly', 'quarterly', 'annual'];

      for (let index = 0; index < currentPaymentCount; index += 1) {
        const member = pick(gymMembers, rng);
        const planType = pickWeighted(paymentPlanTypes, [0.6, 0.25, 0.15], rng);
        const baseAmount = PLAN_PRICING[planType];
        const amount = Number((baseAmount * currentPaymentMultiplier + randomInt(rng, -80, 180)).toFixed(2));
        const paymentTimestamp = isToday
          ? addMinutes(now, -randomInt(rng, 0, 360))
          : addMinutes(addHours(day, randomInt(rng, 6, 21)), randomInt(rng, 0, 59));

        payments.push({
          id: makeUuid(`payment:${dayIndex}:${gymIndex}:${index}`),
          member_id: member.id,
          gym_id: gym.id,
          amount: Math.max(199, amount),
          plan_type: planType,
          payment_type: member.member_type,
          paid_at: formatDateTime(paymentTimestamp),
          notes: `${planType} membership ${member.member_type}`,
        });
      }
    });

    if (dayIndex === days - 8) {
      const gym = gyms[2];
      const gymMembers = membersByGym.get(gym.id);
      const extraPayments = Math.round(basePayments * 0.8);

      for (let index = 0; index < extraPayments; index += 1) {
        const member = pick(gymMembers, rng);
        const planType = pickWeighted(['monthly', 'quarterly', 'annual'], [0.5, 0.3, 0.2], rng);
        const baseAmount = PLAN_PRICING[planType];
        payments.push({
          id: makeUuid(`boost:${dayIndex}:${index}`),
          member_id: member.id,
          gym_id: gym.id,
          amount: Number((baseAmount + randomInt(rng, 80, 320)).toFixed(2)),
          plan_type: planType,
          payment_type: 'renewal',
          paid_at: formatDateTime(addMinutes(addHours(day, randomInt(rng, 7, 20)), randomInt(rng, 0, 59))),
          notes: 'same-day-last-week boost',
        });
      }
    }
  }

  membersByGym.forEach((gymMembers) => {
    gymMembers.forEach((member) => {
      if (memberLastCheckin.has(member.id)) {
        member.last_checkin_at = memberLastCheckin.get(member.id);
      } else {
        member.last_checkin_at = formatDateTime(addDays(now, -randomInt(rng, 2, 75)));
      }
    });
  });

  return { checkins, payments };
}

function generateSeedData(options = {}) {
  const now = options.now ? toDate(options.now) : new Date();
  const rng = createRng(options.seed || 42);
  const gyms = createGymList().slice(0, options.gymCount || 10);
  const memberCount = options.memberCount || 5000;
  const days = options.days || 90;
  const baseCheckins = options.baseCheckins || 3000;
  const basePayments = options.basePayments || 120;
  const { members, membersByGym } = createMemberPool({ gyms, memberCount, rng });
  const { checkins, payments } = buildHistoricalActivity({
    gyms,
    membersByGym,
    days,
    baseCheckins,
    basePayments,
    rng,
    now,
  });

  return {
    generated_at: now.toISOString(),
    gyms,
    members,
    checkins,
    payments,
  };
}

module.exports = {
  generateSeedData,
};
