## Goal
Make `npm install`, `npm run build`, and `npx cap sync android` work on your Mac without `--legacy-peer-deps` or any other workaround flags.

## Root cause
Your `package.json` mixes Capacitor major versions:

- `@capacitor/core`, `cli`, `android`, `ios`, `geolocation` → **v7**
- `@capacitor/camera`, `device`, `local-notifications` → **v8**
- `@capacitor-community/background-geolocation` → expects core v7

Capacitor v8 plugins require `@capacitor/core >= 8`, so npm refuses to install. The half-installed `node_modules` is also why `vite` and `cap` are "not found".

## Fix (in Lovable repo)
Align everything on **Capacitor 7** (matches your existing native build checklist and the background-geolocation plugin, which has no v8 release yet).

Bump these down to the latest v7:

- `@capacitor/camera`: `^8.2.0` → `^7.0.1`
- `@capacitor/device`: `^8.0.2` → `^7.0.1`
- `@capacitor/local-notifications`: `^8.2.0` → `^7.0.1`

Keep everything else as-is. Commit to GitHub.

## What you do on your Mac afterwards
```bash
cd ~/Desktop/pitch-plan
git pull
rm -rf node_modules package-lock.json
npm install
npm run build
npx cap add android        # only first time
npx cap sync android
npx cap open android
```

This will install cleanly (no `--legacy-peer-deps`), `vite` will be available, and `npx cap` will work because `@capacitor/cli` will be properly installed in `node_modules/.bin`.

## Technical notes
- We stay on Capacitor 7 instead of upgrading the whole stack to 8 because `@capacitor-community/background-geolocation@1.2.x` (your time-tracking plugin) doesn't yet support core v8. Upgrading would break GPS check-in.
- No code changes needed — the v7 plugin APIs you use (Camera.getPhoto, Device.getId, LocalNotifications.schedule) are identical to v8 for your call sites.
- `package-lock.json` will be regenerated on your machine when you run `npm install`.