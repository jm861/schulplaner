# Vercel KV Setup Guide

## Why Use Vercel KV?

Vercel KV (Redis) provides server-side storage that:
- ✅ Stores all user data centrally (not per-browser)
- ✅ Allows admins to see all registered users across all devices
- ✅ Tracks login activity (last login time, login count)
- ✅ Persists data across deployments
- ✅ Enables cross-device synchronization

## Setup Instructions

### Step 1: Create Vercel KV Database

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Navigate to your project: **schulplaner**
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **KV** (Redis)
6. Choose a name (e.g., "schulplaner-kv")
7. Select a region (choose closest to your users)
8. Click **Create**

### Step 2: Get Connection Details

After creating the KV database:

1. Click on your KV database
2. Go to the **.env.local** tab or **Settings**
3. Copy the following environment variables:
   - `KV_REST_API_URL` (or `UPSTASH_REDIS_REST_URL`)
   - `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_TOKEN`)

**Note**: The app supports both Vercel KV and Upstash Redis variable names.

### Step 3: Add Environment Variables to Vercel

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add the following variables:
   - **Key**: `UPSTASH_REDIS_REST_URL` (or `KV_REST_API_URL`)
     **Value**: (paste from Step 2)
   - **Key**: `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_TOKEN`)
     **Value**: (paste from Step 2)
3. Make sure to select **Production**, **Preview**, and **Development** environments
4. Click **Save**

**Note**: The app will automatically detect either variable name format.

### Step 4: Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic deployment

## Verification

After setup, you should see:
- ✅ No "Vercel KV not configured" warnings in logs
- ✅ All users visible in admin dashboard across devices
- ✅ Last login times tracked and displayed
- ✅ Login counts incrementing

## Features Enabled with KV

- **Centralized User Storage**: All users stored server-side
- **Login Tracking**: See when users last logged in
- **Login Count**: Track how many times each user has logged in
- **Cross-Device Sync**: Users visible from any device/browser
- **Persistent Data**: Data survives deployments and browser clears

## Cost

Vercel KV has a free tier that should be sufficient for most use cases:
- Free tier includes generous limits
- Pay-as-you-go pricing for larger usage
- Check Vercel pricing for current rates

## Troubleshooting

If KV is not working:
1. Check environment variables are set correctly
2. Verify KV database is created and active
3. Check Vercel logs for errors
4. Ensure variables are set for all environments (Production, Preview, Development)

