# Shyntr IAM Dashboard - Product Requirements Document

## Original Problem Statement
Build a modern, production-ready Dashboard UI for an Identity & Access Management (IAM) system called "Shyntr". React-based frontend with FastAPI backend, featuring OAuth2 clients management, SAML SSO integrations, OIDC connections, dashboard analytics, and settings management.

## User Choices
- **Backend Configuration**: Environment variable configuration (REACT_APP_BACKEND_URL)
- **Authentication**: No authentication required for management API
- **Theme**: Both dark and light mode with toggle (default dark)
- **Features**: Full CRUD + data visualization/analytics
- **Logo**: Custom mascot.png provided by user

## User Personas
1. **DevOps Engineer**: Manages OAuth2 clients and SSO connections
2. **Security Admin**: Configures OIDC providers and audits access
3. **IT Administrator**: Oversees settings and tenant configurations

## Core Requirements
- OAuth2 Client CRUD operations with dynamic redirect URIs
- SAML Connection management with XML metadata input
- OIDC Provider connections with issuer configuration
- Dashboard with real-time stats and analytics charts
- Dark/light theme toggle with persistence
- Copy to clipboard for secrets and IDs
- Secret visibility toggle
- Toast notifications for all operations
- Empty state illustrations

## Architecture

### Backend (FastAPI)
- `/api/dashboard/stats` - Dashboard statistics
- `/api/clients` - OAuth2 Clients CRUD
- `/api/saml-connections` - SAML Connections CRUD
- `/api/oidc-connections` - OIDC Connections CRUD

### Frontend (React)
- Dashboard page with analytics
- Applications page for OAuth2 clients
- SSO Integrations page for SAML
- OIDC Connections page
- Settings page with theme toggle

### Database (MongoDB)
- `oauth2_clients` collection
- `saml_connections` collection
- `oidc_connections` collection

## What's Been Implemented ✅

### Feb 13, 2026 - MVP Complete
- [x] Full backend API with all CRUD operations
- [x] Dashboard with stats cards and area/pie charts (Recharts)
- [x] OAuth2 Client management with dynamic redirect URIs, grant types, scopes
- [x] SAML Connection management with XML metadata textarea and paste button
- [x] OIDC Connection management with issuer URL, client credentials
- [x] Copy to clipboard functionality
- [x] Secret visibility toggle (Eye/EyeOff icons)
- [x] Toast notifications (Sonner)
- [x] Empty state components with icons
- [x] Dark/Light theme toggle with localStorage persistence
- [x] Responsive sidebar layout
- [x] Settings page with various configurations
- [x] Custom mascot logo in sidebar
- [x] Deep Royal Blue + Vivid Purple color scheme
- [x] Manrope/Inter/JetBrains Mono typography

## Prioritized Backlog

### P0 (Critical) - None remaining

### P1 (Important)
- [ ] Backend: Actual environment variable storage for settings
- [ ] Backend: API key/token authentication for management API
- [ ] Real activity logging and audit trail

### P2 (Nice to have)
- [ ] Export/Import functionality for clients and connections
- [ ] Bulk operations (delete multiple items)
- [ ] Search and filter in list views
- [ ] Pagination for large datasets
- [ ] Client secret rotation
- [ ] Connection health checks

## Next Action Items
1. User to connect actual backend on localhost:7497 if available
2. Add API authentication if required
3. Implement real audit logging
4. Add export/import functionality
