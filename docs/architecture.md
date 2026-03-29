# Architecture

## Overview

StaffOS is a monolithic Next.js 14 application using the App Router. The frontend and backend live in the same repository. API routes are serverless functions deployed to Vercel. The database runs on Railway as a managed MySQL instance accessed through Prisma.

---

## Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server and client components |
| Language | TypeScript | Strict mode enabled |
| Styling | Tailwind CSS | Custom design tokens via CSS variables |
| ORM | Prisma v5 | Schema-first, type-safe queries |
| Database | MySQL 8 on Railway | Accessed via SSL |
| Auth | JWT plus HTTP-only cookies | Access token and refresh token pattern |
| Email | Gmail via Nodemailer | SMTP with App Password |
| 2FA | TOTP via otplib | QR codes generated with the qrcode library |
| Deployment | Vercel | Serverless functions, edge network |
| Cron | Vercel Cron | Runs the weekly digest on Monday mornings |

---

## Folder Structure

```
staffos/
  prisma/
    schema.prisma        Database schema
    seed.js              Seed script with sample data

  src/
    app/
      (auth)/            Public routes: login, register, verify email
      (dashboard)/       Protected routes behind the auth layout
        layout.tsx        Sidebar, top bar, mobile nav, route guard
        dashboard/        Home dashboard with stats
        staff/            Employee management
        tasks/            Task management
        attendance/       Attendance tracking
        leave/            Leave requests and approvals
        payroll/          Payroll configuration
        performance/      Performance reports
        messages/         Direct messaging
        reports/          Export and reporting
        audit-logs/       System audit trail
        backup/           Data backup and export
        settings/         Profile, security, notifications, system

      api/
        auth/             Authentication endpoints
        staff/            Employee CRUD
        tasks/            Task CRUD
        attendance/       Attendance logging
        leave/            Leave request management
        system-settings/  Global feature flags
        messages/         Messaging
        announcements/    Team-wide emails
        cron/             Scheduled jobs
        reports/          Data exports
        departments/      Department management

    components/
      AuthProvider.tsx    Global auth state and user context

    lib/
      prisma.ts           Prisma client singleton
      jwt.ts              Token signing and verification
      auth.ts             Cookie and token helpers
      email.ts            All email sending functions
      response.ts         Standardised API response helpers

    types/
      qrcode.d.ts         Local type declaration for qrcode module

  vercel.json             Cron job configuration
  tailwind.config.ts      Theme tokens
  tsconfig.json
```

---

## Request Lifecycle

1. The browser sends a request with an access token in a cookie
2. The API route extracts the token using `getTokenFromRequest`
3. `verifyToken` validates the JWT and returns the payload (userId, role)
4. The handler checks the role and either returns data or a 403
5. If the access token is expired, the client uses the refresh token to get a new one
6. Responses always follow the shape `{ success, data }` or `{ success: false, error }`

---

## Deployment Topology

```
Browser
  |
  v
Vercel CDN
  |-- Static assets (JS, CSS, images)
  |-- Next.js serverless functions (API routes)
        |
        v
      Railway
        MySQL database (metro.proxy.rlwy.net)
        SSL required
```

All API routes are stateless. There is no persistent server process. Each request is a fresh function invocation on Vercel's infrastructure.

---

## Design System

The UI uses CSS custom properties defined in the global stylesheet. Tailwind utility classes reference these tokens. The main tokens are:

| Token | Purpose |
|---|---|
| `--color-bg` | Page background |
| `--color-surface` | Card and panel background |
| `--color-surface-alt` | Hover and alternate row backgrounds |
| `--color-border` | All borders |
| `--color-text-main` | Primary text |
| `--color-text-muted` | Secondary and label text |
| `--color-accent` | Primary brand blue, buttons, links |
| `--color-success` | Green status indicators |
| `--color-danger` | Red alerts and destructive actions |
| `--color-warning` | Amber warnings |

The application supports both light and dark modes. The active theme is set on the `html` element.
