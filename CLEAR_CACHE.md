# How to Clear Vercel Cache

## Option 1: Via Vercel Dashboard (RECOMMENDED)

1. Go to https://vercel.com/dashboard
2. Click on your **schulplaner** project
3. Go to **Settings** → **General**
4. Scroll down to **Build & Development Settings**
5. Click **Clear Build Cache** or **Redeploy** button
6. Or go to **Deployments** tab
7. Click the **⋯** (three dots) on the latest deployment
8. Click **Redeploy** → Check **"Use existing Build Cache"** to **UNCHECK** it
9. Click **Redeploy**

## Option 2: Delete and Recreate Deployment

1. Go to **Deployments** tab
2. Find the problematic deployment
3. Click **⋯** → **Delete**
4. Push a new commit or manually trigger a new deployment

## Option 3: Check What's Actually Running

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Source** tab
4. Verify it shows the latest commit (should have "Remove @vercel/kv dependency")
5. If it shows an older commit, that's the problem - Vercel is serving old code

## Option 4: Force Complete Rebuild

In Vercel Dashboard:
1. Go to **Settings** → **General**
2. Under **Build & Development Settings**
3. Change **Build Command** to: `rm -rf .next && npm run build`
4. Save
5. Redeploy

## Verify the Fix

After clearing cache, check the logs:
- Should see `[getUsers] Upstash error` (NOT `KV error`)
- Should NOT see `@vercel/kv` anywhere
- If you still see `@vercel/kv`, the cache wasn't cleared properly

