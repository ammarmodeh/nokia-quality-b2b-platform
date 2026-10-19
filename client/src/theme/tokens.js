// Resolve a design token (CSS custom property from index.css) to its current
// value. Use this where a real colour string is required (canvas charts,
// alpha()); everywhere else prefer `var(--token)` directly.
export const tok = (name, fallback = '') => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

// Badge palette for status-like values: soft tinted bg + coloured text.
export const tone = {
  neutral: { bg: 'var(--surface-active)', fg: 'var(--text-secondary)' },
  accent: { bg: 'var(--accent-subtle)', fg: 'var(--accent-text)' },
  success: { bg: 'var(--success-subtle)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-subtle)', fg: 'var(--warning)' },
  danger: { bg: 'var(--danger-subtle)', fg: 'var(--danger)' },
  info: { bg: 'var(--info-subtle)', fg: 'var(--info)' },
};
