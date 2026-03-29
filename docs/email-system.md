# Email System

StaffOS sends email through Gmail using Nodemailer with SMTP and an App Password. All email logic lives in `src/lib/email.ts`.

---

## Configuration

The following environment variables are required for email to work:

```
GMAIL_USER=your.address@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

The App Password is a 16-character password generated in your Google Account under Security, Two-Step Verification, App Passwords. It is not your normal Gmail password.

---

## Transport Setup

```typescript
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});
```

---

## Email Templates

All templates are HTML emails with inline styles. Each template is a function that accepts relevant data and returns a `mailOptions` object passed to `transporter.sendMail`.

### Verification Email

Sent when a new user registers. Contains a link with the verification token valid for 24 hours.

```typescript
sendVerificationEmail(to: string, name: string, token: string)
```

### Resend Verification Email

Same as the verification email but triggered manually by the user or by an admin.

```typescript
sendResendVerificationEmail(to: string, name: string, token: string)
```

### Email Change Confirmation

Sent to the new email address when an Admin or Manager requests an email change. Contains a confirmation link that applies the change when clicked.

```typescript
sendEmailChangeConfirmationEmail(to: string, name: string, token: string, newEmail: string)
```

### Admin Notification: New Registration

Sent to all admins when a new user verifies their email and is waiting for approval.

### Announcement Email

Sent to all eligible users when an announcement is composed and sent.

```typescript
sendAnnouncementEmail(to: string, name: string, subject: string, body: string, senderName: string)
```

### Task Assignment Email

Sent to the assigned employee when a task is created or reassigned. Only sent if the user has `notifTaskAssigned` enabled.

### New Message Email

Sent to the message recipient when they receive a direct message. Only sent if the user has `notifNewMessage` enabled.

### Weekly Digest Email

Sent every Monday by the cron job. Contains the user's task stats and unread message count.

```typescript
sendWeeklyDigestEmail(to: string, name: string, stats: {
  overdueCount: number,
  inProgressCount: number,
  pendingCount: number,
  completedThisWeek: number,
  unreadMessages: number,
  overdueTasks: { title: string }[]
})
```

---

## Notification Preferences

Each user has four boolean flags that control which emails they receive. These are stored on the User model and can be toggled from the Notifications tab in Settings.

| Flag | Default | Controls |
|---|---|---|
| notifTaskAssigned | true | Email when a task is assigned to the user |
| notifNewMessage | true | Email when a direct message is received |
| notifAnnouncements | true | Email for team-wide announcements |
| notifWeeklyDigest | true | Monday morning summary email |

Before sending any notification email, the relevant handler checks the recipient's preference flag and skips the send if it is false.

---

## Testing the Email Connection

There is an admin-only endpoint for verifying that the Gmail connection is working:

```
GET /api/test-email
```

This tests the SMTP transport and sends a test message to `GMAIL_USER`. The response includes `{ sentTo }` on success or an error description on failure.
