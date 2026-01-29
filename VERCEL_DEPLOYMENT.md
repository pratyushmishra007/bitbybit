# Vercel Deployment Configuration

## Environment Variables for Production

Add these in your Vercel Dashboard → Settings → Environment Variables:

### Required Variables
```
NEXT_PUBLIC_APP_URL=https://bitbybit-tmga.vercel.app
NEXTAUTH_URL=https://bitbybit-tmga.vercel.app
NEXTAUTH_SECRET=ECo3jJsbEG77FD5P3GrZcUV+PIhHiqnZT7JyNAAB+rs=

NEXT_PUBLIC_SUPABASE_URL=https://fykfxlgjpjmgoeekkhgx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5a2Z4bGdqcGptZ29lZWtraGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTE2MzAsImV4cCI6MjA4NTAyNzYzMH0.A-d43XxTyPXWNHF0rCaWKIdIe4piCTYD118awQSHSHU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5a2Z4bGdqcGptZ29lZWtraGd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1MTYzMCwiZXhwIjoyMDg1MDI3NjMwfQ.koqZc0RXZlvG7X_fIOqTgv5IwKezsjdZMBso2E5YLBY

AZURE_OPENAI_API_KEY=A7TdhfhO94dPE7YicbsrEVxDV78uIpye8vQQC5I7vKHHMUB0zHqKJQQJ99AKACHYHv6XJ3w3AAABACOGnc4U
AZURE_OPENAI_ENDPOINT=https://cognitiev.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.2-chat
AZURE_OPENAI_API_VERSION=2024-12-01-preview

GOOGLE_CLIENT_ID=318931468547-qrtnje3vh3k6nlnicp788dmqn3ik24qj.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

GITHUB_CLIENT_ID=Ov23lipJKFB1v7q43Zgk
GITHUB_CLIENT_SECRET=f2363055419b7c8ec0177ef4be203e7b48ae3e0c

ENABLE_AI_FEATURES=true
```

## Update OAuth Redirect URLs

### Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client
3. Add Authorized redirect URIs:
   - `https://bitbybit-tmga.vercel.app/api/auth/callback/google`
   - Keep `http://localhost:3000/api/auth/callback/google` for local development

### GitHub Developer Settings
1. Go to: https://github.com/settings/developers
2. Edit your OAuth App
3. Update:
   - Homepage URL: `https://bitbybit-tmga.vercel.app`
   - Authorization callback URL: `https://bitbybit-tmga.vercel.app/api/auth/callback/github`
   - Keep localhost URLs if you have a separate app for development

## Automatic URL Detection

The app now automatically detects the environment:
- **Local Development**: Uses `http://localhost:3000` (from .env.local)
- **Vercel Production**: Uses `https://bitbybit-tmga.vercel.app` (from Vercel env vars)
- **Vercel Preview**: Uses the preview deployment URL

This is handled by `/lib/url.ts` utility functions.

## Deploy to Vercel

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Add all environment variables listed above
5. Deploy!

## Verify Deployment

After deployment:
1. Check that OAuth login works
2. Verify Supabase connection
3. Test AI features
4. Check collaboration sessions

## Notes

- Vercel automatically sets `VERCEL_URL` which the app can use
- `NEXT_PUBLIC_*` variables are exposed to the browser
- Other variables are server-side only
- The app uses `/lib/url.ts` for automatic URL detection
