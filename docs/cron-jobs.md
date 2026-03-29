# Cron Jobs

StaffOS has one scheduled job: the weekly digest. It runs automatically on Vercel using Vercel Cron.

---

## Weekly Digest

**Endpoint**: `GET /api/cron/weekly-digest`

**Schedule**: Every Monday at 08:00 UTC

**Defined in**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

The schedule uses standard cron syntax: minute, hour, day of month, month, day of week. `0 8 * * 1` means at minute 0, hour 8, any day of the month, any month, on Monday (1).

---

## Authentication

The endpoint is protected by a bearer token. Vercel automatically includes the `CRON_SECRET` environment variable as the bearer token when calling cron endpoints. The handler verifies this:

```typescript
const authHeader = req.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return err("Unauthorized", 401);
}
```

Any request without the correct token receives a 401 response. This prevents the endpoint from being triggered by external parties.

---

## What It Does

When the endpoint is called:

1. All active users with `notifWeeklyDigest` set to true are fetched
2. For each user, the following is queried:
   - Tasks completed in the last 7 days
   - Tasks currently in progress
   - Tasks in pending status
   - Overdue tasks (past deadline, not completed or cancelled) with their titles
   - Unread message count
3. A digest email is sent to each eligible user with their personalised stats

---

## Availability

Vercel Cron is only available on paid Vercel plans (Pro and above). On the free Hobby plan, the cron configuration in `vercel.json` is ignored and the job does not run automatically.

To use the digest on a free plan, you would need to trigger it manually or via an external cron service such as cron-job.org or GitHub Actions.

---

## Triggering Manually

You can call the endpoint directly with the correct secret:

```bash
curl -X GET \
  -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/weekly-digest
```

This sends digests to all eligible users immediately, regardless of the day of the week.

---

## Testing Locally

In local development, call the endpoint with a matching secret:

```bash
curl -X GET \
  -H "Authorization: Bearer local-cron-secret" \
  http://localhost:3000/api/cron/weekly-digest
```

Make sure `CRON_SECRET` in your `.env` matches the value in the header.

---

## Changing the Schedule

Edit `vercel.json` and redeploy. Some examples:

| Schedule | Meaning |
|---|---|
| `0 8 * * 1` | Every Monday at 08:00 UTC |
| `0 9 * * 1` | Every Monday at 09:00 UTC |
| `0 8 * * 5` | Every Friday at 08:00 UTC |
| `0 6 1 * *` | First day of every month at 06:00 UTC |

All times are UTC. Adjust the hour based on your team's timezone.
