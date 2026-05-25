<div align="center">

# BeEngine

![BeEngine Banner](https://via.placeholder.com/900x200/0d0d0d/FFD100?text=BeEngine+%E2%80%94+Next-Gen+Motorsport+Hub)

**A modern, premium motorsport data platform built for speed, precision, and scale.**

[![Status](https://img.shields.io/badge/status-in%20development-FFD100?style=flat-square&labelColor=0d0d0d)](.)
[![Angular](https://img.shields.io/badge/Angular-20-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

[Overview](#-overview) · [Stack](#-tech-stack) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [Roadmap](#-roadmap)

</div>

---

## 📌 Overview

**BeEngine** is a next-generation motorsport data platform that delivers race calendars, live standings, driver profiles, race results, and breaking news — all through a fast, visual, and premium web experience.

Inspired by the best sports apps in the world — Formula 1 App, SofaScore, OneFootball, Apple Sports, and Bloomberg's data dashboards — BeEngine is designed to be the definitive hub for motorsport fans who demand more than just results.

> Currently in active development. Data is served from a custom backend (mock data) and the platform is fully prepared to integrate real-time motorsport APIs.

---

## 🎯 Objectives

| Goal | Description |
|---|---|
| **Premium UX** | A UI that feels native, fast, and visually modern — not a generic sports site |
| **Data-first** | Standings, calendars, results, statistics — always structured and accessible |
| **Multi-category** | F1, F2, F3, MotoGP, Moto2 and Moto3 |
| **Real-time ready** | Architecture prepared for live timing, lap data, and push updates |
| **Developer friendly** | Clean separation of concerns, typed contracts, easy to extend |

---

## ⚡ Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| [Angular](https://angular.dev) | 20 | UI framework |
| TypeScript | 5 | Type safety throughout |
| Angular Signals | Native | Reactive state management |
| Standalone Components | Native | Modular, tree-shakable UI |
| RxJS | 7 | Async streams and HTTP layer |
| Tailwind CSS | 4 | Utility-first styling |
| HttpClient | Native | REST API consumption |

### Backend

| Technology | Version | Role |
|---|---|---|
| [Node.js](https://nodejs.org) | 20+ | Runtime |
| [Express](https://expressjs.com) | 5 | HTTP framework |
| ES Modules | Native | Modern JavaScript module system |
| Helmet | 8 | Security headers |
| Morgan | 1.10 | HTTP request logging |
| CORS | 2 | Cross-origin resource sharing |

---

## 🏗 Architecture

BeEngine follows a **decoupled frontend/backend architecture** with a clean REST API as the contract between layers.

```
┌─────────────────────────────────────────────────────────┐
│                        BeEngine                         │
│                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐  │
│  │      Frontend       │   │        Backend          │  │
│  │    Angular 20       │◄──►    Node.js + Express    │  │
│  │    Port :4200       │   │       Port :3000        │  │
│  └─────────────────────┘   └─────────────────────────┘  │
│           │                           │                 │
│    Signals + RxJS              Layered REST API         │
│    Standalone Components       Routes → Controllers     │
│    OnPush CD strategy          → Services → Repos       │
│                                → Mock Data              │
│                                   (→ Real APIs soon)    │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

- **Frontend is a pure consumer** — it never holds business logic, only presentation state
- **Backend is stateless** — all data flows through clean REST contracts
- **Signals as state** — Angular Signals replace NgRx for reactive, local component state
- **Repository pattern** — the backend data layer can swap mocks for real APIs without touching services or controllers
- **Feature-based structure** — features are self-contained and independently scalable

---

## 📁 Project Structure

```
BeEngine/
├── frontend/                        # Angular 20 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   └── services/
│   │   │   │       └── api.service.ts       # Base HTTP client (environment-aware)
│   │   │   ├── data/
│   │   │   │   └── sports.data.ts           # Shared interfaces & types
│   │   │   ├── features/
│   │   │   │   └── home/
│   │   │   │       ├── services/
│   │   │   │       │   └── home.service.ts  # Calls /categories & /home/:cat
│   │   │   │       ├── home.component.ts    # Central state + signals
│   │   │   │       └── home.component.html  # Feature template
│   │   │   └── shared/
│   │   │       └── components/
│   │   │           ├── topbar/              # Category switcher header
│   │   │           ├── sidebar/             # Navigation + favorites
│   │   │           ├── race-card/           # Next race + countdown
│   │   │           ├── standings-table/     # Driver standings
│   │   │           ├── news-list/           # News feed
│   │   │           └── right-rail/          # Quick stats panel
│   │   ├── environments/
│   │   │   ├── environment.ts               # Production config
│   │   │   └── environment.development.ts   # Development config
│   │   └── styles.css                       # Global styles + Tailwind
│   └── angular.json
│
└── backend/                         # Node.js + Express REST API
    └── src/
        ├── config/                  # Environment variables
        ├── constants/               # HTTP status codes
        ├── controllers/             # Request handlers
        ├── data/                    # Mock data (per category)
        ├── middlewares/             # CORS, Helmet, Morgan, 404, errors
        ├── repositories/            # Data access layer (swap → real APIs)
        ├── routes/                  # Route definitions
        ├── services/                # Business logic
        ├── utils/                   # Response helpers
        ├── validators/              # Input validation
        ├── app.js                   # Express setup
        └── server.js                # Entry point
```

---

## 🏎 Features

### Currently Available

| Feature | Status | Notes |
|---|---|---|
| Category switching (F1, F2, F3, MotoGP, Moto2, Moto3) | ✅ Live | Real-time UI switch with accent colors |
| Next race countdown | ✅ Live | Ticking timer, updates per second |
| Driver standings | ✅ Live | Per-category, toggle full list |
| Constructor standings | ✅ Live | Progress bars with team colors |
| Last race podium | ✅ Live | Gold/silver/bronze SVG trophies |
| Race calendar sessions | ✅ Live | FP1–Race schedule strip |
| News feed | ✅ Live | Category-filtered, hot tag support |
| Right rail quick stats | ✅ Live | Leader, gap, rounds info |
| Backend REST API | ✅ Live | 5 endpoints, fully structured |
| Loading & error states | ✅ Live | Graceful fallback UI |
| Angular Signals state | ✅ Live | No NgRx, no BehaviorSubjects |
| Frontend → Backend via HttpClient | ✅ Live | Fully decoupled, env-aware |

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/categories` | All motorsport categories |
| `GET` | `/api/home/:category` | Full home data for a category |
| `GET` | `/api/news/:category` | News by category |
| `GET` | `/api/calendar/:category` | Upcoming sessions |

**Valid categories:** `f1` · `f2` · `f3` · `motogp` · `moto2` · `moto3`

**Response format:**
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "message" }
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Angular CLI ≥ 20

### 1. Clone the repository

```bash
git clone https://github.com/Victor-Picallo/beengine.git
cd beengine
```

### 2. Start the backend

```bash
cd backend
npm install
node src/server.js
# → API running at http://localhost:3000
```

### 3. Start the frontend

```bash
cd frontend
npm install
ng serve
# → App running at http://localhost:4200
```

### 4. Verify it's working

```bash
curl http://localhost:3000/api/health
# → { "success": true, "data": { "status": "ok", ... } }
```

Open [http://localhost:4200](http://localhost:4200) — the home should load with live data from the backend.

> **Port conflict?** If port 3000 is already in use:
> ```powershell
> netstat -ano | Select-String ":3000"
> Stop-Process -Id <PID> -Force
> ```

---

## 📜 Scripts

### Backend

```bash
node src/server.js          # Start the API server
```

### Frontend

```bash
ng serve                    # Development server (http://localhost:4200)
ng build                    # Production build
ng build --configuration development   # Dev build with source maps
ng test                     # Unit tests
```

---

## 🔧 Environment Variables

### Backend — `backend/.env`

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

Copy `backend/.env.example` and fill in your values.

### Frontend — `src/environments/`

| File | Used when |
|---|---|
| `environment.ts` | Production build |
| `environment.development.ts` | `ng serve` / dev build |

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
```

---

## 🗺 Roadmap

### v0.2 — Data & Categories
- [ ] Individual driver profile pages
- [ ] Full season results archive
- [ ] Constructor detail view
- [ ] Expanded news with article body

### v0.3 — Real API Integration
- [ ] Integrate official Formula 1 data feed
- [ ] Integrate MotoGP API
- [ ] Replace mock repositories with real API clients
- [ ] Caching layer (Redis or in-memory)

### v0.4 — Live & Real-time
- [ ] Live timing during race weekends
- [ ] WebSocket push for lap times
- [ ] Race control messages
- [ ] Gap tracker (live to leader)

### v0.5 — Statistics & History
- [ ] Historical race results database
- [ ] Career stats per driver
- [ ] Head-to-head comparisons
- [ ] Season progression charts

### v1.0 — Platform
- [ ] User accounts + favorite categories/drivers
- [ ] Notification system (race starts, results)
- [ ] Mobile-responsive layout
- [ ] PWA support
- [ ] Multi-language (EN / ES)

---

## 🎨 Design Philosophy

BeEngine is built around a set of visual and architectural principles that separate it from typical sports sites.

**Dark-first, always.** The motorsport world lives at night — late qualifying sessions, pit wall screens, timing monitors. The palette starts from `#0d0d0d` and builds up.

**Accent colors as identity.** Each motorsport category has a precise accent color that saturates the entire UI — headers, borders, progress bars, countdowns, badges. Switching categories is a full visual identity shift.

| Category | Accent | Hex |
|---|---|---|
| Formula 1 | Gold Yellow | `#FFD100` |
| Formula 2 | Blue | `#0090FF` |
| Formula 3 | Grey | `#9E9E9E` |
| MotoGP | Racing Blue | `#0052CC` |
| Moto2 | Orange | `#FF6B35` |
| Moto3 | Green | `#52C41A` |

**Typography as sport.** [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) for headers, numbers, and labels — tight, fast, confident. Barlow for body copy.

**Data density without noise.** Every pixel earns its place. No decorative chrome, no gratuitous animation — only motion that communicates a state change.

---

## 📊 Current State

```
Frontend  ██████████░░░░░░░░░░  ~50%  Home feature complete, routing WIP
Backend   ████████░░░░░░░░░░░░  ~40%  REST API live, mock data, no auth
Data      ██░░░░░░░░░░░░░░░░░░  ~10%  Mock data, real APIs not yet integrated
Design    ████████████░░░░░░░░  ~60%  Home UI polished, mobile not started
```

**Current data source:** Custom backend serving structured mock data. The backend's repository layer is designed as a clean drop-in point for real API clients — no service or controller changes required to migrate.

---

## 🤝 Contributing

BeEngine is currently in early development and not open for general contributions yet. If you're interested in collaborating, reach out directly.

When contributions open:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit with intent: `git commit -m "feat: add driver profile page"`
4. Push and open a Pull Request against `main`

Please follow the existing code style — typed, signal-based, and component-scoped.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with precision. Engineered for speed.

**BeEngine** — *Next-Gen Motorsport Hub*

</div>
