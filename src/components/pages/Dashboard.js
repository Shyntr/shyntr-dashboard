import {useEffect, useState, useMemo, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    AppWindow,
    Link2,
    Building2,
    Shield,
    Clock,
    ArrowRight,
    GlobeLock,
    KeyRound,
    RefreshCw,
    Server,
    BarChart3,
    AlertCircle,
    ShieldAlert,
    ListFilter,
    Fingerprint,
    Shuffle,
    ArrowRightLeft,
    Repeat
} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Button} from '../ui/button';
import {
    getDashboardStats,
    getLDAPConnections,
    getOIDCConnections,
    getSAMLConnections,
    getDashboardAuthActivity,
    getDashboardAuthFailures,
    getDashboardRoutingInsights,
    getHealthSummary
} from '../../lib/api';
import {toast} from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {ActivityTypeBadge} from "@/components/shared/ActivityTypeBadge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const COLORS = {
    oidc: '#14b8a6', // teal-500
    saml: '#f97316', // orange-500
    ldap: '#0ea5e9', // sky-500
    failure: '#ef4444' // red-500
};

const DEFAULT_STATS = {
    total_oidc_clients: 0,
    total_saml_clients: 0,
    total_saml_connections: 0,
    total_oidc_connections: 0,
    total_tenants: 1,
    public_clients: 0,
    confidential_clients: 0,
    recent_activity: []
};

const DEFAULT_CONNECTION_COUNTS = {
    oidc: 0,
    saml: 0,
    ldap: 0
};

const DEFAULT_AUTH_ACTIVITY = {
    protocols: {
        oidc: { success: 0, failure: 0 },
        saml: { success: 0, failure: 0 },
        ldap: { success: 0, failure: 0 }
    },
    totals: {
        success: 0,
        failure: 0
    }
};

const DEFAULT_AUTH_FAILURES = {
    totals: { failure: 0 },
    reasons: [],
    protocols: {
        oidc: { failure: 0, top_reason: 'none' },
        saml: { failure: 0, top_reason: 'none' },
        ldap: { failure: 0, top_reason: 'none' }
    }
};

const DEFAULT_ROUTING_INSIGHTS = {
    transitions: [],
    totals: {
        routed: 0,
        same_protocol: 0
    }
};

const DEFAULT_HEALTH_SUMMARY = {
    status: 'ok',
    checks: {
        database: 'ok',
        signing_keys: 'ok',
        migrations: 'ok'
    }
};

const normalizeReason = (key) => {
    if (!key || key === 'none') return 'N/A';
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

function StatCard({icon: Icon, title, value, description, color, onClick}) {
    return (
        <Card
            className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-primary/30 transition-colors duration-300 cursor-pointer"
            onClick={onClick}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold font-heading">{value}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
                        <Icon className="h-6 w-6 text-white" strokeWidth={1.5}/>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CustomTooltip({active, payload, label}) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-lg p-3 shadow-xl">
                <p className="font-medium text-foreground mb-2 border-b border-border/40 pb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}} />
                            <span className="text-muted-foreground">{entry.name}:</span>
                        </div>
                        <span className="text-foreground font-medium">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

function ProtocolCountRow({label, value, color}) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-3">
            <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: color}}/>
                <span className="text-sm text-foreground">{label}</span>
            </div>
            <span className="text-lg font-semibold font-heading">{value}</span>
        </div>
    );
}

function ActivityProtocolBadge({protocol}) {
    const normalizedProtocol = protocol?.toLowerCase?.() || 'oidc';
    const styles = normalizedProtocol === 'ldap'
        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
        : normalizedProtocol === 'saml'
            ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
            : 'bg-teal-500/15 text-teal-400 border-teal-500/30';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
            {normalizedProtocol.toUpperCase()}
        </span>
    );
}

const getActivityProtocol = (activity) => {
    const protocolValue = [
        activity?.protocol,
        activity?.provider_protocol,
        activity?.connection_protocol,
        activity?.provider_type,
        activity?.connection_type,
        activity?.auth_protocol,
        activity?.type
    ].find((value) => typeof value === 'string' && value.length > 0);

    if (protocolValue) {
        const normalized = protocolValue.toLowerCase();
        if (normalized.includes('ldap')) return 'ldap';
        if (normalized.includes('saml')) return 'saml';
        if (normalized.includes('oidc') || normalized.includes('openid')) return 'oidc';
    }

    if (activity?.saml_request_id) {
        return 'saml';
    }

    return 'oidc';
};

