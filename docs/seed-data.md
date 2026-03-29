# Seed Data

The seed script at `prisma/seed.js` populates the database with realistic sample data for development and demonstration purposes. Run it with:

```bash
npx prisma db seed
```

Or against a remote database:

```bash
DATABASE_URL="your-connection-string" npx prisma db seed
```

The seed uses upsert operations so it is safe to run multiple times. It will not create duplicates.

---

## Departments

Seven departments are created:

- Engineering
- Design
- Marketing
- Finance
- HR
- Operations
- Sales

---

## User Accounts

### Admin

| Field | Value |
|---|---|
| Email | admin@staffos.com |
| Password | Admin@123 |
| Role | Admin |
| Department | Operations |
| Job Title | System Administrator |

### Staff and Managers

All staff accounts use the password `Staff@123`.

| Name | Email | Role | Department | Title |
|---|---|---|---|---|
| Alexandra Chen | a.chen@staffos.com | Manager | Engineering | Engineering Manager |
| Marcus Williams | m.williams@staffos.com | Staff | Design | Senior Designer |
| Priya Patel | p.patel@staffos.com | Staff | Marketing | Marketing Specialist |
| James Okafor | j.okafor@staffos.com | Manager | Operations | Operations Manager |
| Sofia Martinez | s.martinez@staffos.com | Staff | Engineering | Software Engineer |
| Lucas Kim | l.kim@staffos.com | Staff | Finance | Financial Analyst |
| Rachel Osei | r.osei@staffos.com | Staff | HR | HR Coordinator |
| David Nguyen | d.nguyen@staffos.com | Staff | Sales | Account Executive |
| Elena Brown | e.brown@staffos.com | Staff | Engineering | Frontend Developer |
| Tariq Hassan | t.hassan@staffos.com | Manager | Finance | Finance Manager |

---

## Tasks

Twelve tasks are created across all departments with a mix of statuses (Pending, In Progress, Completed) and priorities. Deadlines are distributed in the past and future relative to the seed date, creating a realistic mix of current, upcoming, and overdue tasks.

---

## Messages

Seven direct messages are created between various users including unread messages to simulate activity on the messages page.

---

## Attendance

Ten working days of attendance records are created for the first five staff members. Records include a mix of Present, Remote, Late, and Half Day statuses with clock-in and clock-out times.

---

## Leave Requests

Eight leave requests are created across multiple employees with different types and statuses:

- Two requests are Pending and awaiting review
- Five requests are Approved, some in the past and some upcoming
- One is a historical paternity leave

---

## Work History

Four work history entries are created to demonstrate the timeline feature on employee profiles:

- A promotion for Alexandra Chen
- A department transfer for Marcus Williams
- A role confirmation for Sofia Martinez
- An Employee of the Month note for Priya Patel

---

## System Settings

Three system setting records are created with their default values:

| Key | Value |
|---|---|
| payrollEnabled | false |
| payrollCurrency | USD |
| payrollPayDay | 25 |

---

## Re-seeding

If you want to reset the database to a clean state before re-seeding:

```bash
# Drop and recreate all tables
npx prisma db push --force-reset

# Then seed again
npx prisma db seed
```

Note that `--force-reset` deletes all data permanently.
