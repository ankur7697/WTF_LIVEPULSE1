function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    hour12: false,
  }).format(date);
}

function formatRelativeMinutes(value) {
  if (!value) {
    return 'Unknown';
  }

  const diff = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (diff < 60) {
    return `${diff}m ago`;
  }

  const hours = Math.floor(diff / 60);
  return `${hours}h ago`;
}

function toneFromPct(pct) {
  if (pct > 85) {
    return 'critical';
  }

  if (pct >= 60) {
    return 'warning';
  }

  return 'ok';
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function percentileToLevel(value, max = 40) {
  if (!value) {
    return 0;
  }

  const ratio = Math.min(1, value / max);
  if (ratio <= 0.12) return 0;
  if (ratio <= 0.3) return 1;
  if (ratio <= 0.55) return 2;
  if (ratio <= 0.8) return 3;
  return 4;
}

function eventTypeLabel(type) {
  switch (type) {
    case 'CHECKIN_EVENT':
      return 'Check-in';
    case 'CHECKOUT_EVENT':
      return 'Check-out';
    case 'PAYMENT_EVENT':
      return 'Payment';
    case 'ANOMALY_DETECTED':
      return 'Anomaly';
    case 'ANOMALY_RESOLVED':
      return 'Resolved';
    default:
      return type || 'Event';
  }
}

export {
  deepClone,
  eventTypeLabel,
  formatCompactNumber,
  formatCurrency,
  formatDateTime,
  formatRelativeMinutes,
  percentileToLevel,
  toneFromPct,
};

