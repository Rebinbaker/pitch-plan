## Mål

Bygga tre säkerhetslager ovanpå nuvarande check-in/geofence-system:
1. **Intelligent auto-checkout** efter 2 h utanför zonen, med retroaktiv sluttid.
2. **Random presence verification** (1 ggr/dag, selfie + GPS).
3. **Device binding** – ett godkänt arbetstelefon per användare.

Plus en **säkerhetsavvikelse-vy** för admin.

---

## 1. Databas (en migration)

### Ändra `worker_check_ins`
- `checkout_reason TEXT` (`manual` | `auto_checkout_outside_geofence` | `admin_override`)
- `auto_checkout_triggered_at TIMESTAMPTZ`
- `device_id TEXT`

### Ändra `worker_absence_periods`
- `auto_checkout_triggered BOOLEAN DEFAULT false`
- `warning_sent_at TIMESTAMPTZ` (för 90-min pushen)

### Ny tabell `random_presence_verifications`
Kolumner: `id, user_id, organization_id, check_in_id, project_id, triggered_at, expires_at (triggered_at + 5 min), completed_at, status ('pending'|'passed'|'missed'|'failed'), selfie_url, gps_lat, gps_lng, gps_accuracy, distance_from_project_m, failure_reason, device_id, created_at`.
RLS: byggare ser/skapar/uppdaterar egna, org-medlemmar läser, admin uppdaterar status.

### Ny tabell `user_devices`
Kolumner: `id, user_id, organization_id, device_id, device_name, platform ('ios'|'android'|'web'), app_version, registered_at, approved_at, revoked_at, status ('pending'|'approved'|'revoked'), last_seen_at, approved_by`.
Unique partial index: en `approved` device per user. RLS: byggare ser/skapar egna, admin allt, org-medlemmar läser inom org.

### Hjälpfunktion
`public.is_device_approved(_user_id uuid, _device_id text) RETURNS boolean` (security definer) – används i edge functions och i UI-guards.

GRANTs för alla nya tabeller enligt mall.

---

## 2. Edge functions

### Uppdatera `process-location-ping`
- Skicka `device_id` med varje ping. Om inte approved → skriv ping men flagga sessionen med en avvikelse + skicka 401-liknande svar som klienten loggar.
- När en absence-period öppnas och har varat **90 min** utan `warning_sent_at`: sätt `warning_sent_at = now()` och returnera `notify_warning: true` till klienten (klienten skickar lokal notis).
- När en absence-period varat **120 min**:
  - Sätt `worker_check_ins.check_out_at = absence.left_at`, beräkna `gross_hours`, `net_hours`, `checkout_reason='auto_checkout_outside_geofence'`, `auto_checkout_triggered_at=now()`, `auto_closed=true`.
  - Markera absence-perioden `auto_checkout_triggered=true`, `returned_at=left_at`, `duration_minutes=0` (för att undvika dubbelavdrag – tiden finns redan utanför check_out_at).
  - Returnera `auto_checked_out: true` till klienten.

### Ny edge function `schedule-random-verification`
- Anropas av klienten (eller cron) en gång per minut när en aktiv session finns.
- Plockar aktiva check-ins äldre än 60 min, kollar att det inte redan finns en `random_presence_verifications` för dagens session, slumpar med liten sannolikhet så att den i snitt landar mellan 90 min in och 60 min före förväntat slut.
- Skapar en `pending`-rad med `expires_at = now() + 5 min` och returnerar den. Klienten visar pushnotis + öppnar kameran.

### Ny edge function `submit-random-verification`
- Tar emot `verification_id, selfie_base64, lat, lng, accuracy, device_id`.
- Validerar device, laddar upp selfie till `worker-checkin-photos`, räknar avstånd serverside, sätter `passed`/`failed`/`missed` (efter `expires_at`).
- Vid `missed`/`failed`: skapar admin-notification (`type='security_anomaly'`).

### Ny edge function `register-device`
- Body: `device_id, device_name, platform, app_version`.
- Första enheten: status `approved`, registered + approved_at = now().
- Ny enhet när en `approved` redan finns: status `pending`, skapa admin-notification.
- Returnerar enhetens status så klienten kan visa rätt UI.

