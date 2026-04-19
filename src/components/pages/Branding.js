import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    Palette,
    RefreshCw,
    Save,
    Upload,
    RotateCcw,
    Undo2,
    Droplets,
    Type,
    SquareRoundCorner,
    PanelsTopLeft,
    Image as ImageIcon,
    User,
    Mail
} from 'lucide-react';
import {toast} from 'sonner';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Alert, AlertDescription, AlertTitle} from '../ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import {Input} from '../ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import {Textarea} from '../ui/textarea';
import {JsonEditor} from '../shared/JsonEditor';
import {
    getTenants,
    getBranding,
    updateBrandingDraft,
    publishBranding,
    discardBranding,
    resetBranding,
} from '../../lib/api';
import {validateBrandingDraft, normalizeBrandingNumbers} from '../../lib/branding-validation';
import {
    buildPortalPreviewCssVars,
    buildPortalPreviewShellStyle,
    buildPortalPreviewTheme,
} from '../../lib/portal-preview-theme';

const RESET_TARGETS = [
    {
        value: 'draft',
        label: 'Draft Only',
        description: 'Clears the current draft and keeps the published branding unchanged.',
    },
    {
        value: 'draft_and_published',
        label: 'Draft and Published',
        description: 'Clears both draft and published branding so runtime defaults can apply again.',
    },
];

const EDITOR_SECTIONS = [
    {id: 'colors', label: 'Colors', icon: Droplets},
    {id: 'fonts', label: 'Fonts', icon: Type},
    {id: 'borders', label: 'Borders', icon: SquareRoundCorner},
    {id: 'widget', label: 'Widget', icon: PanelsTopLeft},
    {id: 'page_background', label: 'Background', icon: ImageIcon},
];

const PREVIEW_MODES = [
    {value: 'login', label: 'Login'},
    {value: 'consent', label: 'Consent'},
];

const SECONDARY_ACTIONS = [
    {label: 'Sign in with Google', glyph: 'G'},
    {label: 'Sign in with Workspace', glyph: 'W'},
];

const CONSENT_SCOPE_ROWS = [
    {label: 'Profile', icon: User},
    {label: 'Email', icon: Mail},
    {label: 'Offline access', icon: RefreshCw},
];

const BRANDING_SCHEMA_KEYS = [
    'displayName',
    'colors',
    'fonts',
    'borders',
    'widget',
    'page_background',
];

// Mirrors the canonical portal defaults from DEFAULT_PORTAL_THEME (shyntr-ee-auth-portal).
// These are the raw branding values that, when normalized by buildPortalPreviewTheme,
// produce output identical to what the portal renders for a tenant with no custom branding.
// - colors.background → cardBackground (#ffffff)
// - colors.surface    → surfaceSubtle  (#f8fafc)
// - borders.radius    → cardRadius     (8px ≈ 0.5rem portal default)
// - widget.loginTitle/loginSubtitle: empty → falls back to DEFAULT_PORTAL_PREVIEW_THEME defaults
const DEFAULT_PREVIEW_THEME = {
    displayName: 'Shyntr',
    colors: {
        primary: '#6366f1',
        secondary: '#eef2ff',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        error: '#dc2626',
        success: '#059669',
        warning: '#d97706',
    },
    fonts: {
        family: 'Inter, ui-sans-serif, system-ui, sans-serif',
        sizeBase: '16',
        weightNormal: '400',
        weightBold: '700',
    },
    borders: {
        radius: '8',
        width: '1',
    },
    widget: {
        logoUrl: '',
        faviconUrl: '',
        loginTitle: '',
        loginSubtitle: '',
    },
    page_background: {
        type: 'color',
        value: '#f8fafc',
    },
};

const COLOR_FIELDS = [
    {key: 'primary', label: 'Primary'},
    {key: 'secondary', label: 'Secondary'},
    {key: 'background', label: 'Background'},
    {key: 'surface', label: 'Surface'},
    {key: 'text', label: 'Text'},
    {key: 'textSecondary', label: 'Text Secondary'},
    {key: 'border', label: 'Border'},
    {key: 'error', label: 'Error'},
    {key: 'success', label: 'Success'},
    {key: 'warning', label: 'Warning'},
];

// min/max mirror backend validation: sizeBase 8–72, weights 100–900
const FONT_FIELDS = [
    {key: 'family', label: 'Font Family', type: 'text', placeholder: 'Inter, system-ui, sans-serif'},
    {key: 'sizeBase', label: 'Base Size', type: 'number', min: '8', max: '72', step: '1'},
    {key: 'weightNormal', label: 'Weight Normal', type: 'number', min: '100', max: '900', step: '100'},
    {key: 'weightBold', label: 'Weight Bold', type: 'number', min: '100', max: '900', step: '100'},
];

// min/max mirror backend validation: radius 0–100, width 0–10
const BORDER_FIELDS = [
    {key: 'radius', label: 'Radius', type: 'number', min: '0', max: '100', step: '1'},
    {key: 'width', label: 'Border Width', type: 'number', min: '0', max: '10', step: '1'},
];

const WIDGET_FIELDS = [
    {key: 'logoUrl', label: 'Logo URL', placeholder: 'https://example.com/logo.svg'},
    {key: 'faviconUrl', label: 'Favicon URL', placeholder: 'https://example.com/favicon.ico'},
    {key: 'loginTitle', label: 'Login Title', placeholder: 'Welcome back'},
    {key: 'loginSubtitle', label: 'Login Subtitle', placeholder: 'Sign in to continue'},
];

// Backend accepts 'color' and 'image' only. 'solid' and 'gradient' are rejected.
const PAGE_BACKGROUND_TYPES = [
    {value: 'color', label: 'Solid Color'},
    {value: 'image', label: 'Image URL'},
];

