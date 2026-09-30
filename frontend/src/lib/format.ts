// ─── Currency / Number formatting ────────────────────────────────────────────

export function formatINR(value: number | string | undefined | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatQty(value: number | string | undefined | null, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(value: string | undefined | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

// ─── Hours / Minutes ──────────────────────────────────────────────────────────

export function minsToHours(mins: number | string | undefined | null): string {
  const m = typeof mins === 'string' ? parseFloat(mins) : (mins ?? 0);
  if (isNaN(m)) return '—';
  const h = Math.floor(m / 60);
  const rem = Math.round(m % 60);
  if (h === 0) return `${rem}m`;
  return `${h}h ${rem}m`;
}
