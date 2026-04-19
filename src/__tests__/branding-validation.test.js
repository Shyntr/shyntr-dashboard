import {
    HEX_COLOR_RE,
    validateBrandingDraft,
    normalizeBrandingNumbers,
} from '../lib/branding-validation';

// ─── HEX_COLOR_RE ─────────────────────────────────────────────────────────────

describe('HEX_COLOR_RE', () => {
    const valid = ['#abc', '#abcd', '#aabbcc', '#aabbccdd', '#ABC', '#AABBCC', '#6366f1'];
    const invalid = ['', 'abc', '#xyz', '#12345', '#1234567', 'rgb(0,0,0)', 'red', 'https://x.com'];

    test.each(valid)('accepts %s', (hex) => {
        expect(HEX_COLOR_RE.test(hex)).toBe(true);
    });

    test.each(invalid)('rejects %s', (val) => {
        expect(HEX_COLOR_RE.test(val)).toBe(false);
    });
});

// ─── validateBrandingDraft ────────────────────────────────────────────────────

function baseTheme(overrides = {}) {
    return {
        themeId: 'default',
        version: 1,
        displayName: '',
        colors: {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#0f172a',
            textSecondary: '#64748b',
            border: '#e2e8f0',
            error: '#ef4444',
            success: '#22c55e',
            warning: '#f59e0b',
        },
        fonts: { family: 'Inter, system-ui, sans-serif', sizeBase: 16, weightNormal: 400, weightBold: 700 },
        borders: { radius: 8, width: 1 },
        widget: { logoUrl: '', faviconUrl: '', loginTitle: '', loginSubtitle: '' },
        page_background: { type: 'color', value: '#f8fafc' },
        ...overrides,
    };
}

describe('validateBrandingDraft — valid baseline', () => {
    test('accepts a fully valid theme', () => {
        expect(validateBrandingDraft(baseTheme())).toEqual([]);
    });

    test('returns error for null theme', () => {
        expect(validateBrandingDraft(null).length).toBeGreaterThan(0);
    });
});

// ── displayName ──────────────────────────────────────────────────────────────

describe('validateBrandingDraft — displayName', () => {
    test('accepts empty', () => {
        expect(validateBrandingDraft(baseTheme({ displayName: '' }))).toEqual([]);
    });

    test('accepts 255 chars', () => {
        expect(validateBrandingDraft(baseTheme({ displayName: 'a'.repeat(255) }))).toEqual([]);
    });

    test('rejects 256 chars', () => {
        const errors = validateBrandingDraft(baseTheme({ displayName: 'a'.repeat(256) }));
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toMatch(/displayName/);
    });
});

// ── colors ───────────────────────────────────────────────────────────────────

describe('validateBrandingDraft — colors', () => {
    const colorKeys = ['primary', 'secondary', 'background', 'surface', 'text', 'textSecondary', 'border', 'error', 'success', 'warning'];

    test.each(colorKeys)('rejects invalid hex for colors.%s', (key) => {
        const errors = validateBrandingDraft(baseTheme({ colors: { ...baseTheme().colors, [key]: 'notacolor' } }));
        expect(errors.some((e) => e.includes(`colors.${key}`))).toBe(true);
    });

    test.each(['#abc', '#abcd', '#aabbcc', '#aabbccdd'])('accepts hex format %s for colors.primary', (hex) => {
        expect(validateBrandingDraft(baseTheme({ colors: { ...baseTheme().colors, primary: hex } }))).toEqual([]);
    });

    test('allows absent color key (backend supplies default)', () => {
        const t = baseTheme();
        delete t.colors.primary;
        expect(validateBrandingDraft(t)).toEqual([]);
    });
});

// ── fonts ────────────────────────────────────────────────────────────────────

describe('validateBrandingDraft — fonts', () => {
    test.each([
        [7, true],
        [8, false],
        [72, false],
        [73, true],
    ])('sizeBase=%d → wantErr=%s', (val, wantErr) => {
        const errors = validateBrandingDraft(baseTheme({ fonts: { ...baseTheme().fonts, sizeBase: val } }));
        expect(errors.some((e) => e.includes('fonts.sizeBase'))).toBe(wantErr);
    });

    test.each([
        [99, true],
        [100, false],
        [900, false],
        [901, true],
    ])('weightNormal=%d → wantErr=%s', (val, wantErr) => {
        const errors = validateBrandingDraft(baseTheme({ fonts: { ...baseTheme().fonts, weightNormal: val } }));
        expect(errors.some((e) => e.includes('fonts.weightNormal'))).toBe(wantErr);
    });

    test.each([
        [99, true],
        [100, false],
        [900, false],
        [901, true],
    ])('weightBold=%d → wantErr=%s', (val, wantErr) => {
        const errors = validateBrandingDraft(baseTheme({ fonts: { ...baseTheme().fonts, weightBold: val } }));
        expect(errors.some((e) => e.includes('fonts.weightBold'))).toBe(wantErr);
    });

    test('accepts string numeric values (pre-normalization path)', () => {
        // sizeBase='16' as string is still within range numerically — no error
        const errors = validateBrandingDraft(baseTheme({ fonts: { ...baseTheme().fonts, sizeBase: '16' } }));
        expect(errors.some((e) => e.includes('fonts.sizeBase'))).toBe(false);
    });

    test('rejects sizeBase string out of range', () => {
        const errors = validateBrandingDraft(baseTheme({ fonts: { ...baseTheme().fonts, sizeBase: '73' } }));
        expect(errors.some((e) => e.includes('fonts.sizeBase'))).toBe(true);
    });
});