export function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(DEFAULT_STATS);
    const [connectionCounts, setConnectionCounts] = useState(DEFAULT_CONNECTION_COUNTS);
    const [authActivity, setAuthActivity] = useState(DEFAULT_AUTH_ACTIVITY);
    const [authFailures, setAuthFailures] = useState(DEFAULT_AUTH_FAILURES);
    const [routingInsights, setRoutingInsights] = useState(DEFAULT_ROUTING_INSIGHTS);
    const [healthSummary, setHealthSummary] = useState(DEFAULT_HEALTH_SUMMARY);
    const [range, setRange] = useState('24h');
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState(null);
    const [failuresLoading, setFailuresLoading] = useState(false);
    const [failuresError, setFailuresError] = useState(null);
    const [routingLoading, setRoutingLoading] = useState(false);
    const [routingError, setRoutingError] = useState(null);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);

        const [statsResult, oidcResult, samlResult, ldapResult, healthResult] = await Promise.allSettled([
            getDashboardStats(),
            getOIDCConnections(),
            getSAMLConnections(),
            getLDAPConnections(),
            getHealthSummary()
        ]);

        if (statsResult.status === 'fulfilled') {
            setStats(statsResult.value.data || DEFAULT_STATS);
        } else {
            toast.error(statsResult.reason?.message || 'Failed to load dashboard stats');
        }

        if (healthResult.status === 'fulfilled') {
            setHealthSummary(healthResult.value.data || DEFAULT_HEALTH_SUMMARY);
        } else {
            console.error('Failed to load health summary:', healthResult.reason);
            // We don't toast here as it's a secondary check
        }

        const nextConnectionCounts = {
            oidc: oidcResult.status === 'fulfilled' ? (oidcResult.value.data || []).length : 0,
            saml: samlResult.status === 'fulfilled' ? (samlResult.value.data || []).length : 0,
            ldap: ldapResult.status === 'fulfilled' ? (ldapResult.value.data || []).length : 0,
        };
        setConnectionCounts(nextConnectionCounts);

        const secondaryErrors = [
            oidcResult.status === 'rejected' ? oidcResult.reason : null,
            samlResult.status === 'rejected' ? samlResult.reason : null,
            ldapResult.status === 'rejected' ? ldapResult.reason : null,
        ].filter(Boolean);

        if (secondaryErrors.length === 1) {
            toast.error(secondaryErrors[0]?.message || 'Failed to load one connection count');
        } else if (secondaryErrors.length > 1) {
            toast.error('Failed to load some connection counts');
        }

        setLoading(false);
    }, []);

    const fetchAuthActivity = useCallback(async () => {
        setActivityLoading(true);
        setActivityError(null);
        try {
            const response = await getDashboardAuthActivity(range);
            setAuthActivity(response.data || DEFAULT_AUTH_ACTIVITY);
        } catch (error) {
            console.error('Failed to fetch auth activity:', error);
            setActivityError(error.message || 'Failed to load activity metrics');
            // We don't toast here to avoid breaking the full dashboard experience as per requirement 6
        } finally {
            setActivityLoading(false);
        }
    }, [range]);

    const fetchAuthFailures = useCallback(async () => {
        setFailuresLoading(true);
        setFailuresError(null);
        try {
            const response = await getDashboardAuthFailures(range);
            setAuthFailures(response.data || DEFAULT_AUTH_FAILURES);
        } catch (error) {
            console.error('Failed to fetch auth failures:', error);
            setFailuresError(error.message || 'Failed to load failure metrics');
        } finally {
            setFailuresLoading(false);
        }
    }, [range]);

    const fetchRoutingInsights = useCallback(async () => {
        setRoutingLoading(true);
        setRoutingError(null);
        try {
            const response = await getDashboardRoutingInsights(range);
            setRoutingInsights(response.data || DEFAULT_ROUTING_INSIGHTS);
        } catch (error) {
            console.error('Failed to fetch routing insights:', error);
            setRoutingError(error.message || 'Failed to load routing insights');
        } finally {
            setRoutingLoading(false);
        }
    }, [range]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        fetchAuthActivity();
    }, [fetchAuthActivity]);

    useEffect(() => {
        fetchAuthFailures();
    }, [fetchAuthFailures]);

    useEffect(() => {
        fetchRoutingInsights();
    }, [fetchRoutingInsights]);

    const authActivityData = useMemo(() => {
        if (!authActivity?.protocols) return [];
        return [
            {
                name: 'OIDC',
                success: authActivity.protocols.oidc?.success || 0,
                failure: authActivity.protocols.oidc?.failure || 0,
                color: COLORS.oidc
            },
            {
                name: 'SAML',
                success: authActivity.protocols.saml?.success || 0,
                failure: authActivity.protocols.saml?.failure || 0,
                color: COLORS.saml
            },
            {
                name: 'LDAP',
                success: authActivity.protocols.ldap?.success || 0,
                failure: authActivity.protocols.ldap?.failure || 0,
                color: COLORS.ldap
            }
        ];
    }, [authActivity]);

    const hasActivity = useMemo(() => {
        return authActivityData.some(d => d.success > 0 || d.failure > 0);
    }, [authActivityData]);

    const highestReason = useMemo(() => {
        if (!authFailures?.reasons?.length) return 'none';
        return authFailures.reasons.reduce((prev, current) => (prev.count > current.count) ? prev : current).key;
    }, [authFailures]);

    const totalClients = stats.total_oidc_clients + stats.total_saml_clients;
    const totalConnections = connectionCounts.oidc + connectionCounts.saml + connectionCounts.ldap;

    const getHealthColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'ok': return 'bg-emerald-600';
            case 'degraded': return 'bg-orange-500';
            case 'error': return 'bg-red-600';
            default: return 'bg-emerald-600';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-8 space-y-8 animate-fade-in h-full" data-testid="dashboard-loading">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
                        Control Plane
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Protocol-agnostic identity routing at a glance
                    </p>
                </div>

                <div className="flex items-center justify-center py-24 h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground"/>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="dashboard-page">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
                    Control Plane
                </h1>
                <p className="text-sm text-muted-foreground">
                    Protocol-agnostic identity routing at a glance
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={AppWindow}
                    title="Applications"
                    value={totalClients}
                    description={`${stats.total_oidc_clients} OIDC, ${stats.total_saml_clients} SAML`}
                    color="bg-blue-600"
                    onClick={() => navigate('/applications/oidc')}
                />
                <StatCard
                    icon={Link2}
                    title="Connections"
                    value={totalConnections}
                    description={`${connectionCounts.oidc} OIDC, ${connectionCounts.saml} SAML, ${connectionCounts.ldap} LDAP`}
                    color="bg-violet-600"
                    onClick={() => navigate('/connections/oidc')}
                />
                <StatCard
                    icon={Building2}
                    title="Tenants"
                    value={stats.total_tenants}
                    description="Isolation zones"
                    color="bg-emerald-600"
                    onClick={() => navigate('/tenants')}
                />
                <TooltipProvider delayDuration={0}>
                    <UITooltip>
                        <TooltipTrigger asChild>
                            <div>
                                <StatCard
                                    icon={Shield}
                                    title="Health"
                                    value={healthSummary.status?.toUpperCase() || 'OK'}
                                    description={healthSummary.status === 'ok' ? "All systems operational" : "System issues detected"}
                                    color={getHealthColor(healthSummary.status)}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-card/95 backdrop-blur-xl border border-border/40 p-3 shadow-xl text-foreground">
                            <div className="space-y-2 min-w-[140px]">
                                <p className="font-medium text-xs border-b border-border/40 pb-1.5 mb-1.5 uppercase tracking-wider">Health Checks</p>
                                {Object.entries(healthSummary.checks || {}).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between gap-4 text-[10px]">
                                        <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}:</span>
                                        <span className={val === 'ok' ? "text-emerald-500 font-bold" : "text-red-500 font-bold"}>
                                            {val?.toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                                {healthSummary.generated_at && (
                                    <p className="text-[8px] text-muted-foreground italic border-t border-border/20 pt-1 mt-1">
                                        Last checked: {new Date(healthSummary.generated_at).toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </TooltipContent>
                    </UITooltip>
                </TooltipProvider>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/40 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                        <CardTitle className="flex items-center gap-2 font-heading">
                            <BarChart3 className="h-5 w-5 text-primary"/>
                            Authentication Activity
                        </CardTitle>
                        <Select value={range} onValueChange={setRange} disabled={activityLoading}>
                            <SelectTrigger className="w-[100px] bg-background/50 border-border/40">
                                <SelectValue placeholder="Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1h">Last hour</SelectItem>
                                <SelectItem value="24h">Last 24h</SelectItem>
                                <SelectItem value="7d">Last 7 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent>
                        {activityLoading ? (
                            <div className="h-[300px] flex items-center justify-center">
                                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/50"/>
                            </div>
                        ) : activityError ? (
                            <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
                                <AlertCircle className="h-10 w-10 text-destructive/50 mb-4" />
                                <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
                                    Metrics unavailable
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                                    {activityError}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchAuthActivity}
                                    className="border-border/40 hover:bg-muted/50"
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : hasActivity ? (
                            <>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={authActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" vertical={false}/>
                                            <XAxis
                                                dataKey="name"
                                                stroke="hsl(215, 20%, 65%)"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                stroke="hsl(215, 20%, 65%)"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                                content={<CustomTooltip/>}
                                            />
                                            <Legend
                                                verticalAlign="top"
                                                align="right"
                                                iconType="circle"
                                                wrapperStyle={{ paddingTop: '0', paddingBottom: '20px', fontSize: '12px' }}
                                            />
                                            <Bar
                                                dataKey="success"
                                                name="Success"
                                                stackId="a"
                                                radius={[0, 0, 0, 0]}
                                            >
                                                {authActivityData.map((entry, index) => (
                                                    <Cell key={`cell-success-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                            <Bar
                                                dataKey="failure"
                                                name="Failure"
                                                stackId="a"
                                                radius={[4, 4, 0, 0]}
                                                fill={COLORS.failure}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center justify-center gap-8 pt-4 border-t border-border/40 mt-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Success</span>
                                        <span className="text-xl font-bold text-teal-500 font-heading">{authActivity.totals?.success || 0}</span>
                                    </div>
                                    <div className="w-px h-8 bg-border/40" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Failure</span>
                                        <span className="text-xl font-bold text-destructive font-heading">{authActivity.totals?.failure || 0}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-6">
                                    <BarChart3 className="h-8 w-8 text-muted-foreground" strokeWidth={1.5}/>
                                </div>
                                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                                    No authentication activity
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-md mb-6">
                                    No authentication activity in the selected range ({range === '1h' ? 'last hour' : range === '24h' ? 'last 24h' : 'last 7 days'}).
                                </p>
                                <Button
                                    onClick={() => navigate('/connections/oidc')}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                                >
                                    Check Connections
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardHeader>
                        <CardTitle className="font-heading">Connections</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Configured Total</p>
                            <p className="text-2xl font-bold font-heading mt-1">{totalConnections}</p>
                        </div>
                        <ProtocolCountRow label="OIDC Providers" value={connectionCounts.oidc} color={COLORS.oidc}/>
                        <ProtocolCountRow label="SAML Providers" value={connectionCounts.saml} color={COLORS.saml}/>
                        <ProtocolCountRow label="LDAP Providers" value={connectionCounts.ldap} color={COLORS.ldap}/>
                    </CardContent>
                </Card>
            </div>

            {/* Failure Intelligence Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-[0.1em]">
                            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                            Failure Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {failuresLoading ? (
                            <div className="h-20 flex items-center justify-center">
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground/30"/>
                            </div>
                        ) : failuresError ? (
                            <div className="h-20 flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive/50" />
                                <Button variant="ghost" size="sm" onClick={fetchAuthFailures} className="h-6 text-[10px]">Retry</Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold font-heading text-destructive leading-none">
                                        {authFailures.totals?.failure || 0}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">Failures</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-border/20">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Top Overall Reason</p>
                                    <p className="text-xs font-semibold text-foreground truncate">{normalizeReason(highestReason)}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-[0.1em]">
                            <ListFilter className="h-3.5 w-3.5 text-primary" />
                            Top Root Causes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {failuresLoading ? (
                            <div className="h-20 flex items-center justify-center">
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground/30"/>
                            </div>
                        ) : failuresError ? (
                            <div className="h-20 flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive/50" />
                                <Button variant="ghost" size="sm" onClick={fetchAuthFailures} className="h-6 text-[10px]">Retry</Button>
                            </div>
                        ) : authFailures.reasons?.length > 0 ? (
                            <div className="space-y-2.5">
                                {authFailures.reasons.slice(0, 3).map((r, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-muted-foreground truncate flex-1">{normalizeReason(r.key)}</span>
                                        <span className="text-xs font-bold text-foreground bg-muted/30 px-1.5 rounded min-w-[20px] text-center">{r.count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-20 flex items-center justify-center text-[10px] text-muted-foreground italic">
                                No authentication failures
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/40 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-[0.1em]">
                            <Fingerprint className="h-3.5 w-3.5 text-primary" />
                            Protocol Impact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {failuresLoading ? (
                            <div className="h-20 flex items-center justify-center">
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground/30"/>
                            </div>
                        ) : failuresError ? (
                            <div className="h-20 flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive/50" />
                                <Button variant="ghost" size="sm" onClick={fetchAuthFailures} className="h-6 text-[10px]">Retry</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-4 h-full">
                                {['oidc', 'saml', 'ldap'].map(p => (
                                    <div key={p} className="flex flex-col justify-between border-r last:border-0 border-border/10 pr-4 last:pr-0">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: COLORS[p]}} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{p}</span>
                                            </div>
                                            <p className="text-xl font-bold text-foreground mb-2">
                                                {authFailures.protocols?.[p]?.failure || 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-muted-foreground uppercase tracking-tight leading-tight">Top Reason</p>
                                            <p className="text-[10px] font-medium text-foreground truncate" title={normalizeReason(authFailures.protocols?.[p]?.top_reason)}>
                                                {normalizeReason(authFailures.protocols?.[p]?.top_reason)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Routing Insights Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-[0.1em]">
                            <Shuffle className="h-3.5 w-3.5 text-primary" />
                            Routing Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {routingLoading ? (
                            <div className="h-24 flex items-center justify-center">
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground/30"/>
                            </div>
                        ) : routingError ? (
                            <div className="h-24 flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive/50" />
                                <Button variant="ghost" size="sm" onClick={fetchRoutingInsights} className="h-6 text-[10px]">Retry</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Routed Auth Flows</p>
                                    <p className="text-2xl font-bold font-heading text-foreground">{routingInsights.totals?.routed || 0}</p>
                                    <div className="flex items-center gap-1">
                                        <ArrowRightLeft className="h-3 w-3 text-primary/50" />
                                        <span className="text-[9px] text-muted-foreground italic">Across protocols</span>
                                    </div>
                                </div>
                                <div className="space-y-1 border-l border-border/20 pl-4">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Same-Protocol</p>
                                    <p className="text-2xl font-bold font-heading text-foreground">{routingInsights.totals?.same_protocol || 0}</p>
                                    <div className="flex items-center gap-1">
                                        <Repeat className="h-3 w-3 text-teal-500/50" />
                                        <span className="text-[9px] text-muted-foreground italic">Direct pass</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 bg-card/40 backdrop-blur-sm border-border/40 hover:border-primary/20 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-[0.1em]">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                            Protocol Transitions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {routingLoading ? (
                            <div className="h-24 flex items-center justify-center">
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground/30"/>
                            </div>
                        ) : routingError ? (
                            <div className="h-24 flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive/50" />
                                <Button variant="ghost" size="sm" onClick={fetchRoutingInsights} className="h-6 text-[10px]">Retry</Button>
                            </div>
                        ) : routingInsights.transitions?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                {[...routingInsights.transitions]
                                    .sort((a, b) => b.count - a.count)
                                    .slice(0, 6)
                                    .map((t, i) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase w-8 text-primary/80">{t.from}</span>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                                                <span className="text-[10px] font-bold uppercase w-8 text-foreground">{t.to}</span>
                                            </div>
                                            <div className="flex items-center gap-3 flex-1 ml-4">
                                                <div className="h-1.5 flex-1 bg-muted/20 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary/40 group-hover:bg-primary/60 transition-all duration-500" 
                                                        style={{ width: `${Math.min(100, (t.count / (routingInsights.totals?.routed || 1)) * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono font-bold w-6 text-right">{t.count}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="h-24 flex items-center justify-center text-[10px] text-muted-foreground italic">
                                No routing activity in the selected range
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-heading">
                            <Clock className="h-5 w-5 text-primary"/>
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.recent_activity.length > 0 ? (
                            <div className="space-y-4">
                                {stats.recent_activity.map((activity, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <ActivityProtocolBadge protocol={getActivityProtocol(activity)}/>
                                            <ActivityTypeBadge type={activity.type || "activity"}/>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{activity.subject || 'Unknown subject'}</p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {activity.type?.replace('_', ' ') || 'activity'} {activity.status || ''}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {formatDate(activity.timestamp)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No authentication activity yet. Start by creating a connection or client.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-card/40 backdrop-blur-sm border-border/40">
                    <CardHeader>
                        <CardTitle className="font-heading">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => navigate('/applications/oidc')}
                        >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"/>
                Create OIDC Client
              </span>
                            <ArrowRight className="h-4 w-4"/>
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => navigate('/applications/saml')}
                        >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"/>
                Create SAML Client (SP)
              </span>
                            <ArrowRight className="h-4 w-4"/>
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => navigate('/connections/saml')}
                        >
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4"/>
                Add SAML Provider (IdP)
              </span>
                            <ArrowRight className="h-4 w-4"/>
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => navigate('/connections/oidc')}
                        >
              <span className="flex items-center gap-2">
                <GlobeLock className="h-4 w-4"/>
                Add OIDC Provider
              </span>
                            <ArrowRight className="h-4 w-4"/>
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => navigate('/connections/ldap')}
                        >
              <span className="flex items-center gap-2">
                <Server className="h-4 w-4"/>
                Add LDAP Provider
              </span>
                            <ArrowRight className="h-4 w-4"/>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
