import {useEffect, useState} from 'react';
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
    BarChart3
} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Button} from '../ui/button';
import {getDashboardStats, getLDAPConnections, getOIDCConnections, getSAMLConnections} from '../../lib/api';
import {toast} from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import {ActivityTypeBadge} from "@/components/shared/ActivityTypeBadge";

const COLORS = {
    oidc: '#14b8a6',
    saml: '#f97316',
    ldap: '#0ea5e9'
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
                <p className="font-medium text-foreground">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                        {entry.name}: <span className="text-foreground font-medium">{entry.value}</span>
                    </p>
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);

        const [statsResult, oidcResult, samlResult, ldapResult] = await Promise.allSettled([
            getDashboardStats(),
            getOIDCConnections(),
            getSAMLConnections(),
            getLDAPConnections()
        ]);

        if (statsResult.status === 'fulfilled') {
            setStats(statsResult.value.data || DEFAULT_STATS);
        } else {
            toast.error(statsResult.reason?.message || 'Failed to load dashboard stats');
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
    };

    const totalClients = stats.total_oidc_clients + stats.total_saml_clients;
    const totalConnections = connectionCounts.oidc + connectionCounts.saml + connectionCounts.ldap;

    const authSurfaceData = [
        {name: 'OIDC', value: connectionCounts.oidc, color: COLORS.oidc},
        {name: 'SAML', value: connectionCounts.saml, color: COLORS.saml},
        {name: 'LDAP', value: connectionCounts.ldap, color: COLORS.ldap}
    ];

    const hasConfiguredConnections = authSurfaceData.some((item) => item.value > 0);

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
            <div className="p-6 lg:p-8 space-y-8 animate-fade-in h-full" data-testid="dashboard-page">
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
                <StatCard
                    icon={Shield}
                    title="Health"
                    value="OK"
                    description="All systems operational"
                    color="bg-teal-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-heading">
                            <BarChart3 className="h-5 w-5 text-primary"/>
                            Configured Auth Surface
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {hasConfiguredConnections ? (
                            <>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={authSurfaceData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" vertical={false}/>
                                            <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12}/>
                                            <YAxis allowDecimals={false} stroke="hsl(215, 20%, 65%)" fontSize={12}/>
                                            <Tooltip content={<CustomTooltip/>}/>
                                            <Bar dataKey="value" name="Configured Connections" radius={[8, 8, 0, 0]}>
                                                {authSurfaceData.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color}/>
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-4 flex-wrap">
                                    {authSurfaceData.map((item) => (
                                        <div key={item.name} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}/>
                                            <span className="text-sm text-muted-foreground">
                                                {item.name}: <span className="text-foreground font-medium">{item.value}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[250px] flex flex-col items-center justify-center text-center px-6">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-6">
                                    <Link2 className="h-8 w-8 text-muted-foreground" strokeWidth={1.5}/>
                                </div>
                                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                                    No configured auth surface yet
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-md mb-6">
                                    Add an OIDC, SAML, or LDAP provider to expose real authentication paths across your tenants.
                                </p>
                                <Button
                                    onClick={() => navigate('/connections/oidc')}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                                    data-testid="configured-auth-surface-empty-action"
                                >
                                    Open Connections
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
                            data-testid="quick-action-oidc-client"
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
                            data-testid="quick-action-saml-client"
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
                            data-testid="quick-action-saml-connection"
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
                            data-testid="quick-action-oidc-connection"
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
                            data-testid="quick-action-ldap-connection"
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
