# Vercel Deployment Setup

This document records the steps to set up Vercel Preview and Production deployments.

## Prerequisites

1. Push the `stage-0-project-scaffolding` branch to GitHub.
2. Create a Vercel account at https://vercel.com (use GitHub to log in).

## Steps

### 1. Import Project

1. In Vercel Dashboard, click **Add New → Project**.
2. Select the `sheetsnap` GitHub repository.
3. Framework preset should auto-detect **Next.js**.

### 2. Configure Build

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Root Directory | `./` |
| Build Command | `pnpm build` (auto-detected) |
| Output Directory | `.next` (auto-detected) |
| Install Command | `pnpm install` (auto-detected) |

### 3. Add Environment Variables

Add the following environment variables under **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=
AUTH_URL=https://your-project.vercel.app
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=noreply@sheetsnap.com
```

> **Note**: For Preview deployments, `AUTH_URL` must match the Preview URL. Set it as `https://${VERCEL_URL}` using the Vercel system env variable, or configure it per branch.

### 4. Automatic Preview Deployments

Once the project is imported, Vercel automatically creates a **Preview deployment** for every Pull Request.

- ✅ Each PR gets a unique URL like `sheetsnap-git-branch-name.vercel.app`
- ✅ The Preview URL is posted as a comment on the PR
- ✅ Environment variables can be configured per environment

### 5. Production Domain

- After merging to `main`, the production deployment will be available at `sheetsnap.vercel.app`
- A custom domain (e.g., `app.sheetsnap.com`) can be added later from the Vercel Dashboard → Domains

## Verification

1. Push branch → create PR → check that GitHub Actions passes
2. Wait for Vercel Preview deployment to complete (usually within 1-2 min)
3. Open the Preview URL → verify the app loads and the login flow works
4. Merge PR to main → verify production deployment succeeds
