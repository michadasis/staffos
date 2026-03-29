# API Reference

All API routes live under `/api/`. Every response follows the same envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Human readable message" }
```

All protected routes require a valid JWT access token in the `staffos_token` cookie. Token verification happens inside each handler.

---

## Authentication

### POST /api/auth/register
Creates a new user account with status UNVERIFIED. Sends a verification email.

Body: `{ name, email, password }`

### POST /api/auth/login
Authenticates a user and sets cookie tokens.

Body: `{ email, password, code? }` where `code` is the 6-digit TOTP code if 2FA is enabled.

### POST /api/auth/logout
Clears cookies and removes the refresh token from the database.

### POST /api/auth/refresh
Issues a new access token using the refresh token cookie.

### GET /api/auth/verify-email?token=...
Verifies an email address and sets status to PENDING. Notifies admins.

### POST /api/auth/verify-email
Resends a verification email. Body: `{ email }`

### GET /api/auth/confirm-email-change?token=...
Applies a pending email change after the user clicks the link in their new inbox.

### GET /api/auth/2fa
Returns a QR code and TOTP secret for setting up 2FA. Admin or Manager only sets up their own.

### POST /api/auth/2fa
Confirms and enables 2FA. Body: `{ code }` (6-digit TOTP code to verify setup).

### DELETE /api/auth/2fa
Disables 2FA. Body: `{ code }` (current TOTP code to confirm).

### POST /api/auth/change-password
Changes the authenticated user's password. Body: `{ currentPassword, newPassword }`

### POST /api/auth/email-change
Initiates an email change. Admin and Manager trigger a confirmation link. Staff submit a request for admin approval. Body: `{ newEmail }`

### GET /api/auth/notification-prefs
Returns the current user's four notification preference booleans.

### PATCH /api/auth/notification-prefs
Updates one or more notification preferences. Body: any subset of `{ notifTaskAssigned, notifNewMessage, notifAnnouncements, notifWeeklyDigest }`

---

## Staff

### GET /api/staff
Returns a paginated list of users with employee details. Supports `?page`, `?limit`, `?search`, `?department`, `?status` query params. Admin and Manager only.

### GET /api/staff/[id]
Returns a single user with full employee details including department, supervisor, documents, work history, and performance reports.

### PATCH /api/staff/[id]
Updates a user's profile fields. Body can include: `{ name, jobTitle, phone, address, departmentId, supervisorId, role, status }`

### DELETE /api/staff/[id]
Deletes a user and their employee record. Admin only.

### GET /api/staff/pending
Returns all users with PENDING or UNVERIFIED status. Admin and Manager only.

### PATCH /api/staff/pending
Approves or rejects a registration. Body: `{ userId, action }` where action is `approve` or `reject`.

### POST /api/staff/pending
Resends a verification email to an UNVERIFIED user. Body: `{ userId }`

---

## Tasks

### GET /api/tasks
Returns tasks. Staff see only their assigned tasks. Admin and Manager see all. Supports `?status`, `?priority`, `?departmentId`, `?assigneeId` filters.

### POST /api/tasks
Creates a task. Admin and Manager only. Body: `{ title, description?, priority, status, departmentId?, assigneeId?, deadline? }`

### GET /api/tasks/[id]
Returns a single task with comments.

### PATCH /api/tasks/[id]
Updates a task. Staff can update status only on tasks assigned to them.

### DELETE /api/tasks/[id]
Deletes a task. Admin only.

### POST /api/tasks/[id]/comments
Adds a comment to a task. Body: `{ content, authorId, fileName?, fileType?, fileData? }`

---

## Attendance

### GET /api/attendance
Returns attendance records. Supports `?employeeId`, `?month` (YYYY-MM format), `?page`, `?limit`. Staff see only their own records.

### POST /api/attendance
Creates or updates an attendance record for a given employee and date. Admin and Manager only. Uses upsert on the unique (employeeId, date) constraint. Body: `{ employeeId, date, status, clockIn?, clockOut?, note? }`

### DELETE /api/attendance
Deletes a record by id. Admin and Manager only. Body: `{ id }`

---

## Leave

### GET /api/leave
Returns leave requests. Staff see only their own. Supports `?status` and `?employeeId` filters.

### POST /api/leave
Creates a leave request. Working days are calculated automatically, excluding weekends. Body: `{ type, startDate, endDate, reason?, employeeId? }` where employeeId is only honoured for Admin and Manager.

### PATCH /api/leave
Reviews or cancels a request. Body: `{ id, action, reviewNote? }` where action is `approve`, `reject`, or `cancel`. Staff can only cancel their own pending requests. Approving a leave that covers today sets the employee status to ON_LEAVE.

### DELETE /api/leave
Deletes a leave request. Admin only. Body: `{ id }`

---

## System Settings

### GET /api/system-settings
Returns all system settings as a flat key-value object. Authenticated users only.

### PATCH /api/system-settings
Updates one or more settings. Admin only. Body: any key-value pairs from the settings schema. Changes are audit logged.

---

## Messages

### GET /api/messages
Returns conversations for the current user, grouped by the other participant.

### POST /api/messages
Sends a message. Body: `{ receiverId, content }`. If the receiver has `notifNewMessage` enabled, an email notification is sent.

### PATCH /api/messages/[id]
Marks a message as read.

---

## Announcements

### POST /api/announcements
Sends an announcement email to all active users with `notifAnnouncements` enabled. Admin and Manager only. Body: `{ subject, body }`. The action is audit logged with a recipient count.

---

## Departments

### GET /api/departments
Returns all departments.

### POST /api/departments
Creates a department. Admin only. Body: `{ name, description? }`

### PATCH /api/departments/[id]
Updates a department. Admin only.

### DELETE /api/departments/[id]
Deletes a department if it has no employees or tasks. Admin only.

---

## Performance

### GET /api/performance
Returns performance reports. Supports `?employeeId` filter.

### POST /api/performance
Creates a performance report. Admin and Manager only.

---

## Reports

### GET /api/reports/staff
Returns a full staff export as JSON for Excel or PDF generation.

### GET /api/reports/tasks
Returns task completion statistics.

---

## Backup

### GET /api/backup
Returns a full JSON export of all data. Admin only.

---

## Cron

### GET /api/cron/weekly-digest
Sends the weekly digest email to all active users with `notifWeeklyDigest` enabled. Protected by the `Authorization: Bearer {CRON_SECRET}` header. Called automatically by Vercel Cron on Monday mornings.

---

## Test

### GET /api/test-email
Tests the Gmail SMTP connection and sends a test email to GMAIL_USER. Admin only. Returns `{ sentTo }` on success.
