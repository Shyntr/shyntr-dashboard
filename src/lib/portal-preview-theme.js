// Clamps the branding border-width to the range the portal actually renders.
// Mirrors shyntr-api.ts: Math.min(10, Math.max(0, Math.round(n))).
function normalizeBorderWidth(input) {
    if (input === null || input === undefined || isNaN(input)) return 1;
    return Math.min(Math.max(Math.round(input), 0), 10);
}

export const DEFAULT_PORTAL_PREVIEW_THEME = {
    tenantId: 'default',
    borderWidth: 1,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSizeBase: 16,
    fontWeightNormal: 400,
    fontWeightBold: 700,
    loginTitle: 'Sign in',
    loginSubtitle: '',
    pageBackground: {
        type: 'color',
        value: '#f8fafc',
    },
    cardBackground: '#ffffff',
    cardBorderColor: '#e2e8f0',
    cardRadius: '0.5rem',
    cardShadow: '0 1px 4px rgba(15, 23, 42, 0.05), 0 14px 36px rgba(15, 23, 42, 0.06)',
    surfaceSubtle: '#f8fafc',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    buttonBackground: '#6366f1',
    buttonBackgroundHover: '#4f46e5',
    buttonText: '#ffffff',
    inputBackground: '#ffffff',
    inputBorderColor: '#e2e8f0',
    inputText: '#0f172a',
    inputPlaceholder: '#94a3b8',
    inputFocusColor: '#6366f1',
    linkColor: '#6366f1',
    linkHoverColor: '#4f46e5',
    iconColor: '#6366f1',
    logo: {
        imageUrl: undefined,
        alt: 'Shyntr',
        placement: 'center',
        width: 120,
    },
};

function getFirstString(source, keys) {
    if (!source || typeof source !== 'object') {
        return undefined;
    }

    for (const path of keys) {
        let current = source;
        let valid = true;

        for (const key of path) {
            if (!current || typeof current !== 'object' || !(key in current)) {
                valid = false;
                break;
            }

            current = current[key];
        }

        if (valid && typeof current === 'string' && current.trim() !== '') {
            return current.trim();
        }
    }

    return undefined;
}

function getFirstNumber(source, keys) {
    if (!source || typeof source !== 'object') {
        return undefined;
    }

    for (const path of keys) {
        let current = source;
        let valid = true;

        for (const key of path) {
            if (!current || typeof current !== 'object' || !(key in current)) {
                valid = false;
                break;
            }

            current = current[key];
        }

        if (!valid) {
            continue;
        }

        if (typeof current === 'number' && Number.isFinite(current)) {
            return current;
        }

        if (typeof current === 'string') {
            const numeric = Number(current);
            if (Number.isFinite(numeric)) {
                return numeric;
            }
        }
    }

    return undefined;
}

function getFirstRecord(source, keys) {
    if (!source || typeof source !== 'object') {
        return undefined;
    }

    for (const path of keys) {
        let current = source;
        let valid = true;

        for (const key of path) {
            if (!current || typeof current !== 'object' || !(key in current)) {
                valid = false;
                break;
            }

            current = current[key];
        }

        if (
            valid &&
            current &&
            typeof current === 'object' &&
            !Array.isArray(current)
        ) {
            return current;
        }
    }

    return undefined;
}

function normalizeColor(value, fallback) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

// Mirrors shyntr-api.ts normalizeRadius: clamp 0–32px for integers.
// String aliases ('sm', 'md', etc.) are not used by the dashboard branding form
// but the clamp ensures preview matches portal for any raw numeric value.
function normalizeRadius(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return `${Math.min(32, Math.max(0, Math.round(value)))}px`;
    }

    if (typeof value === 'string') {
        const numericValue = Number(value);
        if (Number.isFinite(numericValue)) {
            return `${Math.min(32, Math.max(0, Math.round(numericValue)))}px`;
        }
    }

    return fallback;
}

function normalizeLogoAlt(value, tenantId) {
    if (value && value.trim() !== '') {
        return value.trim();
    }

    return tenantId || DEFAULT_PORTAL_PREVIEW_THEME.logo.alt;
}