const isPopulatedObject = (value) => (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
);

const cloneTheme = (theme) => JSON.parse(JSON.stringify(theme || {}));

const mergePreviewTheme = (theme) => ({
    ...DEFAULT_PREVIEW_THEME,
    ...theme,
    colors: {
        ...DEFAULT_PREVIEW_THEME.colors,
        ...(theme?.colors || {}),
    },
    fonts: {
        ...DEFAULT_PREVIEW_THEME.fonts,
        ...(theme?.fonts || {}),
    },
    borders: {
        ...DEFAULT_PREVIEW_THEME.borders,
        ...(theme?.borders || {}),
    },
    widget: {
        ...DEFAULT_PREVIEW_THEME.widget,
        ...(theme?.widget || {}),
    },
    page_background: {
        ...DEFAULT_PREVIEW_THEME.page_background,
        ...(theme?.page_background || {}),
    },
});

const setNestedValue = (object, path, value) => {
    let cursor = object;

    for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
            cursor[key] = {};
        }
        cursor = cursor[key];
    }

    const lastKey = path[path.length - 1];
    if (value === '' || value === null || value === undefined) {
        delete cursor[lastKey];
    } else {
        cursor[lastKey] = value;
    }
};

const getNestedValue = (object, path) => path.reduce((current, key) => current?.[key], object);

function CompactHint({children}) {
    return <p className="text-xs text-muted-foreground">{children}</p>;
}

function FieldGroup({label, hint, children}) {
    return (
        <div className="space-y-2">
            <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            </div>
            {children}
        </div>
    );
}

function PreviewLogo({portalTheme, mascotSrc}) {
    if (portalTheme.logo.imageUrl) {
        // Portal: auth-logo-image has no max-height constraint — height is auto only.
        return (
            <img
                src={portalTheme.logo.imageUrl}
                alt={portalTheme.logo.alt}
                className="h-auto object-contain"
                style={{width: `${portalTheme.logo.width}px`, maxWidth: '100%'}}
            />
        );
    }

    // Portal mascot: MascotDisplay renders md:w-40 md:h-40 sm:w-28 sm:h-28 (160px on md screens).
    // Static image is fine for a non-interactive preview (no framer-motion needed).
    return (
        <div className="flex justify-center">
            <div className="relative md:w-40 md:h-40 sm:w-28 sm:h-28 mx-auto select-none">
                <img
                    src={mascotSrc}
                    alt="Shyntr mascot"
                    className="w-full h-full object-contain drop-shadow-lg"
                />
            </div>
        </div>
    );
}

function PreviewFooter() {
    // Portal Footer: link color via auth-footer-link, muted via auth-text-muted.
    // "Shyntr" brand uses auth-footer-brand + font-semibold (600 hardcoded in portal).
    return (
        <footer className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2" style={{fontSize: '0.875em'}}>
                <span style={{color: 'var(--auth-link-color)'}}>Help</span>
                <span style={{color: 'var(--auth-text-muted)'}}>•</span>
                <span style={{color: 'var(--auth-link-color)'}}>Privacy</span>
                <span style={{color: 'var(--auth-text-muted)'}}>•</span>
                <span style={{color: 'var(--auth-link-color)'}}>Terms</span>
            </div>
            <p style={{color: 'var(--auth-text-muted)', fontSize: '0.75em'}}>
                Powered by <span style={{fontWeight: 600}}>Shyntr</span>
            </p>
        </footer>
    );
}

function AuthPreviewCard({children, previewCardStyle, previewCardPaddingClassName}) {
    return (
        <div className={previewCardPaddingClassName} style={previewCardStyle}>
            {children}
        </div>
    );
}

