const { buildSimulationEvents, calculateTickInterval } = require('../services/simulatorService');

function createSimulatorController({ store, wsHub }) {
  let timer = null;
  let running = false;
  let speed = 1;
  let inFlight = false;

  async function collectGymData() {
    const gyms = await store.listGyms();
    const membersByGym = await Promise.all(
      gyms.map(async (gym) => ({
        gym,
        members: await store.getMembersForGym(gym.id),
        openCheckins: await store.getOpenCheckinsForGym(gym.id),
      })),
    );

    return {
      gyms,
      members: membersByGym.flatMap((entry) => entry.members),
      openCheckins: membersByGym.flatMap((entry) => entry.openCheckins),
    };
  }

  async function processEvent(event) {
    const gym = await store.getGymById(event.gym_id);

    if (event.type === 'CHECKIN_EVENT') {
      const inserted = await store.recordCheckin({
        gym_id: event.gym_id,
        member_id: event.member_id,
        checked_in: event.timestamp,
        member_name: event.member_name,
        gym_name: event.gym_name,
      });
      const currentOccupancy = await store.getCurrentOccupancy(event.gym_id);
      wsHub.broadcast({
        type: 'CHECKIN_EVENT',
        gym_id: event.gym_id,
        member_name: inserted.member_name || event.member_name,
        timestamp: inserted.checked_in || event.timestamp,
        current_occupancy: currentOccupancy,
        capacity_pct: Math.round((currentOccupancy / gym.capacity) * 100),
      });
      return;
    }

    if (event.type === 'CHECKOUT_EVENT') {
      const updated = await store.recordCheckout({
        gym_id: event.gym_id,
        member_id: event.member_id,
        checked_out: event.timestamp,
      });

      if (!updated) {
        return;
      }

      const currentOccupancy = await store.getCurrentOccupancy(event.gym_id);
      wsHub.broadcast({
        type: 'CHECKOUT_EVENT',
        gym_id: event.gym_id,
        member_name: updated.member_name || event.member_name,
        timestamp: updated.checked_out || event.timestamp,
        current_occupancy: currentOccupancy,
        capacity_pct: Math.round((currentOccupancy / gym.capacity) * 100),
      });
      return;
    }

    const inserted = await store.recordPayment({
      gym_id: event.gym_id,
      member_id: event.member_id,
      amount: event.amount,
      plan_type: event.plan_type,
      payment_type: 'renewal',
      paid_at: event.timestamp,
      notes: 'simulated payment',
      member_name: event.member_name,
      gym_name: event.gym_name,
    });

    const todayTotal = await store.getTodayRevenue(event.gym_id);
    wsHub.broadcast({
      type: 'PAYMENT_EVENT',
      gym_id: event.gym_id,
      amount: Number(inserted.amount),
      plan_type: inserted.plan_type,
      member_name: inserted.member_name || event.member_name,
      today_total: Number(todayTotal.toFixed ? todayTotal.toFixed(2) : todayTotal),
    });
  }

  async function tick() {
    if (inFlight || !running) {
      return;
    }

    inFlight = true;

    try {
      const { gyms, members, openCheckins } = await collectGymData();
      const events = buildSimulationEvents({
        gyms,
        members,
        openCheckins,
        now: new Date(),
        speed,
      });

      for (const event of events) {
        await processEvent(event);
      }
    } finally {
      inFlight = false;
    }
  }

  function schedule() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    if (running) {
      timer = setInterval(() => {
        tick().catch(() => {});
      }, calculateTickInterval(speed));
    }
  }

  function start(nextSpeed = 1) {
    speed = [1, 5, 10].includes(Number(nextSpeed)) ? Number(nextSpeed) : 1;
    running = true;
    schedule();
    tick().catch(() => {});
    return {
      status: 'running',
      speed,
    };
  }

  function stop() {
    running = false;
    schedule();
    return {
      status: 'paused',
    };
  }

  async function reset() {
    running = false;
    schedule();
    await store.resetLiveState();
    return {
      status: 'reset',
    };
  }

  function getState() {
    return {
      status: running ? 'running' : 'paused',
      speed,
    };
  }

  return {
    start,
    stop,
    reset,
    tick,
    getState,
  };
}

module.exports = {
  createSimulatorController,
};

