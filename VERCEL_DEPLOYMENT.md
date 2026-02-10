# Vercel Deployment Configuration

## Environment Variables for Production

Add these in your Vercel Dashboard → Settings → Environment Variables:

### Required Variables

> ⚠️ **SECURITY WARNING**: Never commit actual secrets to version control!
> Copy these to your Vercel Dashboard and replace with your actual values.

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

AZURE_OPENAI_API_KEY=<your-azure-openai-api-key>
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=<your-deployment-name>
AZURE_OPENAI_API_VERSION=2024-12-01-preview

GOOGLE_CLIENT_ID=<your-google-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>

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
