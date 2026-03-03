# StaffOS — Staff Management Platform

A full stack staff management system, designed for teams to manage employees, tasks, performance, and internal communications from a single interface.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** MySQL via Prisma ORM
- **Auth:** JWT with httpOnly cookies
- **Styling:** Tailwind CSS (dark theme)

---

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/staffos"

# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="your-64-char-random-secret"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="StaffOS"
```

### 3. Set Up the Database

```bash
# Create the database (MySQL)
mysql -u root -p -e "CREATE DATABASE staffos;"

# Push schema
npm run db:push

# Seed demo data
npm run db:seed
```

### 4. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

| Role    | Email                  | Password  |
|---------|------------------------|-----------|
| Admin   | admin@staffos.com      | Admin@123 |
| Staff   | a.chen@staffos.com     | Staff@123 |
| Staff   | m.williams@staffos.com | Staff@123 |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + topbar + mobile nav
│   │   ├── dashboard/          # Stats overview
│   │   ├── staff/              # Employee directory + CRUD
│   │   ├── tasks/              # Task management + kanban + comments
│   │   ├── performance/        # Completion rate analytics
│   │   ├── messages/           # Direct messaging
│   │   ├── reports/            # Reports + CSV export
│   │   └── settings/           # Profile + password change
│   └── api/
│       ├── auth/               # login, logout, register, me, change-password
│       ├── staff/              # CRUD employees
│       ├── tasks/              # CRUD tasks + comments
│       ├── messages/           # Messaging
│       ├── departments/        # Departments
│       ├── dashboard/          # Aggregated stats
│       ├── notifications/      # Real-time notifications
│       └── reports/            # Report generation
├── components/
│   └── AuthProvider.tsx        # JWT auth context + user state
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── jwt.ts                  # Token sign/verify (jose)
│   ├── auth.ts                 # Cookie helpers
│   └── response.ts             # Typed API response helpers
├── middleware.ts                # Edge-compatible route protection
└── types/index.ts              # Shared TypeScript types

prisma/
├── schema.prisma               # Full 11-table schema
└── seed.js                     # Demo data seeder
```

---

## Database Schema

| Table             | Description                          |
|-------------------|--------------------------------------|
| User              | Accounts with email and hashed password |
| Employee          | Staff profiles linked to users       |
| Department        | Organisational departments           |
| Task              | Tasks with status, priority, deadline |
| TaskComment       | Threaded comments on tasks           |
| Message           | Direct messages between users        |
| ActivityLog       | Per-employee activity history        |
| PerformanceReport | Monthly performance snapshots        |
| AuditLog          | Security audit trail                 |
| Document          | Employee document storage            |

---

## Auth Flow

- JWT stored in an `httpOnly` cookie (`staffos_token`)
- Middleware uses `jose` for edge-compatible token verification
- Token expires in 7 days
- Passwords hashed with bcrypt (10 rounds)
- Role hierarchy: `ADMIN` > `MANAGER` > `STAFF`
- Self-registration is locked to `STAFF` role — elevation requires admin action

---

## Role Permissions

| Feature              | Admin | Manager | Staff       |
|----------------------|-------|---------|-------------|
| View all staff       | Yes   | Yes     | No          |
| Add / edit staff     | Yes   | Yes     | No          |
| Delete staff         | Yes   | No      | No          |
| Create tasks         | Yes   | Yes     | No          |
| Delete tasks         | Yes   | Yes     | No          |
| View all tasks       | Yes   | Yes     | Own only    |
| Performance page     | Yes   | Yes     | No          |
| Reports page         | Yes   | Yes     | No          |
| Change own password  | Yes   | Yes     | Yes         |
| Edit own profile     | Yes   | Yes     | Yes         |

---

## Features

- JWT authentication with httpOnly cookies
- Role-based access control across UI and API
- Employee directory with full CRUD
- Task management with list and kanban board views
- Threaded task comments and discussions
- Internal direct messaging system
- Dashboard with real stats from the database
- Performance analytics per employee and department
- CSV report export
- Real-time notifications (unread messages, overdue tasks, new assignments)
- Password change with strength indicator
- Responsive design, sidebar on desktop, bottom navigation on mobile