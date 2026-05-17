# Bygg-app: incheckning & lön per medlem

Mål: När ett arbetslag tilldelas ett projekt ska varje byggare i laget kunna logga in i appen, se sina tilldelade jobb och GPS-checka in/ut. Timern börjar vid incheckning och stoppas vid utcheckning. Lönen beräknas automatiskt utifrån timlönen som är satt på medlemmen i Team-fliken.

## Dina val
- **Inlogg:** Du skapar konto åt varje byggare (e-post + lösenord) från Team-fliken.
- **Timlön:** `hourly_rate` per `TeamMember` på Team-fliken.
- **In/ut:** Individuellt — varje byggare själv.
- **App-form:** Samma kodbas, ny mobilvy `worker` med begränsad meny (funkar redan i Capacitor).

## Vad som byggs

### 1. Databas (migrering)
- Ny enum-roll `worker` i `app_role`.
- Lägg till på `teams.members` (jsonb-fält per medlem):
  - `hourly_rate` (numeric) — sätts på Team-fliken
  - `user_id` (uuid, nullable) — kopplar medlem till auth-användare när konto skapats
- Ny tabell `worker_check_ins`:
  - `user_id`, `team_member_id`, `team_id`, `project_id`, `organization_id`
  - `check_in_at`, `check_out_at`
  - `check_in_lat/lng`, `check_out_lat/lng`, `distance_km`
  - `hourly_rate_snapshot` (numeric) — låses vid incheckning
  - `duration_hours`, `wage_amount` (beräknas vid utcheckning)
  - RLS: organisationsmedlemmar kan se egna check-ins; admin ser alla.
- Edge function: `create-worker-account` (admin-only) som skapar auth-användare, sätter rollen `worker` och länkar `team_member_id` → `user_id` i teams.members.

### 2. Team-fliken (admin/projektledare)
- I `AddTeamMemberModal`: nytt fält **Timlön (kr/h)**.
- I `TeamMemberCard`: knapp **"Skapa inlogg"** → öppnar dialog (e-post + lösenord) → anropar edge-funktionen → visar status "Inlogg skapat" + e-post.
- Visa hourly_rate på kortet.

### 3. Byggar-vy (`/worker` rutt)
Tre flikar i mobilanpassad layout:
- **Mina jobb idag** — listar projekt där byggaren ingår i `construction_team` på projektet, med adress, lagledare, kontaktinfo.
- **Checka in/ut** — stor knapp som använder befintlig `LocationVerification` (1 km radie från projektadress). Visar live-timer och dagens intjänade lön. Endast incheckning tillåten på tilldelade projekt.
- **Min historik** — egna check-ins, timmar, lön per dag/vecka/månad.

### 4. Routing & roller
- `ProtectedRoute` förbättras: roll `worker` redirectas alltid till `/worker`. Övriga roller får valet (men kan besöka `/worker`).
- `AppNavSidebar` döljs för worker-rollen; istället en minimal mobilbottenmeny.
- Auth-sidan oförändrad — byggaren loggar in med konto admin skapat.

### 5. Lönrapport (admin)
- Ny vy under Tidsregistrering: "Lönrapport" där admin väljer period och team och får summa timmar + lön per byggare. Bygger på `worker_check_ins`.

## Tekniska detaljer
- Geofencing: återanvänd `LocationVerification` (1 km). Block om ej verifierad.
- Timer: räknas client-side från `check_in_at`, autouppdatering var 30 s.
- Lön = `duration_hours * hourly_rate_snapshot` (snapshot låser lönen mot retroaktiva ändringar).
- Edge function `create-worker-account` behöver `SUPABASE_SERVICE_ROLE_KEY` (finns) för att skapa användare via admin-API.
- För Capacitor: GPS funkar redan; ingen ny native-plugin behövs.

## Frågor jag inte tar ställning till nu (kan läggas till senare)
- Foto-verifiering vid in/ut (befintlig `PhotoVerification` finns att aktivera).
- Påminnelser/notiser om byggare glömmer checka ut.
- Övertid/OB-regler.

Säg till om något ska ändras i planen, annars implementerar jag den.
