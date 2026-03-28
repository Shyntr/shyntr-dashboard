import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./components/pages/Dashboard";
import { OIDCClients } from "./components/pages/OIDCClients";
import SAMLClients from "./components/pages/SAMLClients";
import { SAMLConnections } from "./components/pages/SAMLConnections";
import { OIDCConnections } from "./components/pages/OIDCConnections";
import { Tenants } from "./components/pages/Tenants";
import { Scopes } from "./components/pages/Scopes";
import { Settings } from "./components/pages/Settings";
import { Toaster } from "./components/ui/sonner";
import {OutboundPolicies} from "@/components/pages/OutboundPolicies";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="shyntr-theme">
      <BrowserRouter basename={window._env_?.SHYNTR_PATH_PREFIX || "/"}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {/* Applications (Clients) */}
            <Route path="/applications" element={<Navigate to="/applications/oidc" replace />} />
            <Route path="/applications/oidc" element={<OIDCClients />} />
            <Route path="/applications/saml" element={<SAMLClients />} />
            {/* Connections (Providers) */}
            <Route path="/connections" element={<Navigate to="/connections/oidc" replace />} />
            <Route path="/connections/oidc" element={<OIDCConnections />} />
            <Route path="/connections/saml" element={<SAMLConnections />} />
            {/* Tenants & Identity & Security */}
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/scopes" element={<Scopes />} />
            <Route path="/outbound-policies" element={<OutboundPolicies />} />
            <Route path="/settings" element={<Settings />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
