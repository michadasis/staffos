# Features

This page describes every feature in StaffOS in detail.

---

## Dashboard

The dashboard is the landing page after login. It shows a summary of the most important data for the logged-in user's role.

**Admin and Manager** see:
- Total headcount and counts by status (active, on leave, inactive)
- Task summary: pending, in progress, completed, overdue
- Recent activity from audit logs
- Upcoming deadlines
- Unread message count

**Staff** see:
- Their assigned tasks and status breakdown
- Upcoming leave they have approved
- Recent messages
- Their attendance summary for the current month

---

## Staff Management

Available to Admin and Manager. The staff page lists all employees with search, department filter, and status filter. Each row shows the employee name, job title, department, status badge, and quick action buttons.

Clicking a staff member opens a detail panel with tabs:

**Profile tab**: name, email, job title, phone, address, join date, department, supervisor, role, account status.

**Documents tab**: upload and download employee documents. Files are stored as base64 in the database. Supported types include PDF, images, and common office formats.

**Work History tab**: a timeline of employment changes. Admins can add notes, record promotions, department transfers, and role changes. Each entry shows what changed, the old and new values, and who recorded it.

**Performance tab**: historical performance reports showing score, task completion rate, and notes by period.

Admins can edit all fields on any employee. Managers can edit fields on employees within their access scope. Staff cannot access other employee profiles.

### Pending Registrations

A separate section on the Staff page shows all accounts with PENDING or UNVERIFIED status. Admins and Managers can:
- Approve a pending account, which sets it to ACTIVE
- Reject an account with an optional reason
- Resend a verification email to an UNVERIFIED account

---

## Task Management

Tasks can be created by Admins and Managers. Each task has:
- Title and description
- Priority: Low, Medium, High, or Critical
- Status: Pending, In Progress, Completed, or Cancelled
- Assignee (an employee)
- Department
- Deadline

**Staff** see only tasks assigned to them and can update the status.

**Admins and Managers** see all tasks and can edit any field, reassign, or delete.

Tasks with past deadlines and a non-completed status are considered overdue and are highlighted accordingly.

### Task Comments

Any user with access to a task can add comments. Comments support file attachments stored as base64. Attachments can be downloaded from the comment.

---

## Performance Reports

Admins and Managers can generate and view performance reports for employees. Each report covers a defined period and includes a numeric score, the total number of tasks, the number completed, and optional notes.

Reports are displayed as a timeline on the employee's profile and can be compared across periods.

---

## Messages

StaffOS includes a built-in direct messaging system. Any user can send a message to any other user.

The messages page has a conversation list on the left and a chat panel on the right. Conversations are sorted by most recent message. Unread counts are shown per conversation.

Sending a message to a user who has `notifNewMessage` enabled triggers an email notification to their address.

---

## Attendance Tracking

Admins and Managers can log attendance records for any employee. Staff can view their own records but cannot create or edit them.

### Statuses

| Status | Meaning |
|---|---|
| Present | Full day in office |
| Remote | Full day working from home |
| Late | Arrived after the expected start time |
| Half Day | Worked approximately half the day |
| Absent | Did not work, not on approved leave |

### Clock Times

Each record can optionally include a clock-in and clock-out time. If both are present, the hours worked is calculated and displayed automatically.

### Views

Records can be filtered by month and by employee. The page shows a summary row at the top with total counts for each status in the selected period. The table below shows each day with status, times, hours, and any notes.

---

## Leave Management

Any user can submit a leave request. The system calculates working days automatically, excluding weekends.

### Leave Types

Annual, Sick, Unpaid, Maternity, Paternity, and Other.

### Request Flow

1. User submits a request with type, start date, end date, and an optional reason
2. The request appears as PENDING in the leave list
3. An Admin or Manager reviews the request
4. They approve or reject it, optionally adding a review note
5. If approved, the employee's status is set to ON_LEAVE if the leave covers today's date
6. The user can cancel their own PENDING requests

### Filtering

The leave page supports filtering by status. Admins and Managers see all requests. Staff see only their own.

---

## Payroll

Payroll is an optional feature controlled by a system-level toggle. It is disabled by default.

**Enabling payroll**: An Admin navigates to Settings and opens the System tab. Toggling the Payroll Integration switch on saves the setting and makes the Payroll page visible in the navigation for all users. A page reload is required after toggling for the navigation to update.

**Configuration options**:
- Payroll Provider: the name of the external payroll service (e.g. Gusto, ADP, Xero)
- Currency: the display currency for payroll
- Pay Day: the day of the month on which salary is paid

The Payroll page displays the next calculated pay date based on the configured pay day.

When payroll is disabled by an admin, the page disappears from the navigation for all users immediately on their next page load.

---

## Reporting and Exports

The Reports page is available to Admin and Manager. It provides data exports in multiple formats.

Exports available:
- Staff list as Excel
- Task summary as Excel or PDF
- Attendance summary by period
- Leave summary by period

Reports can be filtered by department and date range before exporting.

---

## Audit Logs

Every significant action in the system is recorded in the audit log. This includes:
- User approvals and rejections
- Role changes
- Task creation, updates, and deletion
- System setting changes
- Email change approvals
- Announcement sends (with recipient count)
- Backup exports

The audit log page is available to Admins and Managers. Each entry shows the timestamp, the user who performed the action, the action name, the affected entity, and a before-and-after view of changed data where applicable.

---

## Backup

Admins can export a full JSON snapshot of all database data from the Backup page. The export includes all users, employees, departments, tasks, messages, leave requests, attendance records, and audit logs.

The JSON file is downloaded directly to the browser.

---

## Settings

The Settings page has four tabs.

**Profile**: Update display name and job title. Request an email address change.

**Security**: Change password with strength indicator. Enable or disable two-factor authentication.

**Notifications**: Toggle four email notification types individually. Admins and Managers also see an announcement composer here.

**System** (Admin only): Toggle the Payroll Integration feature on or off.

---

## Announcements

Admins and Managers can send a broadcast email to all active users who have the Announcements notification preference enabled. The compose button is in the Notifications tab of Settings. Each announcement requires a subject and a body. After sending, the action is recorded in the audit log with the number of recipients.

---

## Weekly Digest

Every Monday morning at 8:00 AM, a digest email is automatically sent to all active users who have the Weekly Digest preference enabled. The digest includes:
- Tasks completed in the past week
- Tasks currently in progress
- Pending tasks
- Overdue tasks with their titles listed
- Unread message count

The digest is sent by the Vercel Cron job at `/api/cron/weekly-digest`.