export function Branding() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState([]);
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [brandingState, setBrandingState] = useState(null);
    const [draftJson, setDraftJson] = useState('{}');
    const [resetTarget, setResetTarget] = useState('draft');
    const [loadingTenants, setLoadingTenants] = useState(true);
    const [loadingBranding, setLoadingBranding] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [loadError, setLoadError] = useState('');
    const [selectedSection, setSelectedSection] = useState('colors');
    const [previewMode, setPreviewMode] = useState('login');
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [lastValidPreviewTheme, setLastValidPreviewTheme] = useState(mergePreviewTheme({}));

    const latestTenantsRequestRef = useRef(0);
    const activeTenantsRequestRef = useRef(null);
    const latestBrandingRequestRef = useRef(0);
    const activeBrandingRequestRef = useRef(null);

    useEffect(() => {
        fetchTenants();

        return () => {
            if (activeTenantsRequestRef.current) {
                activeTenantsRequestRef.current.cancelled = true;
            }
            if (activeBrandingRequestRef.current) {
                activeBrandingRequestRef.current.cancelled = true;
            }
        };
    }, []);

    useEffect(() => {
        if (!selectedTenantId) {
            setBrandingState(null);
            setDraftJson('{}');
            setLoadError('');
            setLastValidPreviewTheme(mergePreviewTheme({}));
            return;
        }

        fetchBrandingState(selectedTenantId);
    }, [selectedTenantId]);

    const parsedDraftResult = useMemo(() => {
        try {
            const parsed = JSON.parse(draftJson || '{}');
            return {theme: parsed, error: ''};
        } catch (error) {
            return {
                theme: null,
                error: error.message || 'Draft theme must be valid JSON',
            };
        }
    }, [draftJson]);

    useEffect(() => {
        if (parsedDraftResult.theme) {
            setLastValidPreviewTheme(mergePreviewTheme(parsedDraftResult.theme));
        }
    }, [parsedDraftResult.theme]);

    const fetchTenants = async () => {
        const requestId = latestTenantsRequestRef.current + 1;
        latestTenantsRequestRef.current = requestId;

        if (activeTenantsRequestRef.current) {
            activeTenantsRequestRef.current.cancelled = true;
        }

        const requestToken = {id: requestId, cancelled: false};
        activeTenantsRequestRef.current = requestToken;

        setLoadingTenants(true);

        try {
            const response = await getTenants();

            if (requestToken.cancelled || activeTenantsRequestRef.current?.id !== requestId) {
                return;
            }

            setTenants(response.data || []);
        } catch (error) {
            if (requestToken.cancelled || activeTenantsRequestRef.current?.id !== requestId) {
                return;
            }

            toast.error(error.message || 'Failed to load tenants');
        } finally {
            if (!requestToken.cancelled && activeTenantsRequestRef.current?.id === requestId) {
                setLoadingTenants(false);
            }
        }
    };

    const fetchBrandingState = async (tenantId) => {
        const requestId = latestBrandingRequestRef.current + 1;
        latestBrandingRequestRef.current = requestId;

        if (activeBrandingRequestRef.current) {
            activeBrandingRequestRef.current.cancelled = true;
        }

        const requestToken = {id: requestId, cancelled: false};
        activeBrandingRequestRef.current = requestToken;

        setLoadingBranding(true);
        setLoadError('');

        try {
            const response = await getBranding(tenantId);

            if (requestToken.cancelled || activeBrandingRequestRef.current?.id !== requestId) {
                return;
            }

            const nextBrandingState = response.data || null;
            const nextDraftJson = JSON.stringify(nextBrandingState?.draft ?? {}, null, 2);
            setBrandingState(nextBrandingState);
            setDraftJson(nextDraftJson);
            setLastValidPreviewTheme(mergePreviewTheme(nextBrandingState?.draft ?? {}));
        } catch (error) {
            if (requestToken.cancelled || activeBrandingRequestRef.current?.id !== requestId) {
                return;
            }

            setBrandingState(null);
            setDraftJson('{}');
            setLoadError(error.message || 'Failed to load branding');
            toast.error(error.message || 'Failed to load branding');
        } finally {
            if (!requestToken.cancelled && activeBrandingRequestRef.current?.id === requestId) {
                setLoadingBranding(false);
            }
        }
    };

    const performAction = async (actionName, action) => {
        if (!selectedTenantId) {
            toast.error('Select a tenant to manage branding');
            return;
        }

        if (actionLoading) {
            return;
        }

        setActionLoading(actionName);

        try {
            await action();
            await fetchBrandingState(selectedTenantId);
        } catch (error) {
            toast.error(error.message || 'Branding request failed');
        } finally {
            setActionLoading('');
        }
    };

    const handleSaveDraft = async () => {
        if (!selectedTenantId) {
            toast.error('Select a tenant to manage branding');
            return;
        }

        let parsedTheme;

        try {
            parsedTheme = JSON.parse(draftJson);
        } catch (error) {
            toast.error('Draft theme must be valid JSON');
            return;
        }

        // Coerce string numerics to integers (HTML number inputs return strings).
        const normalizedTheme = normalizeBrandingNumbers(parsedTheme);

        // Validate against backend rules before the round-trip.
        const validationErrors = validateBrandingDraft(normalizedTheme);
        if (validationErrors.length > 0) {
            const suffix = validationErrors.length > 1 ? ` (+${validationErrors.length - 1} more)` : '';
            toast.error(`${validationErrors[0]}${suffix}`);
            return;
        }

        await performAction('save-draft', async () => {
            await updateBrandingDraft(selectedTenantId, normalizedTheme);
            toast.success('Draft branding saved successfully');
        });
    };

    const handlePublish = async () => {
        await performAction('publish', async () => {
            await publishBranding(selectedTenantId);
            toast.success('Branding published successfully');
        });
    };

    const handleDiscard = async () => {
        await performAction('discard', async () => {
            await discardBranding(selectedTenantId);
            toast.success('Draft branding discarded successfully');
        });
    };

    const handleReset = async () => {
        if (!RESET_TARGETS.some((target) => target.value === resetTarget)) {
            toast.error('Reset target is invalid');
            return;
        }

        setResetDialogOpen(false);

        await performAction('reset', async () => {
            await resetBranding(selectedTenantId, resetTarget);
            toast.success('Branding reset successfully');
        });
    };

    const openResetConfirmation = () => {
        if (!selectedTenantId) {
            toast.error('Select a tenant to manage branding');
            return;
        }

        if (!RESET_TARGETS.some((target) => target.value === resetTarget)) {
            toast.error('Reset target is invalid');
            return;
        }

        if (actionLoading) {
            return;
        }

        setResetDialogOpen(true);
    };

    const updateDraftTheme = (updater) => {
        const baseTheme = cloneTheme(parsedDraftResult.theme || lastValidPreviewTheme || {});
        const nextTheme = updater(baseTheme);
        setDraftJson(JSON.stringify(nextTheme, null, 2));
    };

    const updateThemeField = (path, value) => {
        updateDraftTheme((baseTheme) => {
            const nextTheme = cloneTheme(baseTheme);
            setNestedValue(nextTheme, path, value);
            return nextTheme;
        });
    };

    const previewTheme = parsedDraftResult.theme
        ? mergePreviewTheme(parsedDraftResult.theme)
        : lastValidPreviewTheme;
    const editableTheme = mergePreviewTheme(parsedDraftResult.theme || lastValidPreviewTheme);
    const publishedJson = useMemo(
        () => JSON.stringify(brandingState?.published ?? {}, null, 2),
        [brandingState]
    );

    const hasDraftBranding = isPopulatedObject(brandingState?.draft);
    const hasPublishedBranding = isPopulatedObject(brandingState?.published);
    const selectedResetTarget = RESET_TARGETS.find((target) => target.value === resetTarget);
    const effectivePublishedExplanation = hasPublishedBranding
        ? 'The auth portal uses this published branding first and may still fall back to canonical backend/runtime defaults for any missing keys.'
        : 'No published branding exists for this tenant. The auth portal will fall back to canonical backend/runtime defaults until branding is published.';
    const resetConfirmationTitle = resetTarget === 'draft_and_published'
        ? 'Reset Draft and Published Branding'
        : 'Reset Draft Branding';
    const resetConfirmationDescription = resetTarget === 'draft_and_published'
        ? 'This will permanently clear both the current draft and the published branding for this tenant. After reset, the auth portal will stop using published tenant branding and fall back to backend defaults again until a new draft is published.'
        : 'This will permanently clear the current draft for this tenant. The published branding will remain live in the auth portal, and only your unpublished changes will be removed.';
    const stateSummary = loadError
        ? {
            label: 'Load Failed',
            className: 'bg-destructive/10 text-destructive border-destructive/20',
        }
        : brandingState?.hasUnpublishedChanges
            ? {
                label: 'Draft Changed',
                className: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
            }
            : hasPublishedBranding
                ? {
                    label: 'Published',
                    className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
                }
                : {
                    label: 'Defaults',
                    className: 'bg-sky-500/15 text-sky-500 border-sky-500/20',
                };

    const formatDateTime = (value) => {
        if (!value) {
            return 'Not available';
        }

        return new Date(value).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const portalPreviewTheme = buildPortalPreviewTheme(
        brandingState?.tenantId || selectedTenantId,
        previewTheme
    );
    const previewShellStyle = {
        ...buildPortalPreviewCssVars(portalPreviewTheme),
        ...buildPortalPreviewShellStyle(portalPreviewTheme),
    };
    const mascotSrc = `${window._env_?.SHYNTR_PATH_PREFIX || '/'}mascot.png`;
    const previewCardStyle = {
        background: 'var(--auth-card-background)',
        border: `var(--auth-border-width) solid var(--auth-card-border)`,
        borderRadius: 'var(--auth-card-radius)',
        boxShadow: 'var(--auth-card-shadow)',
        color: 'var(--auth-text-primary)',
    };
    const previewShellClassName = 'min-h-[860px] p-6 md:p-8';
    const previewCardPaddingClassName = 'p-4 sm:p-10';
    const previewCardMaxWidthClassName = 'max-w-[450px]';
    const tenantBadgeVisible = Boolean(selectedTenantId && selectedTenantId !== 'default');
    const pageBackgroundType = getNestedValue(editableTheme, ['page_background', 'type']) || 'color';
    const pageBackgroundValueHint = pageBackgroundType === 'image'
        ? 'HTTPS image URL used as the auth shell backdrop.'
        : 'Hex color used as the auth shell backdrop.';
    const pageBackgroundValuePlaceholder = pageBackgroundType === 'image'
        ? 'https://example.com/background.png'
        : '#e2e8f0';

    const isBusy = loadingTenants || loadingBranding || Boolean(actionLoading);
    const saveBlockedByInvalidJson = Boolean(parsedDraftResult.error);
    const hasTenants = tenants.length > 0;

    const handleCreateTenant = () => {
        navigate('/tenants');
    };

    const renderLoginPreview = () => (
        <div className={`w-full ${previewCardMaxWidthClassName}`}>
            <AuthPreviewCard previewCardStyle={previewCardStyle} previewCardPaddingClassName={previewCardPaddingClassName}>
                <div className="mb-2 flex justify-center text-center">
                    <PreviewLogo portalTheme={portalPreviewTheme} mascotSrc={mascotSrc}/>
                </div>

                <div className="mb-8 text-center">
                    <h2
                        className="mb-2"
                        style={{
                            color: 'var(--auth-text-primary)',
                            fontSize: '1.5em',
                            fontWeight: 'var(--auth-font-weight-bold)',
                            lineHeight: '1.3',
                        }}
                    >
                        {portalPreviewTheme.loginTitle}
                    </h2>
                    {portalPreviewTheme.loginSubtitle ? (
                        <p style={{color: 'var(--auth-text-secondary)', fontSize: '0.875em'}}>
                            {portalPreviewTheme.loginSubtitle}
                        </p>
                    ) : (
                        <p style={{color: 'var(--auth-text-secondary)', fontSize: '0.875em'}}>
                            Sign in to continue to{' '}
                            {/* Portal uses auth-emphasis (text-primary) + font-semibold (600 hardcoded) */}
                            <span style={{color: 'var(--auth-text-primary)', fontWeight: 600}}>
                                {portalPreviewTheme.logo.alt}
                            </span>
                        </p>
                    )}
                    {tenantBadgeVisible ? (
                        <div
                            className="mt-3 inline-flex items-center rounded-full px-3 py-1.5"
                            style={{
                                background: 'var(--auth-surface-subtle)',
                                color: 'var(--auth-text-secondary)',
                                fontSize: '0.75em',
                                fontWeight: 500, // portal: auth-badge uses font-medium (500)
                            }}
                        >
                            At{' '}
                            {/* Portal inner span: auth-emphasis + font-semibold (600 hardcoded) */}
                            <span className="ml-1" style={{color: 'var(--auth-text-primary)', fontWeight: 600}}>
                                {brandingState?.tenantId || selectedTenantId}
                            </span>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {/* Portal: <Label className="auth-label text-sm font-medium"> → 500 hardcoded */}
                            <p style={{color: 'var(--auth-text-secondary)', fontSize: '0.875em', fontWeight: 500}}>Username</p>
                            <div
                                className="px-4 py-3"
                                style={{
                                    border: `var(--auth-border-width) solid var(--auth-input-border)`,
                                    background: 'var(--auth-input-background)',
                                    color: 'var(--auth-input-placeholder)',
                                    borderRadius: 'var(--auth-card-radius)',
                                }}
                            >
                                Enter username
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p style={{color: 'var(--auth-text-secondary)', fontSize: '0.875em', fontWeight: 500}}>Password</p>
                            <div
                                className="px-4 py-3"
                                style={{
                                    border: `var(--auth-border-width) solid var(--auth-input-border)`,
                                    background: 'var(--auth-input-background)',
                                    color: 'var(--auth-input-placeholder)',
                                    borderRadius: 'var(--auth-card-radius)',
                                }}
                            >
                                Enter password
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 py-1">
                        <span
                            className="h-5 w-5 rounded"
                            style={{
                                background: 'var(--auth-button-background)',
                                boxShadow: 'inset 0 0 0 1px var(--auth-button-background)',
                            }}
                        />
                        <span style={{color: 'var(--auth-text-secondary)', fontSize: '0.875em'}}>Remember me</span>
                    </div>

                    {/* Portal primary button: auth-primary-button + font-semibold (600 hardcoded) */}
                    <button
                        type="button"
                        className="h-11 w-full px-8"
                        style={{
                            background: 'var(--auth-button-background)',
                            color: 'var(--auth-button-text)',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                            borderRadius: 'var(--auth-card-radius)',
                            fontSize: '0.875em',
                            fontWeight: 600,
                        }}
                    >
                        Sign in
                    </button>

                    {/* Portal divider: my-6 (24px). Dashboard was my-1 — layout mismatch fixed. */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t" style={{borderColor: 'var(--auth-card-border)'}}/>
                        </div>
                        <div className="relative flex justify-center" style={{fontSize: '0.875em'}}>
                            <span className="px-2" style={{background: 'var(--auth-card-background)', color: 'var(--auth-text-muted)'}}>Or</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Portal SSO button: auth-secondary-button + font-medium (500 hardcoded) */}
                        {SECONDARY_ACTIONS.map((action) => (
                            <button
                                key={action.label}
                                type="button"
                                className="relative flex h-12 w-full items-center justify-center px-4"
                                style={{
                                    background: 'var(--auth-card-background)',
                                    color: 'var(--auth-text-secondary)',
                                    border: `var(--auth-border-width) solid var(--auth-input-border)`,
                                    borderRadius: 'var(--auth-card-radius)',
                                    fontSize: '0.875em',
                                    fontWeight: 500,
                                }}
                            >
                                <span
                                    className="absolute left-4 flex h-6 w-6 items-center justify-center rounded-full"
                                    style={{
                                        background: 'color-mix(in srgb, var(--auth-button-background) 14%, white)',
                                        color: 'var(--auth-icon-color)',
                                    }}
                                >
                                    {action.glyph}
                                </span>
                                <span>{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </AuthPreviewCard>
            <PreviewFooter/>
        </div>
    );

    const renderConsentPreview = () => (
        <div className={`w-full ${previewCardMaxWidthClassName}`}>
            <AuthPreviewCard previewCardStyle={previewCardStyle} previewCardPaddingClassName={previewCardPaddingClassName}>
                <div className="mb-2 flex justify-center text-center">
                    <PreviewLogo portalTheme={portalPreviewTheme} mascotSrc={mascotSrc}/>
                </div>

                <div className="mb-6 text-center">
                    <h2
                        className="mb-2"
                        style={{
                            color: 'var(--auth-text-primary)',
                            fontSize: '1.5em',
                            fontWeight: 'var(--auth-font-weight-bold)',
                            lineHeight: '1.3',
                        }}
                    >
                        App access request
                    </h2>
                    <p style={{color: 'var(--auth-text-secondary)', fontSize: '0.875em'}}>
                        {/* Portal: clientName in auth-emphasis + font-semibold (600 hardcoded) */}
                        <span style={{color: 'var(--auth-text-primary)', fontWeight: 600}}>
                            {portalPreviewTheme.logo.alt}
                        </span>{' '}
                        wants access to your account
                    </p>
                    {tenantBadgeVisible ? (
                        // Portal: auth-badge uses font-medium (500 hardcoded)
                        <div
                            className="mt-3 inline-flex items-center rounded-full px-3 py-1.5"
                            style={{
                                background: 'var(--auth-surface-subtle)',
                                color: 'var(--auth-text-secondary)',
                                fontSize: '0.75em',
                                fontWeight: 500,
                            }}
                        >
                            {brandingState?.tenantId || selectedTenantId}
                        </div>
                    ) : null}
                </div>

                <div className="mb-6 flex items-center justify-center">
                    <div
                        className="inline-flex items-center gap-3 px-4 py-2.5"
                        style={{
                            background: 'var(--auth-surface-subtle)',
                            color: 'var(--auth-text-primary)',
                            border: `var(--auth-border-width) solid var(--auth-card-border)`,
                            borderRadius: 'var(--auth-card-radius)',
                        }}
                    >
                        <div
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{
                                background: 'color-mix(in srgb, var(--auth-button-background) 14%, white)',
                                color: 'var(--auth-icon-color)',
                            }}
                        >
                            <User className="h-5 w-5"/>
                        </div>
                        {/* Portal: auth-emphasis + font-medium (500 hardcoded) */}
                        <span style={{fontSize: '0.875em', fontWeight: 500}}>alex@tenant.example</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        {/* Portal: auth-label + font-medium (500 hardcoded) */}
                        <p style={{color: 'var(--auth-text-secondary)', fontSize: '0.875em', fontWeight: 500}}>Select permissions</p>
                        <div
                            className="overflow-hidden"
                            style={{
                                border: `var(--auth-border-width) solid var(--auth-card-border)`,
                                borderRadius: 'var(--auth-card-radius)',
                            }}
                        >
                            {CONSENT_SCOPE_ROWS.map((scope, index) => {
                                const Icon = scope.icon;
                                return (
                                    <div
                                        key={scope.label}
                                        className="flex items-center gap-4 p-4"
                                        style={{
                                            borderTop: index === 0 ? 'none' : `var(--auth-border-width) solid var(--auth-card-border)`,
                                            background: 'var(--auth-card-background)',
                                        }}
                                    >
                                        <span
                                            className="h-5 w-5 rounded"
                                            style={{
                                                background: 'var(--auth-button-background)',
                                                boxShadow: 'inset 0 0 0 1px var(--auth-button-background)',
                                            }}
                                        />
                                        <div className="flex flex-1 items-center gap-3">
                                            <div
                                                className="flex h-9 w-9 items-center justify-center rounded-lg"
                                                style={{
                                                    background: 'var(--auth-surface-subtle)',
                                                    color: 'var(--auth-icon-color)',
                                                }}
                                            >
                                                <Icon className="h-5 w-5"/>
                                            </div>
                                            {/* Portal: <span className="font-medium"> → 500 hardcoded */}
                                            <span style={{color: 'var(--auth-text-secondary)', fontSize: '0.875em', fontWeight: 500}}>{scope.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Portal: py-2 on remember row */}
                    <div className="flex items-center space-x-3 py-2">
                        <span
                            className="h-5 w-5 rounded border"
                            style={{
                                borderColor: 'var(--auth-input-border)',
                                background: 'var(--auth-card-background)',
                            }}
                        />
                        <span style={{color: 'var(--auth-text-muted)', fontSize: '0.875em'}}>Remember this decision</span>
                    </div>

                    {/* Portal: pt-4 on action buttons area */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        {/* Portal: auth-secondary-button + font-semibold (600 hardcoded) */}
                        <button
                            type="button"
                            className="h-11 px-6"
                            style={{
                                background: 'var(--auth-card-background)',
                                color: 'var(--auth-text-secondary)',
                                border: `var(--auth-border-width) solid var(--auth-input-border)`,
                                borderRadius: 'var(--auth-card-radius)',
                                fontSize: '0.875em',
                                fontWeight: 600,
                            }}
                        >
                            Cancel
                        </button>
                        {/* Portal: auth-primary-button + font-semibold (600 hardcoded) */}
                        <button
                            type="button"
                            className="h-11 px-6"
                            style={{
                                background: 'var(--auth-button-background)',
                                color: 'var(--auth-button-text)',
                                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                                borderRadius: 'var(--auth-card-radius)',
                                fontSize: '0.875em',
                                fontWeight: 600,
                            }}
                        >
                            Allow
                        </button>
                    </div>
                </div>
            </AuthPreviewCard>
            <PreviewFooter/>
        </div>
    );

    const renderSectionControls = () => {
        if (selectedSection === 'colors') {
            return (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold">Colors</h3>
                        <p className="text-xs text-muted-foreground">Core auth palette.</p>
                    </div>
                    <div className="grid gap-3">
                        {COLOR_FIELDS.map((field) => (
                            <div key={field.key} className="grid grid-cols-[88px_52px_minmax(0,1fr)] items-center gap-2">
                                <label className="text-xs font-medium text-foreground">{field.label}</label>
                                <input
                                    type="color"
                                    className="h-9 w-12 rounded-md border border-input bg-transparent p-1"
                                    value={getNestedValue(editableTheme, ['colors', field.key]) || '#000000'}
                                    onChange={(event) => updateThemeField(['colors', field.key], event.target.value)}
                                />
                                <Input
                                    value={getNestedValue(editableTheme, ['colors', field.key]) || ''}
                                    onChange={(event) => updateThemeField(['colors', field.key], event.target.value)}
                                    placeholder="#000000"
                                    className="h-9"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (selectedSection === 'fonts') {
            return (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold">Fonts</h3>
                        <p className="text-xs text-muted-foreground">Stored branding typography values.</p>
                    </div>
                    <div className="grid gap-3">
                        {FONT_FIELDS.map((field) => (
                            <FieldGroup key={field.key} label={field.label}>
                                <Input
                                    type={field.type}
                                    min={field.min}
                                    max={field.max}
                                    step={field.step}
                                    value={getNestedValue(editableTheme, ['fonts', field.key]) || ''}
                                    onChange={(event) => updateThemeField(['fonts', field.key], event.target.value)}
                                    placeholder={field.placeholder}
                                    className="h-9"
                                />
                            </FieldGroup>
                        ))}
                    </div>
                </div>
            );
        }

        if (selectedSection === 'borders') {
            return (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold">Borders</h3>
                        <p className="text-xs text-muted-foreground">Stored border radius and width values.</p>
                    </div>
                    <div className="grid gap-3">
                        {BORDER_FIELDS.map((field) => (
                            <FieldGroup key={field.key} label={field.label}>
                                <Input
                                    type={field.type}
                                    min={field.min}
                                    max={field.max}
                                    step={field.step}
                                    value={getNestedValue(editableTheme, ['borders', field.key]) || ''}
                                    onChange={(event) => updateThemeField(['borders', field.key], event.target.value)}
                                    className="h-9"
                                />
                            </FieldGroup>
                        ))}
                    </div>
                </div>
            );
        }

        if (selectedSection === 'widget') {
            return (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold">Widget</h3>
                        <p className="text-xs text-muted-foreground">Brand assets and copy.</p>
                    </div>
                    <div className="grid gap-3">
                        {WIDGET_FIELDS.map((field) => (
                            <FieldGroup key={field.key} label={field.label}>
                                <Input
                                    value={getNestedValue(editableTheme, ['widget', field.key]) || ''}
                                    onChange={(event) => updateThemeField(['widget', field.key], event.target.value)}
                                    placeholder={field.placeholder}
                                    className="h-9"
                                />
                            </FieldGroup>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-base font-semibold">Background</h3>
                    <p className="text-xs text-muted-foreground">Shared auth shell backdrop.</p>
                </div>
                <FieldGroup label="Background Type">
                    <Select
                        value={pageBackgroundType}
                        onValueChange={(value) => updateThemeField(['page_background', 'type'], value)}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select Background Type"/>
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_BACKGROUND_TYPES.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FieldGroup>
                <FieldGroup
                    label="Background Value"
                    hint={pageBackgroundValueHint}
                >
                    <Input
                        value={getNestedValue(editableTheme, ['page_background', 'value']) || ''}
                        onChange={(event) => updateThemeField(['page_background', 'value'], event.target.value)}
                        placeholder={pageBackgroundValuePlaceholder}
                        className="h-9"
                    />
                </FieldGroup>
            </div>
        );
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="branding-page">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">Branding</h1>
                    <Palette className="h-6 w-6 text-primary"/>
                </div>
                <p className="text-sm text-muted-foreground">
                    Design tenant branding visually and publish backend-managed theme updates.
                </p>
            </div>

            {!selectedTenantId && !loadingBranding ? (
                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardContent className="py-12 text-center space-y-4">
                        <Palette className="mx-auto h-10 w-10 text-muted-foreground"/>
                        {hasTenants ? (
                            <>
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold">Select a Tenant to Begin</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Choose which tenant branding you want to manage.
                                    </p>
                                </div>
                                <div className="mx-auto w-full max-w-sm">
                                    <Select
                                        value={selectedTenantId}
                                        onValueChange={setSelectedTenantId}
                                        disabled={loadingTenants || Boolean(actionLoading)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={loadingTenants ? 'Loading tenants...' : 'Select Tenant'}/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenants.map((tenant) => (
                                                <SelectItem key={tenant.id} value={tenant.id}>
                                                    {tenant.display_name || tenant.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold">No Tenants Found</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Create a tenant before managing branding.
                                    </p>
                                </div>
                                <div className="flex justify-center">
                                    <Button onClick={handleCreateTenant}>
                                        Create Tenant
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : null}

            <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                <CardContent className="p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-2 py-2">
                                <Select
                                    value={selectedTenantId}
                                    onValueChange={setSelectedTenantId}
                                    disabled={loadingTenants || Boolean(actionLoading) || !hasTenants}
                                >
                                <SelectTrigger className="w-[230px]">
                                    <SelectValue placeholder={
                                        loadingTenants
                                            ? 'Loading tenants...'
                                            : hasTenants
                                                ? 'Select Tenant'
                                                : 'No Tenants'
                                    }/>
                                </SelectTrigger>
                                <SelectContent>
                                    {tenants.map((tenant) => (
                                        <SelectItem key={tenant.id} value={tenant.id}>
                                            {tenant.display_name || tenant.name}
                                        </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                    {hasTenants ? (
                                        <Button variant="outline" size="sm" onClick={handleCreateTenant}>
                                            Create
                                        </Button>
                                    ) : (
                                        <Button onClick={handleCreateTenant}>
                                            Create Tenant
                                        </Button>
                                    )}
                                </div>

                                <Badge variant="outline" className={stateSummary.className}>
                                    {stateSummary.label}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={parsedDraftResult.error
                                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}
                                >
                                    {parsedDraftResult.error ? 'JSON Invalid' : 'JSON Valid'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {hasDraftBranding ? 'Draft present' : 'Using defaults'}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-2 py-1.5">
                                    <Button
                                        variant="outline"
                                        onClick={() => selectedTenantId && fetchBrandingState(selectedTenantId)}
                                        disabled={!selectedTenantId || isBusy}
                                    >
                                        <RefreshCw className={`mr-2 h-4 w-4 ${loadingBranding ? 'animate-spin' : ''}`}/>
                                        Refresh
                                    </Button>
                                    <Button onClick={handleSaveDraft} disabled={isBusy || saveBlockedByInvalidJson || !selectedTenantId}>
                                        <Save className="mr-2 h-4 w-4"/>
                                        {actionLoading === 'save-draft' ? 'Saving...' : 'Save Draft'}
                                    </Button>
                                    <Button variant="secondary" onClick={handlePublish} disabled={isBusy || !selectedTenantId}>
                                        <Upload className="mr-2 h-4 w-4"/>
                                        {actionLoading === 'publish' ? 'Publishing...' : 'Publish'}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-2 py-1.5">
                                    <Select
                                        value={resetTarget}
                                        onValueChange={setResetTarget}
                                        disabled={isBusy || !selectedTenantId}
                                    >
                                        <SelectTrigger className="h-9 w-[170px]">
                                            <SelectValue placeholder="Reset Target"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RESET_TARGETS.map((target) => (
                                                <SelectItem key={target.value} value={target.value}>
                                                    {target.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" disabled={isBusy || !selectedTenantId}>
                                                <RotateCcw className="mr-2 h-4 w-4"/>
                                                Actions
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 rounded-xl">
                                            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                                                Secondary Actions
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleDiscard} disabled={isBusy || !selectedTenantId}>
                                                <Undo2 className="mr-2 h-4 w-4"/>
                                                Discard Draft
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={openResetConfirmation}
                                                disabled={isBusy || !selectedTenantId}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <RotateCcw className="mr-2 h-4 w-4"/>
                                                Reset Branding
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        <span>Publish is required before portal runtime uses draft changes.</span>
                        <span>Missing keys still fall back to canonical defaults.</span>
                        {brandingState ? <span>Updated {formatDateTime(brandingState.updatedAt)}</span> : null}
                        {brandingState?.publishedAt ? <span>Published {formatDateTime(brandingState.publishedAt)}</span> : null}
                    </div>
                </CardContent>
            </Card>

            {selectedTenantId || loadingTenants ? (
                null
            ) : null}

            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{resetConfirmationTitle}</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>{resetConfirmationDescription}</p>
                            <p>
                                Reset target: <span className="font-medium text-foreground">{selectedResetTarget?.label || resetTarget}</span>
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading === 'reset'}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReset}
                            disabled={actionLoading === 'reset' || !selectedTenantId}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {actionLoading === 'reset' ? 'Resetting...' : 'Confirm Reset'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {loadingBranding ? (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                </div>
            ) : null}

            {loadError ? (
                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardContent className="py-8 space-y-4">
                        <Alert variant="destructive">
                            <AlertTitle>Branding Could Not Be Loaded</AlertTitle>
                            <AlertDescription>{loadError}</AlertDescription>
                        </Alert>
                        <div className="rounded-xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
                            Refresh and confirm the tenant state before making changes.
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {!loadError && selectedTenantId ? (
                <>
                    <div className="grid gap-5 xl:grid-cols-[140px_minmax(0,1.7fr)_minmax(300px,0.95fr)]">
                        <Card className="bg-card/25 backdrop-blur-sm border-border/30 xl:sticky xl:top-20 h-fit">
                            <CardContent className="p-3 space-y-1">
                                {EDITOR_SECTIONS.map((section) => {
                                    const Icon = section.icon;
                                    const isActive = selectedSection === section.id;

                                    return (
                                        <button
                                            key={section.id}
                                            type="button"
                                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                                                isActive
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                                            }`}
                                            onClick={() => setSelectedSection(section.id)}
                                        >
                                            <Icon className="h-4 w-4"/>
                                            <span>{section.label}</span>
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        <Card className="bg-card/40 backdrop-blur-sm border-border/40 overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-lg">Auth Preview</CardTitle>
                                    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 p-1">
                                        {PREVIEW_MODES.map((mode) => (
                                            <Button
                                                key={mode.value}
                                                type="button"
                                                variant={previewMode === mode.value ? 'secondary' : 'ghost'}
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => setPreviewMode(mode.value)}
                                            >
                                                {mode.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <CompactHint>
                                    Portal-style preview from the current draft theme.
                                </CompactHint>
                                <div
                                    className={`rounded-[32px] border border-border/50 ${previewShellClassName} overflow-hidden`}
                                    style={{
                                        ...previewShellStyle,
                                        fontFamily: 'var(--auth-font-family)',
                                        fontWeight: 'var(--auth-font-weight-normal)',
                                    }}
                                >
                                    {previewMode === 'login' ? (
                                        <div className="flex h-full items-start justify-center">{renderLoginPreview()}</div>
                                    ) : (
                                        <div className="flex h-full items-start justify-center">{renderConsentPreview()}</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">{EDITOR_SECTIONS.find((section) => section.id === selectedSection)?.label}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {renderSectionControls()}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <details className="rounded-xl border border-border/40 bg-card/20 px-4 py-3">
                            <summary className="cursor-pointer text-sm font-medium text-foreground">Advanced JSON</summary>
                            <div className="mt-4 space-y-4">
                                <div className="rounded-xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground space-y-2">
                                    <p className="font-medium text-foreground">Expected Top-Level Keys</p>
                                    <p>{BRANDING_SCHEMA_KEYS.join(', ')}</p>
                                    <p>Missing keys may still resolve through canonical backend/runtime defaults.</p>
                                </div>
                                {parsedDraftResult.error ? (
                                    <Alert variant="destructive">
                                        <AlertTitle>Draft JSON Validation Error</AlertTitle>
                                        <AlertDescription>
                                            {parsedDraftResult.error}. Save is blocked until the JSON is valid. The previews are showing the last valid draft state.
                                        </AlertDescription>
                                    </Alert>
                                ) : null}
                                <JsonEditor
                                    value={draftJson}
                                    onChange={setDraftJson}
                                    height="420px"
                                    placeholder="{}"
                                    testId="branding-draft-editor"
                                />
                            </div>
                        </details>

                        <details className="rounded-xl border border-border/40 bg-card/20 px-4 py-3">
                            <summary className="cursor-pointer text-sm font-medium text-foreground">Published JSON</summary>
                            <div className="mt-4 space-y-3">
                                <CompactHint>
                                    Read-only published state. Missing keys still fall back to defaults.
                                </CompactHint>
                                <Textarea
                                    readOnly
                                    value={publishedJson}
                                    className="min-h-[220px] font-mono text-xs"
                                    data-testid="branding-published-preview"
                                />
                            </div>
                        </details>

                        <details className="rounded-xl border border-border/40 bg-card/20 px-4 py-3">
                            <summary className="cursor-pointer text-sm font-medium text-foreground">Runtime and Reset Notes</summary>
                            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                                {RESET_TARGETS.map((target) => (
                                    <p key={target.value}>
                                        <span className="font-medium text-foreground">{target.label}:</span> {target.description}
                                    </p>
                                ))}
                                {selectedResetTarget ? (
                                    <p>
                                        <span className="font-medium text-foreground">Current selection:</span> {selectedResetTarget.description}
                                    </p>
                                ) : null}
                                <p>{effectivePublishedExplanation}</p>
                            </div>
                        </details>
                    </div>
                </>
            ) : null}
        </div>
    );
}
