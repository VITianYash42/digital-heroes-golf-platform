# Digital Heroes Golf Platform

A Next.js + Supabase + Stripe full-stack platform for golf-based subscription draws with charity contributions.

## Live Scope

This submission includes:
- Authentication and role-aware access control.
- Subscriber dashboard for score entry and winnings proof upload.
- Full admin dashboard for platform operations.
- Stripe checkout + webhook synchronization.
- Supabase-backed data model with RLS policies.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Stripe (checkout + webhook)

## Project Structure

- `src/app` - routes and server/client components
- `src/app/admin` - admin dashboard and server actions
- `src/app/dashboard` - subscriber dashboard and actions
- `src/app/api/checkout` - Stripe session creation
- `src/app/api/webhook` - Stripe webhook handling
- `src/utils/supabase` - Supabase clients (server/client/middleware)
- `supabase/schema.sql` - database schema and policies

## Features Delivered

### 1. Route Protection

- Session checked server-side via Supabase auth.
- Admin route checks `profiles.role`.
- Non-admin users are redirected away from admin routes.

### 2. Admin Dashboard (Multi-tab)

Location: `src/app/admin/page.tsx`

Tabs implemented:
- User Management
- Draw Management
- Charity Management
- Winners Management
- Reports & Analytics

### 3. User Management

- Data table of users from `profiles`.
- Latest subscription visibility and status update controls.
- Golf score management:
  - Edit existing user scores.
  - Add new score for any user.
  - Keeps max 5 recent scores per user.

### 4. Draw Management

- Draw logic selection: `random` or `algorithmic`.
- Simulation action for non-official dry runs.
- Publish official results action with:
  - Prize split: 40% / 35% / 25%.
  - 5-match jackpot handling:
    - Pays out when eligible entries exist.
    - Rolls over when no eligible entry exists.

### 5. Charity Management

CRUD operations for `charities`:
- Create
- Edit
- Activate/Deactivate
- Delete

### 6. Winners Management

- Winner listing (from `winnings` when table exists).
- Pending proof handling:
  - Approve
  - Reject
  - Mark as Paid
- Graceful fallback message if `winnings` table is not present yet.

### 7. Reports & Analytics

Aggregates shown:
- Total users
- Total prize pool
- Charity contribution totals (from configured subscription percentages)
- Draw statistics (total/completed/simulated)

## Server Actions Implemented

Location: `src/app/admin/actions.ts`

- `adminUpdateUserScore`
- `adminAddUserScore`
- `adminUpdateSubscriptionStatus`
- `adminCreateCharity`
- `adminUpdateCharity`
- `adminDeleteCharity`
- `adminSimulateDraw`
- `adminPublishDrawResults`
- `adminApproveWinnerProof`
- `adminRejectWinnerProof`
- `adminMarkWinnerPaid`

All admin mutations enforce server-side admin verification and revalidate `/admin`.

## Middleware/Proxy Migration (Next.js 16 Compatibility)

To satisfy Next.js 16 deployment behavior:
- Removed deprecated `src/middleware.ts`
- Added `src/proxy.ts`

This resolves the deprecation/build blocker for modern Next.js deploys.

## Environment Variables

Create `.env.local` with your values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`
- `NEXT_PUBLIC_SITE_URL`

Important:
- `.env` and `.env.local` are git-ignored.
- Never commit service role or Stripe secret keys.

## Local Setup

```bash
npm install
npm run dev
```

App runs at:
- `http://localhost:3000`

## Database Setup

- Apply `supabase/schema.sql` in your Supabase SQL editor.
- Ensure admin account has `profiles.role = 'administrator'`.
- (Optional but recommended) create a `winnings` table for complete winners workflow persistence.

## Build Verification

Production build command:

```bash
npm run build
```

Status for this submission:
- Build passes successfully after proxy migration + TypeScript fixes.

## Submission Notes

This implementation covers the requested admin operations, route guards, draw publishing rules, winner payout/proof actions, and analytics reporting with server-side security checks.
