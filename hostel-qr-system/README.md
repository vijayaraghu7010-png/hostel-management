# Hostel Management System (HMS) — Universal QR Portal v1.0

A production-ready Universal QR Code Generator, Gate Control Scanner, Study Hour Module, Outpass System, ERP Connector Pipeline, and Master Admin Command Center built with React 19, Vite, TypeScript, Supabase, and Tailwind CSS.

---

## System Architecture

```
Hostel ERP Core System (https://jxdsuhutztvuoknkypay.supabase.co)
 ├── Single Sign-On Authentication (Student & Warden Roles)
 │
 ├── Student Dashboard ──► Open QR Portal (http://localhost:8080/student/study)
 │
 ├── Warden Dashboard  ──► Open Universal Scanner (http://localhost:8080/warden/study)
 │
 ├── Shared Supabase Tier (Realtime Synchronization)
 │
 └── ERP Connector Pipeline (Retry Queue & Offline Failover)
```

---

## Key Features

1. **Universal QR Generator Engine**: 30-second auto-refreshing QR codes signed with HMAC SHA-256 digital signatures, cryptographic nonces, anti-replay protection, and expiry validation.
2. **Universal Scanner Engine**: Multi-device ZXing browser camera scanner supporting rear auto-selection, webcams, torch toggle, pause/resume, and reticle overlays.
3. **Study Hour Module**: Real-time warden session start/stop controls, live elapsed clocks, attendance counters, filterable rosters, and check-in verifications.
4. **Outpass & Gate Control Module**: Student leave applications, warden request approvals/rejections, progress timelines, and gate exit/re-entry QR verification.
5. **ERP Connector & Bridge**: Event-driven decoupled gateway handling PostgREST events (`STUDY_ATTENDANCE`, `OUTPASS_ENTRY`, `OUTPASS_EXIT`) with offline failover queues.
6. **Master Admin Dashboard**: Real-time infrastructure health monitoring, peak scan volume charts, 7-day attendance trends, quick system actions, and error logs.
7. **Production Hardened & PWA**: PWA manifest, Service Worker offline caching, route code-splitting, global `ErrorBoundary`, and `AuditLogger`.

---

## Folder Structure

```
src/
├── app/                  # App initialization & Route code-splitting
├── components/           # UI components, QR renderers, Scanner overlays
├── config/               # Environment validation & constants
├── hooks/                # Custom React hooks (useScanner, useCamera, useERP, useOffline)
├── integration/          # ERP Bridge, Event emitters, Student/Warden Bridges
├── modules/
│   ├── admin/            # Admin Command Center, System Health, Analytics Charts
│   ├── outpass/          # Outpass requests, approval workflows, gate cards
│   └── study/            # Study Hour sessions, rosters, attendance logic
├── services/             # Supabase client, Auth, QR Generator, Scanner Engine
├── store/                # Zustand global state management
├── types/                # Strict TypeScript type definitions
└── utils/                # HMAC Security, AuditLogger, formatting utilities
```

---

## Installation & Running Locally

### Prerequisites
- Node.js `20.x` or higher
- `npm` `10.x` or higher

```bash
# 1. Clone repository
git clone https://github.com/organization/hostel-qr-system.git
cd hostel-qr-system

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env

# 4. Start Vite development server
npm run dev

# 5. Build for production
npm run build
```

---

## Deployment Options

### Option A: Docker & Docker Compose

```bash
# Build and run containerized application on port 8080
docker-compose up -d --build
```

### Option B: Bare-Metal Nginx SPA Deployment

```bash
# 1. Compile production static bundle
npm run build

# 2. Copy contents of dist/ to Nginx root directory
cp -r dist/* /usr/share/nginx/html/

# 3. Copy nginx.conf configuration
cp nginx.conf /etc/nginx/conf.d/default.conf

# 4. Reload Nginx service
systemctl reload nginx
```

---

## License

Production Enterprise License — Hostel ERP Systems 2026.
