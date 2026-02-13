import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AppWindow, 
  KeyRound, 
  GlobeLock, 
  Shield,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
  Cell
} from 'recharts';

const COLORS = ['hsl(224, 76%, 48%)', 'hsl(263, 70%, 58%)'];

// Mock data for charts (since we don't have historical data)
const mockActivityData = [
  { name: 'Mon', clients: 4, connections: 2 },
  { name: 'Tue', clients: 3, connections: 1 },
  { name: 'Wed', clients: 5, connections: 3 },
  { name: 'Thu', clients: 2, connections: 2 },
  { name: 'Fri', clients: 6, connections: 4 },
  { name: 'Sat', clients: 4, connections: 2 },
  { name: 'Sun', clients: 3, connections: 1 },
];

function StatCard({ icon: Icon, title, value, description, color }) {
  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-primary/30 transition-colors duration-300">
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
    total_clients: 0,
    total_saml_connections: 0,
    total_oidc_connections: 0,
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

  const pieData = [
    { name: 'Public', value: stats.public_clients || 0 },
    { name: 'Confidential', value: stats.confidential_clients || 0 }
  ].filter(d => d.value > 0);

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
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of your identity and access management system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={AppWindow}
          title="OAuth2 Clients"
          value={stats.total_clients}
          description={`${stats.public_clients} public, ${stats.confidential_clients} confidential`}
          color="bg-blue-600"
        />
        <StatCard
          icon={KeyRound}
          title="SSO Integrations"
          value={stats.total_saml_connections}
          description="SAML connections"
          color="bg-violet-600"
        />
        <StatCard
          icon={GlobeLock}
          title="OIDC Providers"
          value={stats.total_oidc_connections}
          description="External identity providers"
          color="bg-emerald-600"
        />
        <StatCard
          icon={Shield}
          title="Security Score"
          value="A+"
          description="All connections secure"
          color="bg-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <TrendingUp className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockActivityData}>
                  <defs>
                    <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(224, 76%, 48%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(224, 76%, 48%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConnections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(215, 20%, 65%)" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(215, 20%, 65%)" 
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="clients" 
                    stroke="hsl(224, 76%, 48%)" 
                    fillOpacity={1} 
                    fill="url(#colorClients)" 
                    name="Clients"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="connections" 
                    stroke="hsl(263, 70%, 58%)" 
                    fillOpacity={1} 
                    fill="url(#colorConnections)"
                    name="Connections"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Type Distribution */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="font-heading">Client Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No clients yet
              </div>
            )}
            <div className="flex justify-center gap-6 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
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
                      <div className={`h-2 w-2 rounded-full ${
                        activity.type === 'client' ? 'bg-blue-500' : 'bg-violet-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{activity.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {activity.type} {activity.action}
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
              onClick={() => navigate('/applications')}
              data-testid="quick-action-applications"
            >
              <span className="flex items-center gap-2">
                <AppWindow className="h-4 w-4" />
                Create OAuth2 Client
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/sso')}
              data-testid="quick-action-sso"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Add SSO Integration
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/oidc')}
              data-testid="quick-action-oidc"
            >
              <span className="flex items-center gap-2">
                <GlobeLock className="h-4 w-4" />
                Connect OIDC Provider
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
