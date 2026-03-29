# StaffOS Wiki

StaffOS is a full-stack staff management platform built on Next.js 14, Prisma, and MySQL. It handles employee management, task tracking, attendance, leave, payroll configuration, messaging, and more — all behind a role-based access system.

This wiki covers every part of the system. Use the pages below as your reference.

---

## Pages

- [Architecture](./architecture.md) — stack, folder structure, deployment topology
- [Authentication](./authentication.md) — login, registration, JWT, 2FA, email verification
- [Roles and Permissions](./roles-and-permissions.md) — what each role can access and do
- [Database](./database.md) — full schema reference, all models and fields
- [API Reference](./api-reference.md) — every API route, method, and expected payload
- [Features](./features.md) — detailed breakdown of every feature in the application
- [Email System](./email-system.md) — email sending, templates, and notification preferences
- [Attendance](./attendance.md) — logging, statuses, and viewing records
- [Leave Management](./leave-management.md) — requesting, approving, and tracking leave
- [Payroll](./payroll.md) — enabling payroll, configuration, and what it controls
- [Environment Variables](./environment-variables.md) — every variable the app requires
- [Deployment](./deployment.md) — step by step guide for Vercel and Railway
- [Seed Data](./seed-data.md) — default accounts, departments, and sample records
- [Cron Jobs](./cron-jobs.md) — scheduled tasks and how to configure them

---

## Quick Start

1. Clone the repository and install dependencies with `npm install`
2. Copy `.env.example` to `.env` and fill in all required values
3. Run `npx prisma db push` to apply the schema to your database
4. Run `npx prisma db seed` to populate sample data
5. Start the development server with `npm run dev`

Default admin login after seeding:

```
Email:    admin@staffos.com
Password: Admin@123
```
