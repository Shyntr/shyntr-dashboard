import { useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Shield, Bell, Database, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    tenantId: 'default',
    sessionTimeout: '3600',
    enableAuditLog: true,
    enableNotifications: true,
    requireMFA: false,
    apiRateLimit: '1000'
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in" data-testid="settings-page">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure your Shyntr IAM instance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Switch between light and dark themes
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                data-testid="dark-mode-toggle"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Configure security settings for your instance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (seconds)</Label>
              <Input
                id="session-timeout"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                placeholder="3600"
                data-testid="session-timeout-input"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Require MFA</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Enforce multi-factor authentication
                </p>
              </div>
              <Switch
                checked={settings.requireMFA}
                onCheckedChange={(checked) => setSettings({ ...settings, requireMFA: checked })}
                data-testid="require-mfa-toggle"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Enable Notifications</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Receive alerts for security events
                </p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
                data-testid="notifications-toggle"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Audit Logging</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Log all authentication events
                </p>
              </div>
              <Switch
                checked={settings.enableAuditLog}
                onCheckedChange={(checked) => setSettings({ ...settings, enableAuditLog: checked })}
                data-testid="audit-log-toggle"
              />
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Key className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Configure API settings and rate limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tenant-id">Default Tenant ID</Label>
              <Input
                id="tenant-id"
                value={settings.tenantId}
                onChange={(e) => setSettings({ ...settings, tenantId: e.target.value })}
                placeholder="default"
                data-testid="tenant-id-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-limit">API Rate Limit (requests/hour)</Label>
              <Input
                id="rate-limit"
                value={settings.apiRateLimit}
                onChange={(e) => setSettings({ ...settings, apiRateLimit: e.target.value })}
                placeholder="1000"
                data-testid="rate-limit-input"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          data-testid="save-settings-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          Save Settings
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30 border-border/40">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold mb-1">Backend Configuration</h3>
              <p className="text-sm text-muted-foreground">
                These settings are stored in your frontend. For backend configuration including 
                database connections and API endpoints, please modify your environment variables 
                or contact your system administrator.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
