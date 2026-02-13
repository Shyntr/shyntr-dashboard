import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./components/pages/Dashboard";
import { Applications } from "./components/pages/Applications";
import { SSOIntegrations } from "./components/pages/SSOIntegrations";
import { OIDCConnections } from "./components/pages/OIDCConnections";
import { Settings } from "./components/pages/Settings";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="shyntr-theme">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/sso" element={<SSOIntegrations />} />
            <Route path="/oidc" element={<OIDCConnections />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
