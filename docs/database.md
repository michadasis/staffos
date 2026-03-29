# Database

StaffOS uses MySQL 8 accessed through Prisma ORM. The schema is defined in `prisma/schema.prisma`. Changes to the schema are applied with `npx prisma db push` for development or `npx prisma migrate deploy` for production migrations.

---

## Applying Schema Changes

```bash
# Push schema changes directly (development)
npx prisma db push

# Generate the Prisma client after schema changes
npx prisma generate

# Open Prisma Studio to browse data
npx prisma studio
```

---

## Enums

### Role
Controls user access level.
- `ADMIN`
- `MANAGER`
- `STAFF`

### AccountStatus
Tracks the state of a user account through the registration lifecycle.
- `UNVERIFIED` - registered but email not confirmed
- `PENDING` - email verified, awaiting admin approval
- `ACTIVE` - approved and able to log in
- `REJECTED` - denied by an admin

### EmployeeStatus
The current working status of an employee.
- `ACTIVE`
- `ON_LEAVE`
- `INACTIVE`

### TaskStatus
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### TaskPriority
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

### LeaveType
- `ANNUAL`
- `SICK`
- `UNPAID`
- `MATERNITY`
- `PATERNITY`
- `OTHER`

### LeaveStatus
- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

### AttendanceStatus
- `PRESENT`
- `ABSENT`
- `LATE`
- `HALF_DAY`
- `REMOTE`

---

## Models

### User

The core authentication and identity record. Every person in the system has a User record.

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| email | String | Unique |
| password | String | bcrypt hash |
| name | String | Display name |
| role | Role | ADMIN, MANAGER, or STAFF |
| status | AccountStatus | Account lifecycle state |
| twoFactorSecret | String? | Encrypted TOTP secret |
| twoFactorEnabled | Boolean | Whether 2FA is active |
| emailVerified | Boolean | Confirmed via email link |
| verifyToken | String? | Unique token for email verification |
| verifyTokenExpiry | DateTime? | Token expires after 24 hours |
| pendingEmail | String? | New email awaiting confirmation |
| emailChangeToken | String? | Token sent to new email address |
| emailChangeTokenExpiry | DateTime? | |
| notifTaskAssigned | Boolean | Email on task assignment |
| notifNewMessage | Boolean | Email on new direct message |
| notifAnnouncements | Boolean | Email for team announcements |
| notifWeeklyDigest | Boolean | Monday summary email |
| avatar | String? | URL or base64 image |
| refreshToken | String? | Stored as Text for length |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Relations: one Employee, many AuditLogs, many EmailChangeRequests, many sent Messages, many received Messages, many reviewed LeaveRequests, many recorded WorkHistory entries.

---

### Employee

Extends the User record with employment details. Every active user has one Employee record linked via a unique userId.

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| userId | Int | Unique FK to User |
| departmentId | Int? | FK to Department |
| supervisorId | Int? | FK to another Employee |
| jobTitle | String? | |
| phone | String? | |
| address | String? | |
| joinDate | DateTime | |
| status | EmployeeStatus | |

Relations: many Documents, many AssignedTasks, many CreatedTasks, many ActivityLogs, many WorkHistory, many PerformanceReports, many Attendance, many LeaveRequests, subordinates (other Employees).

---

### Department

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| name | String | Unique |
| description | String? | |
| createdAt | DateTime | |

Relations: many Employees, many Tasks.

---

### Task

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| title | String | |
| description | String? | Text |
| departmentId | Int? | |
| assigneeId | Int? | FK to Employee |
| createdById | Int | FK to Employee |
| status | TaskStatus | |
| priority | TaskPriority | |
| deadline | DateTime? | |
| completedAt | DateTime? | |

Relations: many TaskComments.

---

### TaskComment

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| taskId | Int | |
| authorId | Int | User id |
| content | String | Text |
| fileName | String? | Attachment name |
| fileType | String? | MIME type |
| fileData | String? | Base64 encoded, LongText |

---

### Document

Employee documents stored as base64.

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| employeeId | Int | |
| name | String | Display name |
| type | String | MIME type |
| url | String | Base64 data, LongText |
| size | Int? | File size in bytes |
| uploadedAt | DateTime | |

---

### Attendance

One record per employee per day. The unique constraint is on (employeeId, date).

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| employeeId | Int | |
| date | DateTime | Normalised to midnight |
| clockIn | DateTime? | |
| clockOut | DateTime? | |
| status | AttendanceStatus | |
| note | String? | |

---

### LeaveRequest

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| employeeId | Int | |
| type | LeaveType | |
| status | LeaveStatus | |
| startDate | DateTime | |
| endDate | DateTime | |
| days | Int | Working days calculated on creation |
| reason | String? | Text |
| reviewedById | Int? | FK to User |
| reviewNote | String? | Text |
| reviewedAt | DateTime? | |

---

### WorkHistory

An audit trail of employment changes for each employee.

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| employeeId | Int | |
| type | String | ROLE_CHANGE, DEPARTMENT_TRANSFER, STATUS_CHANGE, PROMOTION, NOTE, JOINED |
| title | String | Short description |
| description | String? | Text |
| fromValue | String? | Previous value |
| toValue | String? | New value |
| recordedById | Int? | FK to User |
| occurredAt | DateTime | When the change happened |

---

### PerformanceReport

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| employeeId | Int | |
| period | String | e.g. "2026-Q1" |
| score | Float | 0 to 100 |
| tasksTotal | Int | |
| tasksDone | Int | |
| notes | String? | |

---

### Message

Direct messages between users.

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| senderId | Int | FK to User |
| receiverId | Int | FK to User |
| content | String | Text |
| read | Boolean | |
| createdAt | DateTime | |

---

### AuditLog

Every significant system action is recorded here.

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| userId | Int | Who performed the action |
| action | String | e.g. UPDATE_SYSTEM_SETTINGS |
| entity | String | e.g. SystemSetting |
| entityId | Int? | |
| before | Json? | State before the change |
| after | Json? | State after the change |
| ip | String? | Request IP address |
| createdAt | DateTime | |

---

### SystemSetting

Key-value store for global feature flags and configuration.

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| key | String | Unique |
| value | String | Text |
| updatedAt | DateTime | |
| updatedById | Int? | FK to User |

Current keys used by the application:

| Key | Default | Description |
|---|---|---|
| payrollEnabled | false | Shows or hides the Payroll page for all users |
| payrollCurrency | USD | Display currency for payroll |
| payrollPayDay | 25 | Day of the month for pay |
| payrollProvider | (empty) | Name of the external payroll provider |

---

### EmailChangeRequest

Tracks staff-initiated email change requests awaiting admin approval.

| Field | Type | Notes |
|---|---|---|
| id | Int | Primary key |
| userId | Int | FK to User |
| newEmail | String | |
| status | String | PENDING, APPROVED, REJECTED |
| reviewedById | Int? | |
| createdAt | DateTime | |