function darkenColor(hex, factor = 0.85) {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) {
        return hex;
    }

    const r = Math.round(parseInt(clean.slice(0, 2), 16) * factor);
    const g = Math.round(parseInt(clean.slice(2, 4), 16) * factor);
    const b = Math.round(parseInt(clean.slice(4, 6), 16) * factor);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
        .toString(16)
        .padStart(2, '0')}`;
}

function normalizeFontSize(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 8 && value <= 72) {
        return Math.round(value);
    }
    return fallback;
}

function normalizeFontWeight(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 100 && value <= 900) {
        return Math.round(value);
    }
    return fallback;
}

function normalizePageBackground(pageBackground) {
    const type = getFirstString(pageBackground, [['type']]);
    const value = getFirstString(pageBackground, [['value']]);

    if (type === 'image' && value) {
        return {
            type: 'image',
            value,
        };
    }

    return {
        type: 'color',
        value: normalizeColor(value, DEFAULT_PORTAL_PREVIEW_THEME.pageBackground.value),
    };
}

export function buildPortalPreviewTheme(tenantId, branding) {
    if (!branding || typeof branding !== 'object' || Object.keys(branding).length === 0) {
        return {
            ...DEFAULT_PORTAL_PREVIEW_THEME,
            tenantId: tenantId || DEFAULT_PORTAL_PREVIEW_THEME.tenantId,
            logo: {
                ...DEFAULT_PORTAL_PREVIEW_THEME.logo,
                alt: normalizeLogoAlt(undefined, tenantId || DEFAULT_PORTAL_PREVIEW_THEME.logo.alt),
            },
        };
    }

    const colors = getFirstRecord(branding, [['colors']]);
    const fonts = getFirstRecord(branding, [['fonts']]);
    const borders = getFirstRecord(branding, [['borders']]);
    const widget = getFirstRecord(branding, [['widget']]);
    const pageBackground = getFirstRecord(branding, [['page_background']]);
    const primary = normalizeColor(
        getFirstString(colors, [['primary']]),
        DEFAULT_PORTAL_PREVIEW_THEME.buttonBackground
    );

    return {
        tenantId: tenantId || DEFAULT_PORTAL_PREVIEW_THEME.tenantId,
        borderWidth: normalizeBorderWidth(getFirstNumber(borders, [['width']])),
        fontFamily: getFirstString(fonts, [['family']]) || DEFAULT_PORTAL_PREVIEW_THEME.fontFamily,
        fontSizeBase: normalizeFontSize(getFirstNumber(fonts, [['sizeBase']]), DEFAULT_PORTAL_PREVIEW_THEME.fontSizeBase),
        fontWeightNormal: normalizeFontWeight(getFirstNumber(fonts, [['weightNormal']]), DEFAULT_PORTAL_PREVIEW_THEME.fontWeightNormal),
        fontWeightBold: normalizeFontWeight(getFirstNumber(fonts, [['weightBold']]), DEFAULT_PORTAL_PREVIEW_THEME.fontWeightBold),
        loginTitle: getFirstString(widget, [['loginTitle'], ['login_title']]) || DEFAULT_PORTAL_PREVIEW_THEME.loginTitle,
        loginSubtitle: getFirstString(widget, [['loginSubtitle'], ['login_subtitle']]) || DEFAULT_PORTAL_PREVIEW_THEME.loginSubtitle,
        pageBackground: normalizePageBackground(pageBackground),
        cardBackground: normalizeColor(
            getFirstString(colors, [['background']]),
            DEFAULT_PORTAL_PREVIEW_THEME.cardBackground
        ),
        cardBorderColor: normalizeColor(
            getFirstString(colors, [['border']]),
            DEFAULT_PORTAL_PREVIEW_THEME.cardBorderColor
        ),
        cardRadius: normalizeRadius(
            getFirstNumber(borders, [['radius']]),
            DEFAULT_PORTAL_PREVIEW_THEME.cardRadius
        ),
        cardShadow: DEFAULT_PORTAL_PREVIEW_THEME.cardShadow,
        surfaceSubtle: normalizeColor(
            getFirstString(colors, [['surface']]),
            DEFAULT_PORTAL_PREVIEW_THEME.surfaceSubtle
        ),
        textPrimary: normalizeColor(
            getFirstString(colors, [['text']]),
            DEFAULT_PORTAL_PREVIEW_THEME.textPrimary
        ),
        textSecondary: normalizeColor(
            getFirstString(colors, [['textSecondary'], ['text_secondary']]),
            DEFAULT_PORTAL_PREVIEW_THEME.textSecondary
        ),
        textMuted: DEFAULT_PORTAL_PREVIEW_THEME.textMuted,
        buttonBackground: primary,
        buttonBackgroundHover: darkenColor(primary),
        buttonText: DEFAULT_PORTAL_PREVIEW_THEME.buttonText,
        inputBackground: normalizeColor(
            getFirstString(colors, [['background']]),
            DEFAULT_PORTAL_PREVIEW_THEME.inputBackground
        ),
        inputBorderColor: normalizeColor(
            getFirstString(colors, [['border']]),
            DEFAULT_PORTAL_PREVIEW_THEME.inputBorderColor
        ),
        inputText: normalizeColor(
            getFirstString(colors, [['text']]),
            DEFAULT_PORTAL_PREVIEW_THEME.inputText
        ),
        inputPlaceholder: DEFAULT_PORTAL_PREVIEW_THEME.inputPlaceholder,
        inputFocusColor: primary,
        linkColor: primary,
        linkHoverColor: darkenColor(primary),
        iconColor: primary,
        logo: {
            imageUrl: getFirstString(widget, [['logoUrl'], ['logo_url']]),
            alt: normalizeLogoAlt(
                getFirstString(branding, [['displayName']]),
                tenantId || DEFAULT_PORTAL_PREVIEW_THEME.logo.alt
            ),
            placement: DEFAULT_PORTAL_PREVIEW_THEME.logo.placement,
            width: DEFAULT_PORTAL_PREVIEW_THEME.logo.width,
        },
    };
}

export function buildPortalPreviewCssVars(theme) {
    return {
        '--auth-border-width': `${theme.borderWidth ?? DEFAULT_PORTAL_PREVIEW_THEME.borderWidth}px`,
        '--auth-font-family': theme.fontFamily ?? DEFAULT_PORTAL_PREVIEW_THEME.fontFamily,
        '--auth-font-size-base': `${theme.fontSizeBase ?? DEFAULT_PORTAL_PREVIEW_THEME.fontSizeBase}px`,
        '--auth-font-weight-normal': String(theme.fontWeightNormal ?? DEFAULT_PORTAL_PREVIEW_THEME.fontWeightNormal),
        '--auth-font-weight-bold': String(theme.fontWeightBold ?? DEFAULT_PORTAL_PREVIEW_THEME.fontWeightBold),
        '--auth-page-background': theme.pageBackground.type === 'color'
            ? theme.pageBackground.value
            : DEFAULT_PORTAL_PREVIEW_THEME.pageBackground.value,
        '--auth-card-background': theme.cardBackground,
        '--auth-card-border': theme.cardBorderColor,
        '--auth-card-radius': theme.cardRadius,
        '--auth-card-shadow': theme.cardShadow,
        '--auth-surface-subtle': theme.surfaceSubtle,
        '--auth-text-primary': theme.textPrimary,
        '--auth-text-secondary': theme.textSecondary,
        '--auth-text-muted': theme.textMuted,
        '--auth-button-background': theme.buttonBackground,
        '--auth-button-background-hover': theme.buttonBackgroundHover,
        '--auth-button-text': theme.buttonText,
        '--auth-input-background': theme.inputBackground,
        '--auth-input-border': theme.inputBorderColor,
        '--auth-input-text': theme.inputText,
        '--auth-input-placeholder': theme.inputPlaceholder,
        '--auth-input-focus': theme.inputFocusColor,
        '--auth-link-color': theme.linkColor,
        '--auth-link-hover-color': theme.linkHoverColor,
        '--auth-icon-color': theme.iconColor,
    };
}

export function buildPortalPreviewShellStyle(theme) {
    if (theme.pageBackground.type === 'image') {
        return {
            backgroundColor: DEFAULT_PORTAL_PREVIEW_THEME.pageBackground.value,
            backgroundImage: `url(${theme.pageBackground.value})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
        };
    }

    return {
        backgroundColor: theme.pageBackground.value,
        backgroundImage: 'none',
        backgroundRepeat: 'no-repeat',
    };
}

