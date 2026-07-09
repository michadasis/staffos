# StaffOS

StaffOS is a full-stack staff management platform for small and medium sized teams. It is built with Next.js 14, Prisma ORM, and MySQL, and is designed to be deployed with a cloud hosted database. The application covers the full employee lifecycle from registration and onboarding through daily attendance and task tracking, leave management, payroll configuration, and performance reporting.

All features are gated behind a role based access system with three roles: Admin, Manager, and Staff. Each role sees a tailored interface and can only reach the API endpoints appropriate to their level of access.

---

## What StaffOS Does

**Employee Management** handles the full lifecycle of a staff member's account. New users register and go through an email verification step before an admin approves their account. Admins and managers can view and edit employee profiles, assign departments and supervisors, upload documents, record work history entries such as promotions and role changes, and generate performance reports by period.

**Task Management** lets admins and managers create tasks with a title, description, priority level, deadline, and assignee. Staff see only their own assigned tasks. Any user with access to a task can leave comments and attach files. Tasks move through Pending, In Progress, Completed, and Cancelled statuses.

**Attendance Tracking** gives admins and managers a daily log for each employee with five status options: Present, Remote, Late, Half Day, and Absent. Clock in and clock out times are optional and the system calculates hours worked automatically. Staff can view their own monthly history but cannot create or edit records.

**Leave Management** allows any user to submit a leave request with a type, date range, and optional reason. The system calculates working days automatically, excluding weekends. Admins and managers review pending requests and approve or reject them with an optional note. Approving a request that covers today automatically sets the employee status to On Leave.

**Payroll** is an optional module that admins can enable or disable from the Settings page. When enabled it appears in the navigation for all users. It stores a provider name, currency, and pay day, and calculates the next upcoming pay date. It is designed as the configuration layer for a future connection to an external payroll service.

**Messaging** provides direct conversations between any two users. Conversations are threaded and sorted by recency. Receiving a message triggers an email notification if the recipient has that preference enabled.

**Reporting and Exports** let admins and managers export staff lists and task summaries as Excel or PDF files, with filters for department and date range.

**Announcements** allow admins and managers to send a broadcast email to all active staff who have the announcements preference enabled. Each send is recorded in the audit log with a recipient count.

**Weekly Digest** is a scheduled email sent every Monday morning containing each user's task summary for the week: completed, in progress, pending, overdue, and unread message count.

**Audit Logs** record every significant action in the system including approvals, role changes, task operations, setting changes, and exports. Admins and managers can browse the full log with timestamps and before-and-after data.

**Two-Factor Authentication** is available to all users via any TOTP app such as Google Authenticator or Authy. Enabling it requires scanning a QR code and confirming with a six-digit code. Disabling it requires the current code to confirm.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 with the App Router |
| Language | TypeScript |
| Styling | Tailwind CSS with CSS custom properties |
| ORM | Prisma v5 |
| Database | MySQL 8 |
| Authentication | JWT tokens stored in HTTP-only cookies |
| Email | Gmail via Nodemailer SMTP |
| Two-factor auth | TOTP via otplib with QR code generation |
| Deployment | Vercel with Vercel Cron for scheduled jobs |

---

## Roles and Access

| Role | What They Can Do |
|---|---|
| Admin | Everything. Manages users, approves registrations, controls system settings, views audit logs, runs backups, and can perform any action available to lower roles. |
| Manager | Creates and assigns tasks, views and edits staff profiles, approves leave requests, logs attendance, sends announcements, and views reports. Cannot access system settings, audit logs, or backup tools. |
| Staff | Views and updates their own assigned tasks, submits leave requests, views their own attendance records, sends and receives direct messages, and manages their own profile and notification preferences. |

The Payroll page is a special case. It is hidden for all roles by default and only appears when an Admin enables it from the System tab in Settings.

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy the example environment file and fill in your values
cp .env.example .env

# Apply the database schema
npx prisma db push

# Populate sample data
npx prisma db seed

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

After seeding, log in with the default admin account:

```
Email:    admin@staffos.com
Password: Admin@123
```

All other seeded staff accounts use the password `Staff@123`. See [docs/seed-data.md](./docs/seed-data.md) for the full list of seeded accounts and sample records.

---

## Environment Variables

Six environment variables are required. The application will not start correctly without all of them.

| Variable | Description |
|---|---|
| DATABASE_URL | Full MySQL connection string including host, port, credentials, and database name |
| JWT_SECRET | Long random string used to sign and verify all JWT tokens |
| NEXT_PUBLIC_APP_URL | The public URL of the deployed application, used in email links |
| GMAIL_USER | The Gmail address used as the sender for all outgoing emails |
| GMAIL_APP_PASSWORD | A 16-character Gmail App Password generated under Google Account security settings |
| CRON_SECRET | A random string used to authenticate the weekly digest cron endpoint |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Full details and instructions for configuring these in Vercel are in [docs/environment-variables.md](./docs/environment-variables.md).

---

## Deployment

StaffOS is designed to run on Vercel connected to a cloud MySQL database. The recommended database host is Aiven, which provides a free MySQL tier with external access suitable for Vercel deployments.

The high-level steps are:

1. Provision a MySQL database on Aiven and copy the connection string
2. Run `npx prisma db push` with that connection string to apply the schema
3. Import the repository into Vercel
4. Add all six environment variables to the Vercel project settings
5. Deploy

For the complete step by step guide including local setup on Arch Linux, schema update procedures, and cron job configuration, see [docs/deployment.md](./docs/deployment.md).

---

## API

StaffOS uses a RESTful API built on Next.js API Routes. Resources are nouns, HTTP methods define the action, and every response follows the same envelope:

```json
{ "success": true, "data": { } }
{ "success": false, "error": "Human readable message" }
```

All protected routes verify a JWT access token from an HTTP-only cookie. Role checks are performed independently inside each handler, not in middleware.

The full list of every route, its method, required role, and expected request body is in [docs/api-reference.md](./docs/api-reference.md).

---

## Documentation

The `docs` folder contains a full wiki covering every part of the system.

| Document | What It Covers |
|---|---|
| [Architecture](./docs/architecture.md) | Stack, folder structure, request lifecycle, deployment topology, design system |
| [Authentication](./docs/authentication.md) | Registration, login, JWT strategy, 2FA, email verification, email change, sessions |
| [Roles and Permissions](./docs/roles-and-permissions.md) | Full access matrix, route protection, how the payroll toggle affects visibility |
| [Database](./docs/database.md) | Every model, every field, all enums, schema management commands |
| [API Reference](./docs/api-reference.md) | Every endpoint with method, auth requirements, and request body |
| [Features](./docs/features.md) | Detailed description of every page and feature in the application |
| [Email System](./docs/email-system.md) | Transport setup, every email template, notification preferences |
| [Attendance](./docs/attendance.md) | Statuses, clock times, upsert behaviour, admin vs staff view |
| [Leave Management](./docs/leave-management.md) | Leave types, working days calculation, approval flow, cancellation |
| [Payroll](./docs/payroll.md) | Enabling and disabling, configuration options, next pay date calculation |
| [Environment Variables](./docs/environment-variables.md) | Every variable, how to generate secrets, local and Vercel configuration |
| [Deployment](./docs/deployment.md) | Database setup, Vercel setup, local setup, updating the schema |
| [Seed Data](./docs/seed-data.md) | All seeded accounts with credentials, departments, tasks, and sample records |
| [Cron Jobs](./docs/cron-jobs.md) | Weekly digest schedule, authentication, manual triggering, changing the schedule |