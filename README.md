# StaffOS - Staff Management Platform

A full stack staff management system, designed for teams to manage employees, tasks, performance, and internal communications from a single interface.

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

Edit `.env` with your settings:

```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/staffos"

# Generate a secure secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="your-super-long-random-secret-here"

NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Gmail credentials for email notifications
GMAIL_USER="yourgmail@gmail.com"
GMAIL_APP_PASSWORD="your-16-char-app-password"
```

### 3. Set Up the Database

Create the MySQL database:

```sql
CREATE DATABASE staffos;
```

Push the Prisma schema:

```bash
npm run db:push
```

Seed with demo data:

```bash
npm run db:seed
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

| Role  | Email                  | Password  |
|-------|------------------------|-----------|
| Admin | admin@staffos.com      | Admin@123 |
| Staff | a.chen@staffos.com     | Staff@123 |
| Staff | m.williams@staffos.com | Staff@123 |

---

## Features

### Authentication and Security

- JWT authentication stored in httpOnly cookies
- Role based access control with three roles: Admin, Manager, and Staff
- Two factor authentication via TOTP (Google Authenticator compatible)
- Email verification on registration
- Passwords hashed with bcrypt (12 rounds)
- Full audit logging for all sensitive actions
- Middleware-based route protection

### Registration Flow

New users register and receive a verification email. Once they verify their address the account moves to pending, and an admin receives a notification to approve or reject it. Admins can also resend the verification email to users who did not receive it. Approving a user bypasses any remaining verification steps and activates the account immediately.

### Staff Management

- Full staff directory with search and department filtering
- Add, edit, and delete employees
- Role changes including demotion from Admin to Manager or Manager to Staff
- Department assignment and supervisor assignment
- Staff profile with tabbed sections for Profile, Documents, and Work History

### Work History

Each staff member has a work history timeline that records role changes, department transfers, status changes, job title changes, and the date they joined. Entries are recorded automatically when an admin edits a staff member. Admins and managers can also add manual entries such as notes, promotions, or off-system events. Admins can delete individual entries.

### Document Management

Admins and managers can upload documents against any staff member (PDF, Word, images, Excel, ZIP, up to 10MB). Documents are stored as base64 in the database with no external storage dependency. Staff can view and download their own documents.

### Task Management

- Create, edit, and delete tasks with title, description, priority, deadline, and assignee
- Task statuses: Pending, In Progress, Completed, Cancelled
- Priority levels: Low, Medium, High, Critical
- List view and Kanban board view
- Task discussions with file attachments
- Overdue task detection

### Messaging

- Direct messages between users
- Conversation list with unread counts
- Full message history per conversation
- Send on Enter with mobile-compatible input

### Performance and Reports

- Performance analytics per employee
- Reports page with four tabs: Overview, Staff, Tasks, and Departments
- Period filtering: daily, weekly, and monthly
- Export to Excel (multi-sheet workbook) or PDF (branded multi-page layout)

### Email Notifications

Emails are sent via Gmail using Nodemailer. Notifications are sent for the following events:

- New direct message received
- Task assigned
- New registration pending admin approval
- Registration approved or rejected
- Email change request submitted (notifies admins and managers)
- Email change confirmation (sent to new address before applying)
- Password changed
- Two-factor authentication enabled or disabled

### Settings

- Update display name and job title
- Change email address with confirmation link sent to new address before applying
- Change password with strength indicator
- Enable or disable two-factor authentication

### Admin Controls

- Approve or reject new user registrations
- Resend verification emails to unverified users
- Approve or reject email change requests from staff
- Data backup with JSON and CSV export of all records
- Full audit log viewer

---

## Project Structure

```
src/
  app/
    (auth)/
      login/                  Login page
      register/               Registration page
      verify-email/           Email verification landing page
      confirm-email-change/   Email change confirmation page
    (dashboard)/
      layout.tsx              Sidebar, topbar, and mobile navigation
      dashboard/              Main dashboard with live stats
      staff/                  Staff directory with profile modals
      tasks/                  Task management (list and kanban)
      performance/            Performance analytics
      messages/               Internal messaging
      reports/                Reports with PDF and Excel export
      settings/               User settings and security
      audit-logs/             Audit trail viewer
      backup/                 Data backup and export
    api/
      auth/                   login, logout, register, me, 2fa, verify-email,
                              email-change, confirm-email-change, change-password
      staff/                  CRUD employees, pending approvals, documents,
                              work history
      tasks/                  CRUD tasks and comments
      messages/               Messaging system
      departments/            Department management
      dashboard/              Stats aggregation
      reports/                Report data and generation
  components/
    AuthProvider.tsx          JWT auth context
  lib/
    prisma.ts                 Prisma client singleton
    jwt.ts                    JWT sign and verify
    auth.ts                   Cookie helpers
    email.ts                  Nodemailer email templates and sending
    response.ts               API response helpers
  middleware.ts               Route protection

prisma/
  schema.prisma               Full database schema
  seed.js                     Demo data seeder
```

---

## Database Schema

| Table              | Description                                       |
|--------------------|---------------------------------------------------|
| User               | Accounts with email, hashed password, and status  |
| Employee           | Staff profiles linked to users                    |
| Department         | Organisational departments                        |
| Task               | Tasks with status, priority, and deadline         |
| TaskComment        | Comments and file attachments on tasks            |
| Message            | Direct messages between users                     |
| ActivityLog        | Per employee activity log                         |
| WorkHistory        | Timeline of role and status changes per employee  |
| PerformanceReport  | Monthly performance snapshots                     |
| AuditLog           | Security and admin action audit trail             |
| Document           | Employee document storage (base64)                |
| EmailChangeRequest | Pending email change requests for staff           |

---

## Auth Flow

- JWT stored in an httpOnly cookie named `staffos_token`
- Next.js middleware protects all dashboard routes
- Token expires in 7 days (configurable via `JWT_EXPIRES_IN`)
- Role hierarchy: Admin has full access, Manager can manage staff and tasks, Staff has read access to their own data

---

## Email Setup (Gmail)

1. Create or use a personal Gmail account
2. Enable two step verification on the account
3. Go to myaccount.google.com/apppasswords and generate an app password named StaffOS
4. Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` to your environment variables
5. Set `NEXT_PUBLIC_APP_URL` to your production domain so email links resolve correctly

To verify the connection is working, visit `/api/test-email` while logged in as an admin.

---