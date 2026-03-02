# StaffOS — Staff Management Platform

A full-stack staff management system built with **Next.js 14**, **Tailwind CSS**, **Prisma ORM**, and **MySQL**.

---

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+ (local or cloud)
- npm or yarn

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Your MySQL connection string
DATABASE_URL="mysql://root:yourpassword@localhost:3306/staffos"

# Generate a secure secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="your-super-long-random-secret-here"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 3. Set Up the Database

### Create the MySQL database first:
```sql
CREATE DATABASE staffos;
```

### Push the Prisma schema to MySQL:
```bash
npm run db:push
```

### Seed with demo data:
```bash
npm run db:seed
```

---

## 4. Generate Prisma Client

```bash
npm run db:generate
```

---

## 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

| Role  | Email                   | Password    |
|-------|-------------------------|-------------|
| Admin | admin@staffos.com       | Admin@123   |
| Staff | a.chen@staffos.com      | Staff@123   |
| Staff | m.williams@staffos.com  | Staff@123   |

All staff accounts share `Staff@123` as password.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Login page
│   │   └── register/       # Registration page
│   ├── (dashboard)/
│   │   ├── layout.tsx      # Sidebar + topbar layout
│   │   ├── dashboard/      # Main dashboard with stats
│   │   ├── staff/          # Staff directory
│   │   ├── tasks/          # Task management (list + kanban)
│   │   ├── performance/    # Performance analytics
│   │   ├── messages/       # Internal messaging
│   │   ├── reports/        # Reports & CSV export
│   │   └── settings/       # User settings
│   └── api/
│       ├── auth/           # login, logout, register, me
│       ├── staff/          # CRUD employees
│       ├── tasks/          # CRUD tasks + comments
│       ├── messages/       # Messaging system
│       ├── departments/    # Departments
│       ├── dashboard/      # Stats aggregation
│       └── reports/        # Report generation
├── components/
│   └── AuthProvider.tsx    # JWT auth context
├── lib/
│   ├── prisma.ts           # Prisma client singleton
│   ├── jwt.ts              # JWT sign/verify
│   ├── auth.ts             # Cookie helpers + middleware utils
│   └── response.ts         # API response helpers
├── middleware.ts            # Route protection
└── types/index.ts           # Shared TypeScript types

prisma/
├── schema.prisma            # Full database schema
└── seed.js                  # Demo data seeder
```

---

## Database Schema

| Table              | Description                        |
|--------------------|------------------------------------|
| User               | Accounts with email + hashed pw    |
| Employee           | Staff profiles linked to users     |
| Department         | Organisational departments         |
| Task               | Tasks with status, priority, dates |
| TaskComment        | Comments on tasks                  |
| Message            | Direct messages between users      |
| ActivityLog        | Per-employee activity history      |
| PerformanceReport  | Monthly performance snapshots      |
| AuditLog           | Security audit trail               |
| Document           | Employee document storage          |

---

## Auth Flow

- **JWT** stored in an `httpOnly` cookie (`staffos_token`)
- **Next.js middleware** protects all dashboard routes
- Token expires in **7 days** (configurable via `JWT_EXPIRES_IN`)
- Passwords hashed with **bcrypt** (12 rounds)
- Role-based access: `ADMIN` > `MANAGER` > `STAFF`

---

## Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:studio    # Open Prisma Studio (DB GUI)
npm run db:migrate   # Run migrations (production)
npm run db:seed      # Re-seed demo data
```

---

## Production Deployment

1. Set `DATABASE_URL` to your production MySQL URL
2. Set a strong `JWT_SECRET` (64+ random chars)
3. Run `npm run db:migrate` (not db:push) in production

---
