const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const isEnabled = (rawValue) => {
    if (typeof rawValue === 'boolean') {
        return rawValue;
    }

    if (typeof rawValue !== 'string') {
        return false;
    }

    return TRUE_VALUES.has(rawValue.trim().toLowerCase());
};

export const isBrandingEEEnabled = () => isEnabled(window._env_?.SHYNTR_EE_BRANDING_ENABLED);

export const isPasswordLoginEEEnabled = () => isEnabled(window._env_?.SHYNTR_EE_PASSWORD_LOGIN_ENABLED);
