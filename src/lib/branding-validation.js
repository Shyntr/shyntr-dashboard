/**
 * Branding draft validation and normalization.
 *
 * Rules mirror the backend canonical contract defined in:
 *   internal/domain/model/tenant_branding.go  DefaultBrandingConfig / Validate
 *
 * Backend is the source of truth. Keep this file in sync with any backend rule changes.
 */

// Mirrors backend hexColorRe: #RGB | #RGBA | #RRGGBB | #RRGGBBAA
export const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const MAX_TEXT_LEN = 255;

const COLOR_FIELD_KEYS = [
    'primary', 'secondary', 'background', 'surface',
    'text', 'textSecondary', 'border', 'error', 'success', 'warning',
];

/**
 * Validates a branding draft theme object against backend rules.
 * Returns an array of error strings. Empty array means valid.
 *
 * Intentionally mirrors BrandingConfig.Validate() in Go without requiring a round-trip.
 * Backend remains authoritative — this function catches obvious mismatches early.
 */
export function validateBrandingDraft(theme) {
    if (!theme || typeof theme !== 'object') {
        return ['Theme must be a JSON object'];
    }

    const errors = [];

    // displayName: max 255 chars
    if (typeof theme.displayName === 'string' && theme.displayName.length > MAX_TEXT_LEN) {
        errors.push(`displayName must not exceed ${MAX_TEXT_LEN} characters`);
    }

    // colors: each present field must be a valid hex color
    if (theme.colors && typeof theme.colors === 'object') {
        for (const key of COLOR_FIELD_KEYS) {
            const val = theme.colors[key];
            if (val !== undefined && val !== '' && !HEX_COLOR_RE.test(val)) {
                errors.push(`colors.${key} must be a valid hex color (e.g. #rrggbb), got '${val}'`);
            }
        }
    }

    // fonts: sizeBase 8–72, weightNormal 100–900, weightBold 100–900
    if (theme.fonts && typeof theme.fonts === 'object') {
        const { sizeBase, weightNormal, weightBold } = theme.fonts;
        if (sizeBase !== undefined && sizeBase !== '') {
            const n = Number(sizeBase);
            if (!Number.isFinite(n) || n < 8 || n > 72) {
                errors.push(`fonts.sizeBase must be between 8 and 72, got '${sizeBase}'`);
            }
        }
        if (weightNormal !== undefined && weightNormal !== '') {
            const n = Number(weightNormal);
            if (!Number.isFinite(n) || n < 100 || n > 900) {
                errors.push(`fonts.weightNormal must be between 100 and 900, got '${weightNormal}'`);
            }
        }
        if (weightBold !== undefined && weightBold !== '') {
            const n = Number(weightBold);
            if (!Number.isFinite(n) || n < 100 || n > 900) {
                errors.push(`fonts.weightBold must be between 100 and 900, got '${weightBold}'`);
            }
        }
    }

    // borders: radius 0–100, width 0–10
    if (theme.borders && typeof theme.borders === 'object') {
        const { radius, width } = theme.borders;
        if (radius !== undefined && radius !== '') {
            const n = Number(radius);
            if (!Number.isFinite(n) || n < 0 || n > 100) {
                errors.push(`borders.radius must be between 0 and 100, got '${radius}'`);
            }
        }
        if (width !== undefined && width !== '') {
            const n = Number(width);
            if (!Number.isFinite(n) || n < 0 || n > 10) {
                errors.push(`borders.width must be between 0 and 10, got '${width}'`);
            }
        }
    }

    // widget: logoUrl / faviconUrl must be empty or https; display strings max 255
    if (theme.widget && typeof theme.widget === 'object') {
        for (const key of ['logoUrl', 'faviconUrl']) {
            const val = theme.widget[key];
            if (val && !val.startsWith('https://')) {
                errors.push(`widget.${key} must use the https scheme or be empty`);
            }
        }
        for (const key of ['loginTitle', 'loginSubtitle']) {
            const val = theme.widget[key];
            if (typeof val === 'string' && val.length > MAX_TEXT_LEN) {
                errors.push(`widget.${key} must not exceed ${MAX_TEXT_LEN} characters`);
            }
        }
    }

    // page_background: type must be 'color' or 'image' (backend does not accept 'solid' or 'gradient')
    if (theme.page_background && typeof theme.page_background === 'object') {
        const { type, value } = theme.page_background;
        if (type && type !== 'color' && type !== 'image') {
            errors.push(`page_background.type must be 'color' or 'image', got '${type}'`);
        }
        if (type === 'color') {
            if (!value) {
                errors.push("page_background.value cannot be empty when type is 'color'");
            } else if (!HEX_COLOR_RE.test(value)) {
                errors.push(`page_background.value must be a valid hex color when type is 'color', got '${value}'`);
            }
        }
        if (type === 'image') {
            if (!value) {
                errors.push("page_background.value cannot be empty when type is 'image'");
            } else if (!value.startsWith('https://')) {
                errors.push("page_background.value must use the https scheme when type is 'image'");
            }
        }
    }

    return errors;
}

/**
 * Coerces numeric branding fields from string to integer.
 *
 * HTML <input type="number"> always returns event.target.value as a JS string.
 * The backend unmarshal expects JSON numbers (int). Without this step, editing
 * any numeric field and saving produces a Go JSON unmarshal error.
 *
 * Returns a shallow clone with normalized values; does not mutate the input.
 */
export function normalizeBrandingNumbers(theme) {
    if (!theme || typeof theme !== 'object') {
        return theme;
    }

    const result = { ...theme };

    if (result.version !== undefined && result.version !== '') {
        const n = Number(result.version);
        if (Number.isFinite(n)) {
            result.version = Math.round(n);
        }
    }

    if (result.fonts && typeof result.fonts === 'object') {
        result.fonts = { ...result.fonts };
        for (const key of ['sizeBase', 'weightNormal', 'weightBold']) {
            if (result.fonts[key] !== undefined && result.fonts[key] !== '') {
                const n = Number(result.fonts[key]);
                if (Number.isFinite(n)) {
                    result.fonts[key] = Math.round(n);
                }
            }
        }
    }

    if (result.borders && typeof result.borders === 'object') {
        result.borders = { ...result.borders };
        for (const key of ['radius', 'width']) {
            if (result.borders[key] !== undefined && result.borders[key] !== '') {
                const n = Number(result.borders[key]);
                if (Number.isFinite(n)) {
                    result.borders[key] = Math.round(n);
                }
            }
        }
    }

    return result;
}
