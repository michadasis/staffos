# StaffOS — Staff Management Platform

A full stack staff management system, designed for teams to manage employees, tasks, performance, and internal communications from a single interface.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** MySQL via Prisma ORM
- **Auth:** JWT with httpOnly cookies + optional TOTP two factor authentication
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
│   │   ├── layout.tsx              # Sidebar + topbar + mobile bottom nav
│   │   ├── dashboard/              # Stats overview
│   │   ├── staff/                  # Employee directory + CRUD + approvals
│   │   ├── tasks/                  # Task management + kanban + comments + files
│   │   ├── performance/            # Completion rate analytics
│   │   ├── messages/               # Direct messaging
│   │   ├── reports/                # Reports + CSV export
│   │   └── settings/               # Profile, password, email change, 2FA
│   └── api/
│       ├── auth/
│       │   ├── login/              # Login with optional 2FA challenge
│       │   ├── logout/
│       │   ├── register/           # Registration (pending admin approval)
│       │   ├── me/
│       │   ├── change-password/
│       │   ├── email-change/       # Email change requests and approval
│       │   └── 2fa/                # 2FA setup, enable, disable
│       ├── staff/
│       │   └── pending/            # Pending registration approvals
│       ├── tasks/
│       │   └── [id]/comments/      # Task comments and file attachments
│       ├── messages/
│       ├── departments/
│       ├── dashboard/
│       ├── notifications/
│       └── reports/
├── components/
│   └── AuthProvider.tsx            # JWT auth context and user state
├── lib/
│   ├── prisma.ts
│   ├── jwt.ts                      # Token sign/verify (jose)
│   ├── auth.ts
│   └── response.ts
├── middleware.ts                    # Edge-compatible route protection
└── types/index.ts

prisma/
├── schema.prisma                   # Full 12-table schema
└── seed.js
```

---

## Database Schema

| Table               | Description                                                       |
|---------------------|-------------------------------------------------------------------|
| User                | Accounts with email, hashed password, 2FA fields, account status |
| Employee            | Staff profiles linked to users                                    |
| Department          | Organisational departments                                        |
| Task                | Tasks with status, priority, deadline                             |
| TaskComment         | Threaded comments with optional file attachments                  |
| Message             | Direct messages between users                                     |
| ActivityLog         | Per employee activity history                                     |
| PerformanceReport   | Monthly performance snapshots                                     |
| AuditLog            | Security audit trail                                              |
| Document            | Employee document storage                                         |
| EmailChangeRequest  | Pending email change requests submitted by staff                  |

---

## Auth and Security

- JWT stored in an `httpOnly` cookie (`staffos_token`)
- Middleware uses `jose` for edge-compatible token verification
- Token expires in 7 days
- Passwords hashed with bcrypt (12 rounds)
- Role hierarchy: `ADMIN` > `MANAGER` > `STAFF`
- Self-registration locked to `STAFF` role and requires admin approval before the account can be used
- Optional TOTP two factor authentication via Google Authenticator, Authy, or any TOTP-compatible app
- Account statuses: `PENDING`, `ACTIVE`, `REJECTED`

---

## Role Permissions

| Feature                        | Admin | Manager | Staff    |
|-------------------------------|-------|---------|----------|
| View all staff                 | Yes   | Yes     | No       |
| Add / edit staff               | Yes   | Yes     | No       |
| Delete staff                   | Yes   | No      | No       |
| Approve registrations          | Yes   | No      | No       |
| Approve email changes          | Yes   | Yes     | No       |
| Create / delete tasks          | Yes   | Yes     | No       |
| View all tasks                 | Yes   | Yes     | Own only |
| Task discussions and files     | Yes   | Yes     | Yes      |
| Performance page               | Yes   | Yes     | No       |
| Reports page                   | Yes   | Yes     | No       |
| Change own password            | Yes   | Yes     | Yes      |
| Change own email directly      | Yes   | Yes     | No       |
| Request email change           | Yes   | Yes     | Yes      |
| Enable / disable 2FA           | Yes   | Yes     | Yes      |

---

## Features

**Authentication and Access**
- JWT authentication with httpOnly cookies
- Role-based access control enforced at both the UI and API layers
- Registration approval flow — new accounts are created with a PENDING status and cannot log in until an admin approves them
- Optional two factor authentication using TOTP with QR code setup, compatible with any authenticator app
- Email change requests for staff members, requiring admin or manager approval before the change is applied
- Admins and managers can update their own email directly without an approval step

**Staff Management**
- Employee directory with full create, read, update, delete
- Pending registration queue at the top of the Staff page with approve and reject actions
- Pending email change queue visible to admins and managers
- Task completion progress bar per employee card, calculated from live data

**Task Management**
- Card-based list view with a coloured priority indicator on each card and automatic overdue detection
- Kanban board view that stacks vertically on mobile and displays as a 3 column grid on desktop
- Full task editing including assignee, priority, status, department, and deadline
- Threaded discussion panel per task with comment count
- File attachments in discussions, images render inline with a tap-to-fullscreen lightbox, other file types display as a labelled download card (5MB limit per file, stored as base64 in the database)

**Notifications**
- Notification bell in the topbar polling every 30 seconds
- Surfaces unread messages, overdue tasks, newly assigned tasks, pending registrations, and pending email change requests

**Messaging**
- Direct messages between any two users
- Mobile layout: full screen conversation list with a separate chat view and a back button to return to the list

**Analytics**
- Dashboard with real company wide stats for admins and managers, personal task summary for staff
- Performance page with per employee and per department completion rates from live data
- Reports page with real department stats and CSV export

**Settings**
- Profile editing for name and job title
- Password change with a live strength indicator and show/hide toggle
- Email change with a role aware flow (direct for admins and managers, request based for staff)
- Two factor authentication with QR code setup and code confirmed disable

**Responsive Design**
- Bottom navigation bar on mobile replacing the sidebar
- Collapsible sidebar on desktop
- Profile avatar in the topbar opens a Settings and Log Out menu on mobile
- All pages adapted for small screens including messages, tasks, staff directory, and the kanban board

---