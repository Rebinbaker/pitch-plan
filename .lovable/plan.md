# Stationary Device Detection + Manual Verification

Ett intelligence/risk-system ovanpå nuvarande geofence. Inga automatiska konsekvenser för lön eller pass — bara flaggor, risk score och möjlighet för admin att trigga snabb verifiering.

---

## 1. Databas (en migration)

### Ny tabell `stationary_device_flags`
- `id, check_in_id, user_id, organization_id, project_id`
- `risk_level` text ('medium' | 'high')
- `started_at, ended_at` timestamptz
- `duration_minutes` numeric
- `total_movement_m` numeric
- `gps_variance_m` numeric
- `avg_accuracy_m` numeric
- `accelerometer_activity` text ('none' | 'low' | 'normal' | 'unknown')
- `last_verification_at` timestamptz
- `status` text ('open' | 'verified_after_manual_check' | 'legitimate' | 'ignored' | 'escalated')
- `admin_comment` text
- `reviewed_by, reviewed_at`
- `created_at`

### Ny tabell `manual_presence_verifications`
Samma form som `random_presence_verifications` men separat:
- `id, flag_id, check_in_id, user_id, organization_id, project_id`
- `requested_by` uuid (admin)
- `triggered_at, expires_at` (triggered_at + 5 min)
- `completed_at, status` ('pending' | 'passed' | 'missed' | 'failed')
- `selfie_url, gps_lat, gps_lng, gps_accuracy, distance_from_project_m`
- `failure_reason, device_id, created_at`

### Ny tabell `user_risk_scores`
- `id, user_id (unique), organization_id`
- `score` integer default 0
- `last_event_at, updated_at`
- (events loggas i `risk_score_events`)

### Ny tabell `risk_score_events`
- `id, user_id, organization_id, event_type, delta, reason, related_flag_id, related_verification_id, created_at`

### Ändra `worker_location_pings`
- `motion_activity` text nullable ('still' | 'walking' | 'moving' | 'unknown')

### RLS / GRANTs
- Org-medlemmar SELECT på alla nya tabeller.
- Workers INSERT på `manual_presence_verifications` när `user_id = auth.uid()` (för att kunna submitta selfie). Egen UPDATE när pending.
- Admins UPDATE på flags + verifications.
- `risk_score_events` insert via service_role (edge functions) — workers ej.

---

## 2. Edge functions

### Uppdatera `process-location-ping`
- Ta emot valfritt `motion_activity` per ping och skriv till `worker_location_pings.motion_activity`.

### Ny `analyze-stationary-sessions`
Anropas av klienten var 10:e minut medan session aktiv (samma mönster som `schedule-random-verification`), samt vid varje admin-öppning av panelen.
- Hämtar alla aktiva check-ins (eller en specifik om `check_in_id` skickas).
- För varje session: läs senaste 150 min pings.
- Räkna `total_movement_m` (summa av segmenten), `gps_variance_m` (stddev), `avg_accuracy_m`, `accelerometer_activity` (majoritet av motion_activity).
- Skip-villkor (false positive guards):
  - Senaste verifiering (random eller manual `passed`) < 30 min sedan.
  - `avg_accuracy_m > 30`.
  - Session yngre än 90 min.
  - Öppen `worker_absence_periods` (markerad som transport/rast etc).
  - Befintlig öppen flagga av samma nivå för samma session.
- Medium trigger: movement < 15 m, duration ≥ 90 min, accelerometer 'low' eller 'none' (eller unknown om GPS-variansen är < 5 m).
- High trigger: movement < 10 m, duration ≥ 120 min, accelerometer 'none' (eller unknown + GPS-variansen < 3 m), inga geofence-transitions (alla pings inside_radius=true).
- Skapa rad i `stationary_device_flags`, logga risk_score_event (+5 medium, +15 high).
- Skapa `notifications` (`type='security_anomaly'`) till admin.

### Ny `trigger-manual-verification` (admin)
Body: `flag_id` (krävs admin-roll).
- Hämtar flag + check-in.
- Skapar `manual_presence_verifications` rad pending, `expires_at = now() + 5 min`.
- Skapar notification till workern (worker-klienten pollar redan notifications / vi pollar `manual_presence_verifications`).
- Returnerar raden.

