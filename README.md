# Rental Maintenance MVP

<img width="638" height="853" alt="rental-maintenance" src="https://github.com/user-attachments/assets/379b47b5-25e0-439f-a06b-af425877b261" />

A full‑stack **Next.js 13 / React / Prisma / PostgreSQL** application that helps property managers track and resolve tenant maintenance requests.  Built as an opinionated but easily‑extendable starter.

---

## ✨ Key Features

| Area | Highlights |
|------|------------|
| **Authentication** | Next‑Auth (Email + OAuth) with RBAC `MANAGER / STAFF / USER` |
| **Database** | Prisma ORM, PostgreSQL schema (properties, tenants, tickets, users) |
| **API Routes** | REST style (`/api/tickets`, `/api/properties`) with Zod validation & rate limiting |
| **Realtime UI** | React‑Query caching, optimistic updates, Toast feedback |
| **Image Handling** | Upload to Vercel Blob, light‑box gallery, optional Google Gemini Vision triage |
| **DX** | Type‑safe hooks, ESLint, Prettier, React‑Query DevTools, hot‑reload |
| **CI / CD** | Vercel ready ‑ zero‑config deploy, GitHub Actions sample workflow in `.github/` soon! |

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/your‑org/rental‑maintenance.git
cd rental‑maintenance
pnpm install       # or npm / yarn
```

### 2. Configure Environment Variables

Copy `.env.example` → `.env.local` and fill:

```dotenv
DATABASE_URL=postgres://user:pass@localhost:5432/maintenance
NEXTAUTH_SECRET=yourRandomString
NEXTAUTH_URL=http://localhost:3000

# Optional integrations
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1555000111

GEMINI_API_KEY=...        # Google Vision
```

### 3. Provision Database

```bash
pnpm prisma migrate dev --name init
pnpm prisma db seed        # optional seed script
```

### 4. Run in Development

```bash
pnpm dev
# open http://localhost:3000
```

### 5. Build & Start (production)

```bash
pnpm build
pnpm start
```

---

## 🧪 Testing

* **Jest + React Testing Library** unit tests: `pnpm test`
* **Cypress** e2e tests: `pnpm cypress open`

*(Boilerplate configs are included – add your own tests in `/tests` and `/cypress`)*

---

## 📦 Deployment

1. Push the repo to GitHub.
2. In **Vercel**, “Import Project”, set environment variables, choose PostgreSQL (Neon or Supabase).
3. Vercel automatically runs `pnpm build` and deploys.

---

## 📄 License

MIT © 2024 Your Name