### Ny edge function `approve-device` (admin)
- Sätter ny enhet `approved`, gamla aktiva `revoked`.

---

## 3. Frontend (React + Capacitor)

### `src/lib/deviceId.ts`
Wrapper kring `@capacitor/device` (`Device.getId()`) med web-fallback (UUID i localStorage).

### `src/hooks/useDeviceBinding.ts`
- Vid app-start: hämta device_id, anropa `register-device`, spara status i context.
- Exponera `{ status, isApproved, deviceId }`.

### `src/components/DeviceBindingGate.tsx`
- Visas över check-in-UI när status ≠ approved.
- Texter: "Denna telefon registreras…" eller "Ny enhet upptäckt. Din chef måste godkänna…".

### Uppdatera `useGeofenceTracker.ts`
- Skicka alltid `device_id` med ping.
- När edge function svarar `notify_warning: true` → lokal notis "Du är fortfarande utanför arbetsområdet…".
- När `auto_checked_out: true` → stäng UI för aktiv session, visa info-banner "Passet avslutades automatiskt kl XX:YY".
- Polla `schedule-random-verification` var 60 s när session aktiv och äldre än 60 min.

### Ny `src/components/RandomVerificationPrompt.tsx`
- Triggas av hooken när en pending verification finns.
- Visar fullscreen modal som direkt öppnar kameran (Capacitor Camera). Efter selfie → hämta GPS → anropa `submit-random-verification`. Countdown 5 min.

### Worker UI-texter
Enkla, vänliga: "Bekräfta att du är på plats", "Passet avslutades automatiskt eftersom du var utanför arbetsområdet i 2 timmar". Inga ord som "fusk" eller "misstänkt".

### Admin

#### Ny vy `src/components/admin/SecurityAnomaliesView.tsx`
Lista med flikar/filter:
- Auto-checkouts (länkad till check-in + karta över pings)
- Missed/failed random verifications
- Väntande device approvals (knappar: godkänn/neka)
- Mock-GPS detected
- Device mismatch

Varje rad: användare, projekt, tid, typ, status, mini-karta (Leaflet, återanvänd patterns), åtgärdsknappar.

#### Återöppna pass
Knapp i auto-checkout-detalj: kallar liten edge function `reopen-check-in` (eller direkt DB-update via RLS-admin-policy) som nollställer `check_out_at`, `checkout_reason='admin_override'`, anteckning sparas.

---

## 4. Lön

`PayrollReportView` använder redan `net_hours`. Eftersom auto-checkout sätter `check_out_at` retroaktivt till `left_at` och **inte** skapar avdrag för samma intervall, blir lönen automatiskt korrekt. Ingen ny logik behövs förutom att verifiera att absences efter `check_out_at` inte räknas.

---

## 5. Genomförandeordning

1. Migration (kolumner + 2 tabeller + helper-funktion + grants/RLS).
2. Edge functions: uppdatera `process-location-ping`, lägga till 4 nya.
3. Frontend: device-id-helper, device binding gate, uppdatera geofence-hook.
4. Random verification modal + polling.
5. Admin `SecurityAnomaliesView` + routing.
6. Manuell test: simulera auto-checkout, ny-enhet-flöde, missed verification.

---

## Tekniska anmärkningar

- **Pushnotiser**: använd Capacitor `LocalNotifications` (redan beroende via background-geo). Servern kan inte push:a utan FCM/APNs setup – vi nöjer oss med lokala notiser triggade av polling-svar. Detta dokumenteras i `NATIVE_BUILD_CHECKLIST.md`.
- **Device-id på web**: random UUID i localStorage. Säkrare native via `Device.getId()`.
- **Inga dubbla avdrag**: när auto-checkout triggas sätts absence-perioden `auto_checkout_triggered=true` och `duration_minutes=0` så `net_hours = gross_hours` (där gross redan är förkortat).
- **`pg_cron`** används inte – `schedule-random-verification` anropas från klienten medan sessionen är aktiv. Detta håller systemet enkelt och fungerar utan extra infrastruktur.
