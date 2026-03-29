# Deployment

StaffOS is deployed to Vercel with the database hosted on Railway. This page covers the full setup process from scratch.

---

## Prerequisites

- A GitHub account with the StaffOS repository pushed to it
- A Vercel account (free tier is sufficient)
- A Railway account (free tier is sufficient for small teams)
- A Gmail account with 2FA enabled for App Passwords

---

## Step 1: Set Up the Database on Railway

1. Log in to Railway at railway.app
2. Create a new project
3. Click Add Service and choose Database, then MySQL
4. Wait for the service to provision
5. Click on the MySQL service and go to the Connect tab
6. Copy the Public Network connection string. It will look like:

```
mysql://root:password@metro.proxy.rlwy.net:PORT/railway
```

Save this as your `DATABASE_URL`. Append `?sslaccept=accept_invalid_certs` to the end.

---

## Step 2: Apply the Schema

On your local machine with the project checked out:

```bash
DATABASE_URL="your-railway-connection-string" npx prisma db push
```

This creates all tables, enums, and indexes defined in `prisma/schema.prisma`.

To seed sample data:

```bash
DATABASE_URL="your-railway-connection-string" npx prisma db seed
```

---

## Step 3: Deploy to Vercel

1. Log in to Vercel at vercel.com
2. Click Add New, then Project
3. Import your GitHub repository
4. Vercel will detect Next.js automatically
5. Before clicking Deploy, open the Environment Variables section
6. Add all required variables (see [Environment Variables](./environment-variables.md))
7. Click Deploy

The first deployment will build and deploy the application. Subsequent pushes to the main branch trigger automatic redeployments.

---

## Step 4: Verify the Deployment

After deployment completes:

1. Visit your Vercel URL
2. You should see the StaffOS login page
3. Log in with `admin@staffos.com` and `Admin@123` if you ran the seed
4. Navigate to Settings, find the Notifications tab, and use the test email option to verify email is working

---

## Step 5: Configure the Cron Job

The weekly digest cron job is defined in `vercel.json`:

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

This runs at 08:00 UTC every Monday. Vercel Cron is only available on paid Vercel plans. The cron job calls the endpoint with `Authorization: Bearer {CRON_SECRET}` automatically when Vercel triggers it.

To test the cron manually:

```bash
curl -H "Authorization: Bearer your-cron-secret" https://your-app.vercel.app/api/cron/weekly-digest
```

---

## Local Development

```bash
# Install dependencies
npm install

# Set up local environment variables
cp .env.example .env
# Edit .env with your values

# Apply schema to local database
npx prisma db push

# Seed sample data
npx prisma db seed

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Updating the Schema

When you make changes to `prisma/schema.prisma`, apply them to the production database before deploying the new code:

```bash
DATABASE_URL="your-railway-connection-string" npx prisma db push
```

Then commit and push your code changes. Vercel will redeploy automatically.

Do not use `prisma migrate dev` in production. Use `prisma db push` for Railway-hosted databases.

---

## Monitoring

Vercel provides logs for every function invocation. To view logs:

1. Open your project in the Vercel dashboard
2. Click the Deployments tab
3. Click on a deployment
4. Click Functions to see per-route logs

Railway provides connection metrics and query logs for the MySQL service under the Metrics and Logs tabs of the database service.

---

## Local Database Setup on Arch Linux

StaffOS uses MySQL-compatible queries. Arch Linux ships MariaDB as its MySQL-compatible database.

```bash
# Install MariaDB
sudo pacman -S mariadb

# Initialise the data directory
sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql

# Start and enable the service
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Run the secure installation wizard and set a root password
sudo mariadb-secure-installation

# Create the database
sudo mariadb -u root -p
```

Inside the MariaDB shell:

```sql
CREATE DATABASE staffos;
EXIT;
```

Then set `DATABASE_URL` in your `.env` to:

```
DATABASE_URL="mysql://root:yourpassword@localhost:3306/staffos"
```
