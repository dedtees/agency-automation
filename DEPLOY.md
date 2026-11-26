# Deploy the prototype (Vercel + Postgres)

About 10 minutes. Everything stays in test mode: emails are only logged, payments
use a test checkout page, and hosting is simulated.

## 1. Connect a database (Neon, from Vercel)
1. In the Vercel project: **Storage** > **Create Database** > **Neon (Postgres)**, and connect it to the project for **Production** and **Preview**.
2. That adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) for you. The app uses the unpooled one for migrations, so you don't need `DIRECT_URL`.

Using Supabase instead? Project > **Connect** > **ORMs** > **Prisma** gives `DATABASE_URL` (port 6543) and `DIRECT_URL` (port 5432). Add both as environment variables.

## 2. Add the app settings (Vercel)
Project > **Settings** > **Environment Variables**, for Production and Preview:

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | a password for the admin pages (username is `admin`) |
| `CRON_SECRET` | any long random string |
| `AGENCY_NAME` | your agency's name (shown in emails) |

Then **Deployments** > latest > **Redeploy**. The build creates the database tables automatically (`prisma migrate deploy`). Without a database the deploy still succeeds, and the admin page tells you what is missing.

## 3. Try it
1. Open `https://<your-project>.vercel.app/admin` and sign in as `admin`.
2. Click **load 4 sample clients** (or import your own spreadsheet). To show a real
   case study, click **Load Central Jersey Law** instead: it imports the client with
   its site audit and two researched concepts (with real WordPress screenshots).
3. Open a client > **Generate concepts** > **Approve selected**.
4. **View portal as client** shows what the client sees. Rate sections, pick a favorite, try a checkout.
5. **Outbox** shows the invite email waiting for your approval.
6. After approving concepts, the client page shows the **Client portal link**. Portal
   links use the production domain (or `APP_URL`), so share them once this code is on
   production. Preview deployments are behind Vercel's login unless you create a
   shareable link in Vercel.

## Later: turn on real services
- **Outlook email:** register an app in Microsoft Entra with the Mail.Send application permission (steps at the top of `src/integrations/email/outlook.ts`), then set `EMAIL_PROVIDER=outlook`, `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `OUTLOOK_SENDER`.
- **Payments:** set `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and point a Stripe webhook at `/api/webhooks/payments/stripe`.
- **Background jobs** run every minute via Vercel Cron (`vercel.json`), plus immediately after admin actions.
