const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export const isBrandingEEEnabled = () => {
  const rawValue = window._env_?.SHYNTR_EE_BRANDING_ENABLED;

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (typeof rawValue !== 'string') {
    return false;
  }

  return TRUE_VALUES.has(rawValue.trim().toLowerCase());
};
