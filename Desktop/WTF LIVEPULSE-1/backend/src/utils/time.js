function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function cloneDate(date) {
  return new Date(toDate(date).getTime());
}

function startOfDay(date) {
  const value = cloneDate(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date, days) {
  const value = cloneDate(date);
  value.setDate(value.getDate() + days);
  return value;
}

function addHours(date, hours) {
  const value = cloneDate(date);
  value.setHours(value.getHours() + hours);
  return value;
}

function addMinutes(date, minutes) {
  const value = cloneDate(date);
  value.setMinutes(value.getMinutes() + minutes);
  return value;
}

function differenceInMinutes(later, earlier) {
  return Math.floor((toDate(later) - toDate(earlier)) / 60000);
}

function differenceInHours(later, earlier) {
  return Math.floor((toDate(later) - toDate(earlier)) / 3600000);
}

function differenceInDays(later, earlier) {
  return Math.floor((startOfDay(later) - startOfDay(earlier)) / 86400000);
}

function isWithinOperatingHours(date, gym) {
  const value = toDate(date);
  const opensAt = gym.opens_at || '06:00';
  const closesAt = gym.closes_at || '22:00';

  const [openHour, openMinute] = opensAt.split(':').map(Number);
  const [closeHour, closeMinute] = closesAt.split(':').map(Number);

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const currentMinutes = value.getHours() * 60 + value.getMinutes();

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function formatTime(date) {
  return toDate(date).toISOString();
}

module.exports = {
  addDays,
  addHours,
  addMinutes,
  cloneDate,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  formatTime,
  isWithinOperatingHours,
  startOfDay,
  toDate,
};

