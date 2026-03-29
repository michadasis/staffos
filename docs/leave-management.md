# Leave Management

The leave system handles time-off requests from all staff. Any user can submit a request. Admins and Managers review and decide on pending requests.

---

## Leave Types

| Type | Typical Use |
|---|---|
| Annual | Planned holiday or personal time off |
| Sick | Illness or medical appointments |
| Unpaid | Time off without pay |
| Maternity | Parental leave for the birthing parent |
| Paternity | Parental leave for the non-birthing parent |
| Other | Any leave that does not fit the above categories |

---

## Working Days Calculation

When a request is submitted, the number of working days is calculated automatically. The calculation counts every day from start date to end date inclusive, excluding Saturdays and Sundays. Public holidays are not currently factored in.

This value is stored on the LeaveRequest record and displayed on the request card.

---

## Submitting a Request

Any user can submit a request from the Leave page by clicking Request Leave. The form requires:
- Leave type
- Start date
- End date

A reason is optional. If the end date is before the start date, the request is rejected with a validation error.

Admins and Managers submitting on behalf of another employee can select a staff member from a dropdown. Staff submitting the form always create a request for themselves.

---

## Request Statuses

| Status | Meaning |
|---|---|
| Pending | Awaiting review by an Admin or Manager |
| Approved | Accepted by a reviewer |
| Rejected | Declined by a reviewer |
| Cancelled | Withdrawn by the requesting employee |

---

## Reviewing Requests

Admins and Managers see a Review button on any Pending request. Clicking it opens a modal showing the request details and a text field for an optional review note. The reviewer can approve or reject from this modal.

On approval, if the leave period includes today's date, the employee's status is automatically set to ON_LEAVE. This updates their badge on the staff list.

---

## Cancelling a Request

Staff can cancel their own requests while they are still in Pending status. A Cancel button appears on their own pending requests. Approved or rejected requests cannot be cancelled.

---

## Filtering

The leave page has filter buttons for All, Pending, Approved, Rejected, and Cancelled. Clicking a filter shows only requests matching that status.

Admins and Managers see all requests across all employees. Staff see only their own.

---

## Summary Stats

Four stat cards at the top of the page show the count of requests in each status. The counts update whenever the filter or data changes.
