# Fix Vercel Login Issues

## If you mean Vercel Dashboard/CLI login:

### Option 1: Stay logged in to Vercel CLI
The CLI is already logged in. To verify:
```bash
npx vercel whoami
```

If it asks for login, run:
```bash
npx vercel login
```
Then select "Continue with GitHub" or "Continue with Email" and complete the browser login.

### Option 2: Use Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "Stay signed in" when logging in
3. Your browser will remember the session

## If you mean the App Login:

The app should remember your login via localStorage. If you have to login every time:

### Possible Causes:
1. **Browser clearing localStorage** - Check browser settings
2. **Incognito/Private mode** - localStorage is cleared when you close the window
3. **Browser extensions** - Some privacy extensions clear localStorage
4. **Multiple devices** - Each device/browser has separate localStorage

### Solutions:

1. **Don't use incognito mode** - Use regular browser window
2. **Check browser settings** - Make sure cookies/localStorage aren't being cleared
3. **Use the same browser** - localStorage is per-browser
4. **Check if "Remember me" is working** - The app saves your session automatically

### How the App Remembers You:
- Login session is saved in `localStorage` (key: `schulplaner:auth`)
- Session persists until you:
  - Click "Logout"
  - Clear browser data
  - Use incognito mode
  - Switch browsers/devices

## Quick Test:
1. Login to the app
2. Close the browser tab
3. Open a new tab and go to the app URL
4. You should still be logged in (unless you cleared browser data)


