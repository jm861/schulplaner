# Resend Email Setup Guide

## Environment Variables

The password reset feature requires the `RESEND_API_KEY` environment variable to be set in Vercel.

### How to Check if RESEND_API_KEY is Set

1. **Via Vercel Dashboard:**
   - Go to https://vercel.com/dashboard
   - Select your project (`schulplaner`)
   - Navigate to **Settings** → **Environment Variables**
   - Look for `RESEND_API_KEY`
   - Verify it starts with `re_` (e.g., `re_xxxxxxxxxxxxx`)

2. **Via Vercel CLI:**
   ```bash
   npx vercel env ls
   ```
   This will list all environment variables for your project.

3. **Via API Response (Development Mode):**
   - If `RESEND_API_KEY` is missing, the API will return an error with details in development mode
   - Check the browser console or network tab when testing the forgot password flow

### How to Set RESEND_API_KEY

1. **Get Your Resend API Key:**
   - Go to https://resend.com/api-keys
   - Create a new API key or copy an existing one
   - The key should start with `re_`

2. **Add to Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Click **Add New**
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (starts with `re_`)
   - Environment: Select **Production**, **Preview**, and **Development** (or as needed)
   - Click **Save**

3. **Redeploy:**
   After adding the environment variable, you need to redeploy:
   ```bash
   npx vercel --prod --yes --force
   ```

### Testing

After setting up the API key:

1. Try the forgot password flow on the login page
2. Check Vercel logs for detailed error messages:
   ```bash
   npx vercel logs <your-deployment-url> --follow
   ```
3. Look for log entries starting with `[forgot-password]`:
   - `Attempting to send reset email to...` - Email send started
   - `Email sent successfully to...` - Email sent successfully
   - `Resend API error:` - Error occurred (check details)

### Common Issues

1. **"Email service is not configured"**
   - `RESEND_API_KEY` is not set in Vercel
   - Solution: Add the environment variable and redeploy

2. **"Email service configuration is invalid"**
   - `RESEND_API_KEY` doesn't start with `re_`
   - Solution: Verify you copied the full API key correctly

3. **"Failed to send reset email"**
   - Resend API returned an error
   - Check Vercel logs for detailed error message
   - Common causes:
     - Invalid API key
     - API key doesn't have email sending permissions
     - Rate limit exceeded
     - Domain not verified (if using custom domain)

### Email Sender Address

Currently using: `Schulplaner <onboarding@resend.dev>`

This is Resend's test domain and works immediately. For production, you should:
1. Verify your domain in Resend dashboard
2. Update the `from` address in `src/app/api/auth/forgot-password/route.ts` to use your verified domain
3. Example: `Schulplaner <noreply@meinplan.schule>`

