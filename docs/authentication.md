# Authentication

StaffOS uses a JWT-based authentication system with two tokens: a short-lived access token and a long-lived refresh token. Both are stored in HTTP-only cookies to prevent access by JavaScript.

---

## Token Strategy

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access token | 15 minutes | HTTP-only cookie | Authorises every API request |
| Refresh token | 7 days | HTTP-only cookie + database | Issues new access tokens |

When an access token expires, the client calls `/api/auth/refresh` with the refresh token. If the refresh token is valid and matches the one stored in the database, a new access token is issued. If the refresh token is also expired or missing, the user is redirected to the login page.

---

## Registration Flow

1. User submits name, email, and password on the register page
2. Password is hashed with bcrypt (12 rounds)
3. A new `User` record is created with `status: UNVERIFIED`
4. A 24-hour email verification token is generated and stored on the user record
5. A verification email is sent to the user's address
6. The user is redirected to a holding page asking them to check their email
7. Clicking the link in the email calls `GET /api/auth/verify-email?token=...`
8. The token is validated, and the user's status is updated to `PENDING`
9. All admins receive a notification that a new account is awaiting approval
10. An admin approves or rejects the account from the Staff page

### Resending Verification

If the user did not receive the email, they can request a new one. The login page shows a resend link when the server returns an UNVERIFIED error. The resend endpoint is `POST /api/auth/verify-email` with the user's email address.

---

## Login Flow

1. User submits email and password
2. The server checks the account status in order:
   - `UNVERIFIED`: rejected with a message to verify email first
   - `PENDING`: rejected with a message that the account is awaiting approval
   - `REJECTED`: rejected
   - `ACTIVE`: continues
3. The password is compared with bcrypt
4. If 2FA is enabled, a code is required before any token is issued
5. On success, an access token and refresh token are set as HTTP-only cookies
6. The refresh token hash is stored in the database on the User record

---

## Two-Factor Authentication

StaffOS supports TOTP-based 2FA compatible with Google Authenticator, Authy, and any RFC 6238 compliant app.

### Enabling 2FA

1. User navigates to Settings and clicks Enable 2FA
2. The server generates a TOTP secret and returns a QR code as a data URI
3. The user scans the QR code with their authenticator app
4. The user enters the 6-digit code to confirm
5. The server verifies the code and saves the encrypted secret to the database
6. 2FA is now required on every subsequent login

### Disabling 2FA

The user enters their current 6-digit code to confirm disabling. The secret is removed from the database.

### Login with 2FA

After correct email and password, the server checks if 2FA is enabled. If it is, the response includes a flag indicating a code is required. The client shows a code input. The code is verified against the stored secret before tokens are issued.

---

## Email Verification

New accounts must verify their email address before an admin can approve them.

The verification token is a random UUID stored in `verifyToken` on the User record alongside a `verifyTokenExpiry` timestamp set to 24 hours ahead.

Admin approval bypasses the email verification requirement. When an admin approves a pending account directly, `emailVerified` is set to true and the token is cleared.

---

## Email Change

The email change flow differs by role.

**Admin and Manager**: A confirmation link is sent to the new email address. The old email is not affected until the link is clicked. Clicking the link calls `GET /api/auth/confirm-email-change?token=...` which applies the change.

**Staff**: An email change request is submitted and must be approved by an admin before any change takes effect.

---

## Password Change

Authenticated users can change their password from the Security tab in Settings. The current password must be provided and verified before the new password is accepted.

---

## Session Management

The application does not support multiple simultaneous sessions per user at the database level. When a new login occurs, the refresh token on the User record is overwritten, which invalidates any previous session.

Logout clears both cookies and calls `DELETE /api/auth/logout` which removes the refresh token from the database.
