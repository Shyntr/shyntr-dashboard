import React from "react";
import {
  Globe,
  Palette,
  ExternalLink,
  Copy,
  ShieldCheck,
  FileCode2
} from "lucide-react";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {useTheme} from "@/context/ThemeContext";

const BACKEND_URL = window._env_?.SHYNTR_PUBLIC_BACKEND_URL || "http://localhost:7496";

const SYSTEM_ENDPOINTS = [
  {
    title: "OIDC Discovery (Well-Known)",
    description: "OpenID Connect configuration endpoint for the default tenant.",
    url: `${BACKEND_URL}/.well-known/openid-configuration`,
    icon: Globe,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    title: "SAML IdP Metadata",
    description: "Identity Provider metadata XML for Shyntr acting as an IdP.",
    url: `${BACKEND_URL}/saml/idp/metadata`,
    icon: FileCode2,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    title: "SAML SP Metadata",
    description: "Service Provider metadata XML for Shyntr acting as an SP.",
    url: `${BACKEND_URL}/saml/sp/metadata`,
    icon: ShieldCheck,
    color: "text-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  }
];

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
      <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">

        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage appearance and access global identity metadata endpoints (Default Tenant).
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
            Appearance
          </h3>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                    <Palette className="w-5 h-5 text-pink-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Theme Preferences</span>
                    <span className="text-xs text-muted-foreground">Change the dashboard look and feel</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={toggleTheme}
                      data-testid="dark-mode-toggle"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
            Global Identity Endpoints (Default Tenant)
          </h3>

          <Card className="rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {SYSTEM_ENDPOINTS.map((endpoint, idx) => {
                const Icon = endpoint.icon;
                return (
                    <div
                        key={idx}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 ${
                            idx !== SYSTEM_ENDPOINTS.length - 1 ? 'border-b' : ''
                        } hover:bg-muted/30 transition-colors`}
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className={`p-2 rounded-lg shrink-0 ${endpoint.bg}`}>
                          <Icon className={`w-5 h-5 ${endpoint.color}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{endpoint.title}</span>
                          <span className="text-xs text-muted-foreground">{endpoint.description}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 bg-muted/50 p-1.5 rounded-lg border">
                        <code className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[250px] px-2">
                          {endpoint.url}
                        </code>
                        <div className="flex items-center gap-1 border-l pl-2">
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => copyToClipboard(endpoint.url)}
                              title="Copy to clipboard"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => window.open(endpoint.url, '_blank')}
                              title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

      </div>
  );
}