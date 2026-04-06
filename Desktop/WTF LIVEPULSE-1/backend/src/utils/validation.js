const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_PATTERN.test(String(value || ''));
}

function parseDateRange(value) {
  if (!value) {
    return '30d';
  }

  if (['7d', '30d', '90d'].includes(value)) {
    return value;
  }

  return null;
}

function parseSpeed(value) {
  const speed = Number(value);

  if ([1, 5, 10].includes(speed)) {
    return speed;
  }

  return null;
}

module.exports = {
  isUuid,
  parseDateRange,
  parseSpeed,
};