### Ny `submit-manual-verification`
Body: `verification_id, selfie_base64, lat, lng, accuracy, device_id`.
- Likt `submit-random-verification`: ladda upp selfie, beräkna avstånd, sätt passed/failed/missed.
- Uppdatera kopplad flag:
  - `passed` → `status='verified_after_manual_check'`, risk -5.
  - `failed` → `status` kvar `open`, risk +20, logga reason.
  - `missed` (efter expires_at, körs av analyze-jobbet) → risk +10.
- Skapa admin-notification med resultat.

### Uppdatera `analyze-stationary-sessions`
- Efter ping-analysen: hitta `manual_presence_verifications` där `expires_at < now()` och status='pending' → sätt 'missed', uppdatera flag/risk.

### Ny `update-flag-status` (admin)
Body: `flag_id, status ('legitimate'|'ignored'|'escalated'), comment`.
- RLS täcker det egentligen, men funktion ger oss en plats att också lägga risk_score_events när admin markerar legitimate (-flag-poäng).

---

## 3. Frontend

### `src/lib/motionActivity.ts`
- Wrapper kring `@capacitor/motion`. Returnera 'still'/'low'/'normal' baserat på rolling RMS av accelerometer senaste 30 s.
- Web: använd `DeviceMotionEvent` om tillgängligt, annars 'unknown'.

### Uppdatera `useGeofenceTracker.ts`
- Inkludera `motion_activity` i varje ping-payload.
- Polla `analyze-stationary-sessions` var 10:e minut (precis som scheduler).
- Polla `manual_presence_verifications` (latest pending för userId) var 30:e sekund. När en finns → öppna existerande `RandomVerificationPrompt`-mönstret återanvänt i en ny `ManualVerificationPrompt` (eller återanvänd och generalisera).

### `src/components/ManualVerificationPrompt.tsx`
- Kopia av `RandomVerificationPrompt` men anropar `submit-manual-verification` och säger "Snabb verifiering krävs för aktivt arbetspass.".

### `WorkerApp.tsx`
- Lägga till polling-effekt + rendera `ManualVerificationPrompt`.

### Admin: `src/components/admin/StationaryMonitoringView.tsx`
Ny sektion i `Admin.tsx` (under `SecurityAnomaliesView`):
- Tabell över aktiva flaggor med kolumner: användare, projekt, risknivå, stationary duration, total movement, last GPS, accelerometer, senaste verification, tidigare flag-antal, current risk score.
- Action-knappar per rad: **Skicka verifiering**, **Markera som legitim**, **Ignorera**, **Eskalera**, kommentar-fält.
- Vid "Skicka verifiering" → `trigger-manual-verification`, visa status (väntar/passed/missed/failed) som uppdateras via 30 s poll.

### Risk score badge
Liten widget högst upp i `SecurityAnomaliesView` som listar topp 10 användare efter `user_risk_scores.score`.

---

## 4. Risk score

Risk events och deltan:
- `stationary_medium` +5
- `stationary_high` +15
- `manual_verification_missed` +10
- `manual_verification_failed` +20
- `manual_verification_passed` -5
- `flag_marked_legitimate` -10
- `mock_gps_detected` +25 (befintlig flagga som vi kopplar in)
- `geofence_violation_repeated` +5 (när auto-checkout sker)

Score är ren intelligence — påverkar inte payroll. Visas bara i adminpanelen.

---

## 5. Genomförandeordning

1. Migration (3 tabeller + kolumn på pings + grants/RLS + helper).
2. `analyze-stationary-sessions`, `trigger-manual-verification`, `submit-manual-verification`, `update-flag-status`.
3. `process-location-ping` (accept motion_activity).
4. Frontend: motion helper, hook-uppdatering, ManualVerificationPrompt.
5. Admin `StationaryMonitoringView` + risk score widget.
6. Manuell test: simulera stillaliggande pings → medium → high → admin triggar verifiering → passed/missed.

---

## Tekniska anmärkningar

- **Motion-data**: använd `@capacitor/motion` på native, `DeviceMotionEvent` på web; 'unknown' när inget finns. Vi triggar då bara på GPS-kriterier.
- **Polling**: vi behåller mönstret från random verification (klient-driven, inga cronjobs) för att slippa pg_cron-uppsättning.
- **Inga payroll-effekter**: ingen kod rör `worker_check_ins.check_out_at`, `net_hours` eller `wage_amount`.
- **Push**: lokala notiser via `@capacitor/local-notifications` (samma mönster som warning push). Servern triggar via polling-svar.
- **Återanvändning**: `RandomVerificationPrompt` och `ManualVerificationPrompt` får dela en gemensam intern `<PresenceSelfieCapture>`-komponent.
