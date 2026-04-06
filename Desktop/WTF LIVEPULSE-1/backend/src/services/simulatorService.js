const { addMinutes, isWithinOperatingHours, startOfDay, toDate } = require('../utils/time');
const { pick, pickWeighted, randomInt } = require('../utils/random');

const HOUR_WEIGHTS = [
  0.06, 0.04, 0.03, 0.03, 0.04, 0.08, 0.24, 0.34, 0.42, 0.32, 0.22, 0.18,
  0.20, 0.22, 0.28, 0.36, 0.52, 0.78, 0.86, 0.64, 0.34, 0.16, 0.10, 0.07,
];

const EVENT_WEIGHTS_BY_HOUR = {
  overnight: { checkin: 1, checkout: 2, payment: 1 },
  daytime: { checkin: 4, checkout: 2, payment: 1 },
  peak: { checkin: 7, checkout: 3, payment: 2 },
};

function getTrafficWeightForHour(hour) {
  return HOUR_WEIGHTS[hour] || 0.05;
}

function getEventWeightsForHour(hour) {
  if (hour >= 6 && hour <= 9) {
    return EVENT_WEIGHTS_BY_HOUR.peak;
  }

  if (hour >= 17 && hour <= 20) {
    return EVENT_WEIGHTS_BY_HOUR.peak;
  }

  if (hour >= 10 && hour <= 16) {
    return EVENT_WEIGHTS_BY_HOUR.daytime;
  }

  return EVENT_WEIGHTS_BY_HOUR.overnight;
}

function calculateTickInterval(speed) {
  const safeSpeed = [1, 5, 10].includes(speed) ? speed : 1;
  return Math.max(200, Math.round(2000 / safeSpeed));
}

function chooseSimulationAction({ now = new Date(), rng = Math.random }) {
  const hour = now.getHours();
  const weights = getEventWeightsForHour(hour);
  const actions = ['CHECKIN_EVENT', 'CHECKOUT_EVENT', 'PAYMENT_EVENT'];
  const choices = [weights.checkin, weights.checkout, weights.payment];
  return pickWeighted(actions, choices, rng);
}

function getSimulationBatchSize(speed) {
  if (speed >= 10) {
    return 4;
  }

  if (speed >= 5) {
    return 3;
  }

  return 1;
}

function buildSimulationEvents({ gyms, members, openCheckins, now = new Date(), speed = 1, rng = Math.random }) {
  const eventCount = getSimulationBatchSize(speed);
  const events = [];

  for (let index = 0; index < eventCount; index += 1) {
    const action = chooseSimulationAction({ now, rng });
    const gym = pick(gyms, rng);
    const gymMembers = members.filter((member) => member.gym_id === gym.id && member.status === 'active');
    const member = pick(gymMembers.length ? gymMembers : members, rng);
    const eventTimestamp = addMinutes(now, -randomInt(rng, 0, 6));

    if (action === 'CHECKOUT_EVENT' && openCheckins.length) {
      const openCheckin = pick(openCheckins.filter((row) => row.gym_id === gym.id), rng) || pick(openCheckins, rng);

      if (openCheckin) {
        events.push({
          type: 'CHECKOUT_EVENT',
          gym_id: gym.id,
          gym_name: gym.name,
          member_id: openCheckin.member_id,
          member_name: member.name,
          timestamp: eventTimestamp.toISOString(),
        });
      }

      continue;
    }

    if (action === 'PAYMENT_EVENT') {
      const planType = member.plan_type || pick(['monthly', 'quarterly', 'annual'], rng);
      const baseAmount = planType === 'annual' ? 11999 : planType === 'quarterly' ? 3999 : 1499;
      const amount = baseAmount + randomInt(rng, -150, 250);

      events.push({
        type: 'PAYMENT_EVENT',
        gym_id: gym.id,
        gym_name: gym.name,
        member_id: member.id,
        member_name: member.name,
        plan_type: planType,
        amount,
        timestamp: eventTimestamp.toISOString(),
      });
      continue;
    }

    const capacityBias = isWithinOperatingHours(now, gym) ? 1 : 0.5;
    events.push({
      type: 'CHECKIN_EVENT',
      gym_id: gym.id,
      gym_name: gym.name,
      member_id: member.id,
      member_name: member.name,
      timestamp: eventTimestamp.toISOString(),
      capacity_bias: capacityBias,
    });
  }

  return events;
}

module.exports = {
  buildSimulationEvents,
  calculateTickInterval,
  getEventWeightsForHour,
  getSimulationBatchSize,
  getTrafficWeightForHour,
  chooseSimulationAction,
};

