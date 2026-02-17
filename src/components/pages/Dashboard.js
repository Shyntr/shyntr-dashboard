import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppWindow, 
  Link2,
  Building2,
  Shield,
  TrendingUp,
  Clock,
  ArrowRight,
  GlobeLock,
  KeyRound
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ProtocolBadge } from '../shared/ProtocolBadge';
import { getDashboardStats } from '../../lib/api';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import {ActivityTypeBadge} from "@/components/shared/ActivityTypeBadge";

const COLORS = {
  oidc: '#14b8a6',  // teal-500
  saml: '#f97316',  // orange-500
  primary: 'hsl(224, 76%, 48%)',
  secondary: 'hsl(263, 70%, 58%)'
};

// Mock data for charts
const mockActivityData = [
  { name: 'Mon', oidc: 4, saml: 2 },
  { name: 'Tue', oidc: 3, saml: 1 },
  { name: 'Wed', oidc: 5, saml: 3 },
  { name: 'Thu', oidc: 2, saml: 2 },
  { name: 'Fri', oidc: 6, saml: 4 },
  { name: 'Sat', oidc: 4, saml: 2 },
  { name: 'Sun', oidc: 3, saml: 1 },
];

function StatCard({ icon: Icon, title, value, description, color, onClick }) {
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
            <Icon className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }) {
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

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_oidc_clients: 0,
    total_saml_clients: 0,
    total_saml_connections: 0,
    total_oidc_connections: 0,
    total_tenants: 1,
    public_clients: 0,
    confidential_clients: 0,
    recent_activity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const totalClients = stats.total_oidc_clients + stats.total_saml_clients;
  const totalConnections = stats.total_saml_connections + stats.total_oidc_connections;

  const protocolDistribution = [
    { name: 'OIDC Clients', value: stats.total_oidc_clients, color: COLORS.oidc },
    { name: 'SAML Clients', value: stats.total_saml_clients, color: COLORS.saml }
  ].filter(d => d.value > 0);

  const connectionDistribution = [
    { name: 'OIDC', value: stats.total_oidc_connections },
    { name: 'SAML', value: stats.total_saml_connections }
  ];

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

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
          Control Plane
        </h1>
        <p className="text-sm text-muted-foreground">
          Protocol-agnostic identity routing at a glance
        </p>
      </div>

      {/* Stats Grid */}
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
          description={`${stats.total_oidc_connections} OIDC, ${stats.total_saml_connections} SAML`}
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <TrendingUp className="h-5 w-5 text-primary" />
              Auth Traffic by Protocol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockActivityData}>
                  <defs>
                    <linearGradient id="colorOidc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.oidc} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.oidc} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSaml" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.saml} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.saml} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                  <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="oidc" 
                    stroke={COLORS.oidc} 
                    fillOpacity={1} 
                    fill="url(#colorOidc)" 
                    name="OIDC"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="saml" 
                    stroke={COLORS.saml} 
                    fillOpacity={1} 
                    fill="url(#colorSaml)"
                    name="SAML"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.oidc }} />
                <span className="text-sm text-muted-foreground">OIDC</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.saml }} />
                <span className="text-sm text-muted-foreground">SAML</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Protocol Distribution */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="font-heading">Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={connectionDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(215, 20%, 65%)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Count">
                    {connectionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.oidc : COLORS.saml} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recent_activity.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_activity.map((activity, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <ProtocolBadge protocol={!!activity.saml_request_id ? "saml" : "oidc"}/>
                      <ActivityTypeBadge type={"login_request"}/>
                      <div>
                        <p className="text-sm font-medium">{activity.subject}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {activity.type?.replace('_', ' ')} {activity.status}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
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
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                Create OIDC Client
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/applications/saml')}
              data-testid="quick-action-saml-client"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Create SAML Client (SP)
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/connections/saml')}
              data-testid="quick-action-saml-connection"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Add SAML Provider (IdP)
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/connections/oidc')}
              data-testid="quick-action-oidc-connection"
            >
              <span className="flex items-center gap-2">
                <GlobeLock className="h-4 w-4" />
                Add OIDC Provider
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
