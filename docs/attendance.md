# Attendance

The attendance system lets Admins and Managers record daily attendance for employees. Staff can view their own history but cannot create or modify records.

---

## How Records Work

Each record represents one employee on one calendar day. The combination of employee and date is unique, so submitting a record for the same employee and date as an existing record updates it rather than creating a duplicate. This uses Prisma's upsert operation under the hood.

The date is always normalised to midnight (00:00:00) before storage so that time-of-submission does not affect the date key.

---

## Statuses

| Status | When to Use |
|---|---|
| Present | Employee worked a full day in the office |
| Remote | Employee worked a full day from a remote location |
| Late | Employee arrived after the normal start time |
| Half Day | Employee worked approximately half the normal hours |
| Absent | Employee did not work and has no approved leave for this day |

---

## Clock Times

Clock-in and clock-out times are optional. When both are provided, the hours worked is displayed in the table. The hours value is calculated as `(clockOut - clockIn) / 3600000` rounded to one decimal place.

Times are stored as full DateTime values but displayed in local time using `toLocaleTimeString`.

---

## Logging Attendance

Admins and Managers access the attendance log form by clicking the Log Attendance button. The form requires:
- Employee (selected from a dropdown of all active staff)
- Date
- Status

Clock-in, clock-out, and a note are optional.

Submitting the form calls `POST /api/attendance`. If a record already exists for that employee on that date, it is overwritten.

---

## Viewing Records

The attendance page defaults to the current month. The month picker changes the displayed period. Admins and Managers can also filter by a specific employee using the dropdown.

A summary row at the top of the page shows the total count of each status for the selected filters. This gives a quick overview of attendance patterns.

---

## Editing and Deleting

Each row in the table has Edit and Delete buttons visible to Admins and Managers. Clicking Edit pre-fills the log form with the existing record's values. Clicking Delete removes the record after confirmation.

---

## Staff View

Staff members see the same page but without the Log Attendance button, Edit buttons, Delete buttons, or the employee filter dropdown. They see their own records for the selected month with the same summary stats.
