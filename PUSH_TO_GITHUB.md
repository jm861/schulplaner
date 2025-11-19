# How to Push Code to GitHub

Your code is ready and committed locally. Follow these steps to push it to GitHub:

## Quick Method: Use Personal Access Token

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it: "Schulplaner Push"
   - Select scope: ✅ **repo** (full control of private repositories)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **Push using the token:**
   ```bash
   cd '/Users/johannesmenzel/school planer/schulplaner'
   git push https://YOUR_TOKEN@github.com/jm861/schulplaner.git main
   ```
   Replace `YOUR_TOKEN` with the token you copied.

3. **After first push, you can use:**
   ```bash
   git push
   ```

## Alternative: Use SSH (Recommended for ongoing use)

1. **Check if you have SSH key:**
   ```bash
   ls -la ~/.ssh
   ```

2. **If no SSH key, create one:**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Press Enter to accept default location
   # Press Enter twice for no passphrase (or set one)
   ```

3. **Copy your public key:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

4. **Add to GitHub:**
   - Go to: https://github.com/settings/ssh/new
   - Paste your public key
   - Click "Add SSH key"

5. **Change remote to SSH and push:**
   ```bash
   cd '/Users/johannesmenzel/school planer/schulplaner'
   git remote set-url origin git@github.com:jm861/schulplaner.git
   git push -u origin main
   ```

## What's Already Done

✅ All code is committed locally
✅ README.md is included
✅ .gitignore is configured
✅ Remote repository is set up
✅ Ready to push!

## After Pushing

Once pushed, you can:
- View your code at: https://github.com/jm861/schulplaner
- Clone it on any server
- Continue editing in Cursor (just commit and push changes)

