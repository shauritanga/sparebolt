# Push notifications (Firebase Cloud Messaging)

SpareBolt uses **Firebase Cloud Messaging** for web (and ready for mobile) push.

## Files you provided

| File | Purpose | Git |
|------|---------|-----|
| `firebase-configure.json` | Web client config (public) | Optional / env vars |
| `firebase-service-account.json` | Server Admin SDK (secret) | **Never commit** (gitignored) |

## One more key required (Web Push certificate)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **sparebolt-16c25**
2. **Project settings** → **Cloud Messaging**
3. Under **Web Push certificates**, generate a key pair
4. Copy the **Key pair** value into:

```bash
# apps/web/.env  (and production build env)
VITE_FIREBASE_VAPID_KEY=BNxxxxxxxx...
```

Without this key, browsers cannot obtain an FCM registration token.

## Local API

```bash
# From monorepo root — service account is already at project root
export FIREBASE_SERVICE_ACCOUNT_PATH="$(pwd)/firebase-service-account.json"
# or copy into apps/api/
```

`FirebaseService` also auto-discovers:

- `./firebase-service-account.json`
- `../../firebase-service-account.json`
- `/var/www/sparebolt/firebase-service-account.json`

## Production (VPS)

1. Copy service account to server (mode 600):

```bash
scp firebase-service-account.json root@SERVER:/var/www/sparebolt/
chmod 600 /var/www/sparebolt/firebase-service-account.json
```

2. Rebuild web **with** `VITE_FIREBASE_*` and `VITE_FIREBASE_VAPID_KEY` set.

3. Restart API (`pm2 restart sparebolt-api`). Logs should show:

```
Firebase Admin initialized for FCM push
```

## Client flow

1. User logs in → `registerWebPush()` runs (AppShell)
2. Browser permission prompt
3. FCM token → `POST /api/notifications/push-token`
4. Server events (order paid, driver assigned, approvals, …) call `NotificationsService.notify()` → in-app row + FCM

## Manual enable

**Notifications** page → **Allow notifications** if permission was skipped earlier.