// ── borders ──────────────────────────────────────────────────────────────────

describe('validateBrandingDraft — borders', () => {
    test.each([
        [-1, true],
        [0, false],
        [100, false],
        [101, true],
    ])('radius=%d → wantErr=%s', (val, wantErr) => {
        const errors = validateBrandingDraft(baseTheme({ borders: { ...baseTheme().borders, radius: val } }));
        expect(errors.some((e) => e.includes('borders.radius'))).toBe(wantErr);
    });

    test.each([
        [-1, true],
        [0, false],
        [10, false],
        [11, true],
    ])('width=%d → wantErr=%s', (val, wantErr) => {
        const errors = validateBrandingDraft(baseTheme({ borders: { ...baseTheme().borders, width: val } }));
        expect(errors.some((e) => e.includes('borders.width'))).toBe(wantErr);
    });
});

// ── widget URLs ───────────────────────────────────────────────────────────────

describe('validateBrandingDraft — widget URLs', () => {
    test.each(['logoUrl', 'faviconUrl'])('%s: empty allowed', (key) => {
        expect(validateBrandingDraft(baseTheme({ widget: { ...baseTheme().widget, [key]: '' } }))).toEqual([]);
    });

    test.each(['logoUrl', 'faviconUrl'])('%s: https accepted', (key) => {
        expect(validateBrandingDraft(baseTheme({ widget: { ...baseTheme().widget, [key]: 'https://cdn.example.com/logo.png' } }))).toEqual([]);
    });

    test.each(['logoUrl', 'faviconUrl'])('%s: http rejected', (key) => {
        const errors = validateBrandingDraft(baseTheme({ widget: { ...baseTheme().widget, [key]: 'http://cdn.example.com/logo.png' } }));
        expect(errors.some((e) => e.includes(`widget.${key}`))).toBe(true);
    });

    test.each(['logoUrl', 'faviconUrl'])('%s: relative URL rejected', (key) => {
        const errors = validateBrandingDraft(baseTheme({ widget: { ...baseTheme().widget, [key]: '/logo.png' } }));
        expect(errors.some((e) => e.includes(`widget.${key}`))).toBe(true);
    });

    test.each(['logoUrl', 'faviconUrl'])('%s: javascript: rejected', (key) => {
        const errors = validateBrandingDraft(baseTheme({ widget: { ...baseTheme().widget, [key]: 'javascript:alert(1)' } }));
        expect(errors.some((e) => e.includes(`widget.${key}`))).toBe(true);
    });

    test('loginTitle: 255 chars allowed', () => {
        expect(validateBrandingDraft(baseTheme({ widget: { ...baseTheme().widget, loginTitle: 'a'.repeat(255) } }))).toEqual([]);
    });

    test('loginTitle: 256 chars rejected', () => {
        const errors = validateBrandingDraft(baseTheme({ widget: { ...baseTheme().widget, loginTitle: 'a'.repeat(256) } }));
        expect(errors.some((e) => e.includes('widget.loginTitle'))).toBe(true);
    });

    test('loginSubtitle: 256 chars rejected', () => {
        const errors = validateBrandingDraft(baseTheme({ widget: { ...baseTheme().widget, loginSubtitle: 'b'.repeat(256) } }));
        expect(errors.some((e) => e.includes('widget.loginSubtitle'))).toBe(true);
    });
});

// ── page_background ───────────────────────────────────────────────────────────

