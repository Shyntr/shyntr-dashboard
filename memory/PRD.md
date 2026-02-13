# Shyntr Authentication Hub - Product Requirements Document

## Original Problem Statement
Build a modern, production-ready Dashboard UI for "Shyntr" - a Protocol-Agnostic Authentication Hub that facilitates 4 core identity routing flows:
1. OIDC Client -> Shyntr -> OIDC Provider
2. SAML Client -> Shyntr -> SAML Provider
3. OIDC Client -> Shyntr -> SAML Provider
4. SAML Client -> Shyntr -> OIDC Provider

## User Choices (Iteration 2)
- **Backend**: Keep FastAPI mock backend (to switch to Go backend later)
- **SAML Clients**: Mock endpoint created in FastAPI
- **Authentication**: Skip X-Admin-Key for now
- **JSON Editor**: Monaco Editor with syntax highlighting
- **Tenants**: Full CRUD page

## User Personas
1. **DevOps Engineer**: Manages OAuth2/OIDC clients and SAML service providers
2. **Security Admin**: Configures identity providers (SAML IdPs, OIDC providers)
3. **Platform Admin**: Manages tenants for multi-tenant deployments

## Core Requirements
- Protocol-agnostic identity routing (OIDC <-> SAML)
- OIDC Clients with OAuth2 settings (grant types, response types, PKCE)
- SAML Clients (Service Providers) with assertion signing/encryption
- SAML Connections to enterprise IdPs (Okta, Azure AD, etc.)
- OIDC Connections to social providers (Google, GitHub, etc.)
- Multi-tenant isolation with Tenants management
- Protocol badges: OIDC (teal), SAML (orange)
- Monaco JSON editor for attribute mappings

## Architecture

### Backend (FastAPI)
- `/api/dashboard/stats` - Updated with protocol-specific stats
- `/api/clients` - OIDC Clients CRUD
- `/api/saml-clients` - SAML Clients (SP) CRUD
- `/api/saml-connections` - SAML IdP Connections CRUD
- `/api/oidc-connections` - OIDC Provider Connections CRUD
- `/api/tenants` - Tenants CRUD

### Frontend (React)
- Dashboard ("Control Plane") with protocol traffic charts
- Applications menu: OIDC Clients, SAML Clients
- Connections menu: OIDC Providers, SAML Providers
- Tenants page with card layout

### Database (MongoDB)
- `oidc_clients`, `saml_clients`, `saml_connections`, `oidc_connections`, `tenants`

## What's Been Implemented ✅

### Feb 13, 2026 - Iteration 1 MVP
- Basic IAM Dashboard structure

### Feb 13, 2026 - Iteration 2 (Major Restructuring)
- [x] Restructured as Protocol-Agnostic Authentication Hub
- [x] Dashboard renamed to "Control Plane" with protocol traffic charts
- [x] Collapsible sidebar menus (Applications, Connections)
- [x] OIDC Clients with full OAuth settings (grant types, response types, auth method, PKCE)
- [x] SAML Clients (Service Providers) with Entity ID, ACS URL, SP Certificate
- [x] Monaco JSON Editor for attribute mapping in SAML forms
- [x] SAML Connections with XML metadata paste functionality
- [x] OIDC Connections with advanced endpoint overrides
- [x] Tenants CRUD with card layout and protected default tenant
- [x] Protocol badges: OIDC (teal), SAML (orange)
- [x] Removed: MFA settings, Rate Limiting, User Management (not applicable to hub architecture)

## Prioritized Backlog

### P0 (Critical) - None remaining

### P1 (Important)
- [ ] Connect to actual Go backend on localhost:7497
- [ ] Add X-Admin-Key authentication header support
- [ ] Client secret rotation functionality
- [ ] Connection health checks / test button

### P2 (Nice to have)
- [ ] XML metadata validation and parsing (extract EntityID, endpoints)
- [ ] OIDC Discovery auto-populate from issuer URL
- [ ] Export/Import configurations
- [ ] Bulk operations
- [ ] Search and filter in lists
- [ ] Audit logging

## Next Action Items
1. When Go backend is ready, update REACT_APP_BACKEND_URL in frontend/.env
2. Add X-Admin-Key header to API client when authentication is enabled
3. Test OIDC Discovery to auto-populate endpoints from issuer URL
4. Add metadata XML parsing to extract EntityID from pasted XML
