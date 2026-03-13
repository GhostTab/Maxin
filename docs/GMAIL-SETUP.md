# Gmail API setup for expiry reminder emails

The `send-expiry-reminders` Edge Function can send reminder emails **from your Gmail** using the Gmail API (OAuth2). Set these four secrets and emails will be sent via Gmail instead of (or if you don't use) Resend.

## 1. Google Cloud project and Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or select an existing one).
3. Enable **Gmail API**: **APIs & Services** → **Library** → search "Gmail API" → **Enable**.
4. Go to **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
5. Configure the **OAuth consent screen** (if you haven’t): **APIs & Services** → **OAuth consent screen** → **External** → add app name and your **User support email** → under **Scopes** add `https://www.googleapis.com/auth/gmail.send` → save. Under **Test users**, click **Add users** and add the Gmail address you will use to send (e.g. `you@gmail.com`). Save. (In Testing mode, only listed test users can sign in.)
6. Create **OAuth client ID**:
   - Application type: **Web application** (required for OAuth Playground).
   - Under **Authorized redirect URIs**, click **Add URI** and add exactly:  
     `https://developers.google.com/oauthplayground`
   - Save. Note the **Client ID** and **Client secret**.

## 2. Get a refresh token

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the **gear icon** (top right) → check **Use your own OAuth credentials** → enter your **Client ID** and **Client secret**.
3. In the left list, under **Gmail API v1**, select **https://www.googleapis.com/auth/gmail.send**.
4. Click **Authorize APIs** and sign in with the Gmail account that will send the reminders.
5. Click **Exchange authorization code for tokens**. Copy the **Refresh token** (long string).

### If you see "Error 400: redirect_uri_mismatch"

Your OAuth client is not allowed to redirect to the Playground. Fix it:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Click your **OAuth 2.0 Client ID** (the one you use in the Playground).
3. Under **Authorized redirect URIs**, add: `https://developers.google.com/oauthplayground`
4. If the client type is **Desktop app**, create a new **Web application** client instead, add the redirect URI above, then use the new Client ID and Client secret in the Playground.
5. Save and try **Authorize APIs** again.

### If you see "Error 403: access_denied"

Your app’s consent screen is in **Testing** mode and your Gmail account is not a test user. Fix it:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**.
2. Scroll to **Test users**.
3. Click **Add users** and add the Gmail address you use to sign in (e.g. `mccoldplay123@gmail.com`).
4. Click **Save**.
5. Try **Authorize APIs** again in the Playground.

## 3. Set Edge Function secrets

In **Supabase Dashboard** → **Edge Functions** → **Secrets** (or use CLI), add:

| Secret | Value |
|--------|--------|
| `GMAIL_CLIENT_ID` | Your OAuth Client ID from step 1 |
| `GMAIL_CLIENT_SECRET` | Your OAuth Client secret |
| `GMAIL_REFRESH_TOKEN` | The refresh token from step 2 |
| `GMAIL_FROM_EMAIL` | Your Gmail address, e.g. `you@gmail.com` or `MAXIN Insurance <you@gmail.com>` |

**CLI example:**

```bash
npx supabase secrets set GMAIL_CLIENT_ID=your_client_id
npx supabase secrets set GMAIL_CLIENT_SECRET=your_client_secret
npx supabase secrets set GMAIL_REFRESH_TOKEN=your_refresh_token
npx supabase secrets set GMAIL_FROM_EMAIL=you@gmail.com
```

No need to redeploy the function. If **Resend** secrets are also set, the function uses Resend first; otherwise it uses Gmail when these four are set.
