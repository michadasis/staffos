# Environment Variables

StaffOS reads configuration from environment variables. In development these are set in a `.env` file at the project root. In production they are set in the Vercel project dashboard under Settings, then Environment Variables.

---

## Required Variables

All of the following must be set for the application to function correctly.

### DATABASE_URL

The full MySQL connection string including credentials, host, port, and database name.

```
DATABASE_URL="mysql://username:password@host:port/database?sslaccept=accept_invalid_certs"
```

For Railway, this is found in your Railway project under the MySQL service, Connect tab, and then the connection string for the internal or public network depending on whether you are connecting from Vercel (public) or locally (public with the proxy URL).

The `sslaccept=accept_invalid_certs` parameter is required when connecting to Railway from outside the Railway network.

### JWT_SECRET

A long random string used to sign and verify JWT tokens. Anyone with this value can forge valid tokens, so it must be kept secret and should be at least 32 characters.

Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### NEXT_PUBLIC_APP_URL

The public URL of your deployed application. Used when generating email links for email verification and email change confirmation.

```
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

In development this should be `http://localhost:3000`.

### GMAIL_USER

The Gmail address used as the sender for all outgoing emails.

```
GMAIL_USER=your.address@gmail.com
```

### GMAIL_APP_PASSWORD

A 16-character App Password generated in your Google Account. This is not your normal Gmail password.

To generate one:
1. Go to your Google Account
2. Navigate to Security
3. Under Two-Step Verification, click App Passwords
4. Generate a new password for "Mail" on "Other" device
5. Copy the 16-character value shown

```
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

Spaces in the value are acceptable and do not need to be removed.

### CRON_SECRET

A secret string used to authenticate the weekly digest cron job. Vercel sends this in the `Authorization: Bearer` header when calling `/api/cron/weekly-digest`. Any sufficiently long random string works.

```
CRON_SECRET=another-long-random-string
```

Generate one the same way as JWT_SECRET.

---

## Summary Table

| Variable | Required | Where Used |
|---|---|---|
| DATABASE_URL | Yes | Every database query via Prisma |
| JWT_SECRET | Yes | Signing and verifying all JWT tokens |
| NEXT_PUBLIC_APP_URL | Yes | Email links for verification and email change |
| GMAIL_USER | Yes | Sender address for all outgoing email |
| GMAIL_APP_PASSWORD | Yes | SMTP authentication with Gmail |
| CRON_SECRET | Yes | Authenticating the weekly digest cron call |

---

## Local Development

Create a `.env` file in the project root:

```
DATABASE_URL="mysql://root:yourpassword@localhost:3306/staffos"
JWT_SECRET="your-local-secret-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GMAIL_USER="your.address@gmail.com"
GMAIL_APP_PASSWORD="your app password"
CRON_SECRET="local-cron-secret"
```

This file is listed in `.gitignore` and should never be committed to the repository.

---

## Vercel Configuration

In the Vercel dashboard:

1. Open your project
2. Go to Settings
3. Click Environment Variables
4. Add each variable for the Production environment
5. Redeploy after adding or changing variables

Changes to environment variables in Vercel do not take effect until the next deployment.
