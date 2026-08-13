# Desire Admin (web)

Standalone Vite + React + TypeScript SPA that hosts the admin dashboard for the Desire couples app. Runs in the browser, signs in via Firebase Auth, and calls the same 5 admin Cloud Function callables that were deployed for Phase 2 of the admin dashboard track.

**Not shipped with the mobile app.** Ships as a separate Vercel project so no admin code exists inside the App Store binary or Android APK.

## Layout

```
admin-web/
  src/
    firebase.ts          # initializeApp(firebaseConfig) + getAuth + getFunctions
    adminService.ts      # httpsCallable wrappers for the 5 admin callables + isCurrentUserAdmin
    App.tsx              # onAuthStateChanged gate
    main.tsx             # React root
    styles.css           # CSS variables + all component styles
    screens/
      LoginScreen.tsx    # Email + password sign-in
      AdminScreen.tsx    # Overview + feature usage + user search dashboard
      NotAuthorized.tsx  # Signed in but not on ADMIN_UIDS allowlist
    components/
      ConfirmModal.tsx   # Grant / revoke confirmation dialog
```

## Local development

```bash
cd admin-web
npm install
npm run dev
```

Opens `http://localhost:5173`. Sign in with an admin email.

## Production build

```bash
npm run build
```

Outputs to `admin-web/dist/`. Vercel picks this up automatically via the `vercel.json` `framework: "vite"` config.

## Vercel deploy

One-time setup (user step):

1. Vercel dashboard → **Add New → Project**
2. Import the same `lovedesireapp` repo (already linked to Vercel)
3. Set **Root Directory: `admin-web`**
4. Framework preset auto-detects as Vite
5. Deploy — Vercel returns a `.app` URL like `desire-admin-xxxx.vercel.app`
6. Bookmark it

Post-launch optional: attach the custom subdomain `admin.lovedesireapp.com` and gate with Cloudflare Access.

## Security layers

The admin app has four defense layers:

- **L1 (obscurity)** — deployed to a hidden Vercel URL, not linked from anywhere
- **L2 (Firebase Auth)** — must sign in with email + password
- **L3 (client gate)** — `isCurrentUserAdmin(uid)` in `src/adminService.ts` blocks non-admin uids from seeing the dashboard
- **L4 (server gate)** — every Cloud Function callable in `functions/src/index.ts` runs `assertAdmin(req)` — this is the only real gate; L1-L3 are convenience

`ADMIN_UIDS` is duplicated between `functions/src/index.ts` and `src/adminService.ts`. Adding a new admin means editing both and redeploying functions.

## Admin uids

- Óli: `fL9brG7iuSe0XNomrRkDZ3N7PAl1` (olsenis@gmail.com)

## No secrets in this repo

Firebase config values in `src/firebase.ts` are publicly discoverable in every deployed web bundle by design. Security lives in Firestore rules + assertAdmin in Cloud Functions, not in hiding the config. No `.env` file needed.