describe('validateBrandingDraft — page_background', () => {
    // Regression: frontend was sending 'solid' which backend rejects
    test('rejects type="solid" (regression: was frontend default, backend never accepted it)', () => {
        const errors = validateBrandingDraft(baseTheme({ page_background: { type: 'solid', value: '#ffffff' } }));
        expect(errors.some((e) => e.includes('page_background.type'))).toBe(true);
    });

    // Regression: frontend was offering 'gradient' which backend rejects
    test('rejects type="gradient" (regression: was frontend option, backend never accepted it)', () => {
        const errors = validateBrandingDraft(baseTheme({ page_background: { type: 'gradient', value: 'linear-gradient(...)' } }));
        expect(errors.some((e) => e.includes('page_background.type'))).toBe(true);
    });

    test('accepts type="color" with valid hex value', () => {
        expect(validateBrandingDraft(baseTheme({ page_background: { type: 'color', value: '#f8fafc' } }))).toEqual([]);
    });

    test('rejects type="color" with empty value', () => {
        const errors = validateBrandingDraft(baseTheme({ page_background: { type: 'color', value: '' } }));
        expect(errors.some((e) => e.includes('page_background.value'))).toBe(true);
    });

    test('rejects type="color" with non-hex value', () => {
        const errors = validateBrandingDraft(baseTheme({ page_background: { type: 'color', value: 'white' } }));
        expect(errors.some((e) => e.includes('page_background.value'))).toBe(true);
    });

    test('rejects type="color" with https URL (not a hex color)', () => {
        const errors = validateBrandingDraft(baseTheme({ page_background: { type: 'color', value: 'https://example.com/bg.jpg' } }));
        expect(errors.some((e) => e.includes('page_background.value'))).toBe(true);
    });

    test('accepts type="image" with https URL', () => {
        expect(validateBrandingDraft(baseTheme({ page_background: { type: 'image', value: 'https://cdn.example.com/bg.jpg' } }))).toEqual([]);
    });

    test('rejects type="image" with empty value', () => {
        const errors = validateBrandingDraft(baseTheme({ page_background: { type: 'image', value: '' } }));
        expect(errors.some((e) => e.includes('page_background.value'))).toBe(true);
    });

    test('rejects type="image" with http URL', () => {
        const errors = validateBrandingDraft(baseTheme({ page_background: { type: 'image', value: 'http://cdn.example.com/bg.jpg' } }));
        expect(errors.some((e) => e.includes('page_background.value'))).toBe(true);
    });
});

// ─── normalizeBrandingNumbers ─────────────────────────────────────────────────

describe('normalizeBrandingNumbers', () => {
    test('coerces string font values to integers', () => {
        const result = normalizeBrandingNumbers({
            fonts: { family: 'Inter', sizeBase: '16', weightNormal: '400', weightBold: '700' },
        });
        expect(result.fonts.sizeBase).toBe(16);
        expect(result.fonts.weightNormal).toBe(400);
        expect(result.fonts.weightBold).toBe(700);
        expect(typeof result.fonts.sizeBase).toBe('number');
    });

    test('coerces string border values to integers', () => {
        const result = normalizeBrandingNumbers({
            borders: { radius: '12', width: '2' },
        });
        expect(result.borders.radius).toBe(12);
        expect(result.borders.width).toBe(2);
        expect(typeof result.borders.radius).toBe('number');
    });

    test('rounds float values to integers', () => {
        const result = normalizeBrandingNumbers({
            fonts: { sizeBase: '16.7', weightNormal: 400, weightBold: 700 },
        });
        expect(result.fonts.sizeBase).toBe(17);
    });

    test('coerces version to integer', () => {
        const result = normalizeBrandingNumbers({ version: '1' });
        expect(result.version).toBe(1);
        expect(typeof result.version).toBe('number');
    });

    test('does not mutate the original object', () => {
        const original = { fonts: { sizeBase: '16', weightNormal: '400', weightBold: '700' } };
        normalizeBrandingNumbers(original);
        expect(typeof original.fonts.sizeBase).toBe('string');
    });

    test('leaves already-numeric values intact', () => {
        const result = normalizeBrandingNumbers({
            fonts: { sizeBase: 16, weightNormal: 400, weightBold: 700 },
            borders: { radius: 8, width: 1 },
        });
        expect(result.fonts.sizeBase).toBe(16);
        expect(result.borders.radius).toBe(8);
    });

    test('handles missing numeric sections gracefully', () => {
        const result = normalizeBrandingNumbers({ displayName: 'Test' });
        expect(result.displayName).toBe('Test');
    });

    test('returns input unchanged for null', () => {
        expect(normalizeBrandingNumbers(null)).toBeNull();
    });

    // Regression: after normalization, validate should pass for strings that were in range
    test('normalized output passes validateBrandingDraft', () => {
        const raw = {
            themeId: 'default',
            version: '1',
            fonts: { family: 'Inter', sizeBase: '16', weightNormal: '400', weightBold: '700' },
            borders: { radius: '8', width: '1' },
            page_background: { type: 'color', value: '#f8fafc' },
        };
        const normalized = normalizeBrandingNumbers(raw);
        const errors = validateBrandingDraft(normalized);
        expect(errors.filter((e) => /fonts|borders/.test(e))).toEqual([]);
    });
});
