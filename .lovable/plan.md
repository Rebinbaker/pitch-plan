## Mål

Göra tidrapporteringen fuskfri: byggarens lön baseras på **nettotid inom 50 m från projektets adress**. Lämnar de radien startar en borta-timer direkt vid första GPS-pingen utanför. Tiden dras av från lönen om inte chefen godkänner frånvaron i efterhand.

## Så här fungerar det för användaren

**Byggaren (mobil):**
1. Checkar in som idag (foto + GPS).
2. Appen pingar GPS var 60:e sekund i bakgrunden via Capacitor Geolocation.
3. Sekunden de går utanför 50 m → röd banner "🔴 Utanför arbetsplats – 00:04:12" + lokal notis.
4. När de kommer tillbaka stoppas borta-timern och en frånvaroperiod sparas (start, slut, längd, GPS-spår).
5. Vid utcheckning visas: Brutto 8:12 h – Frånvaro 0:47 h = **Lönegrundande 7:25 h**.
6. Byggaren kan motivera varje frånvaroperiod ("Hämtade material på XL Bygg") med valfritt kvittofoto.

**Chefen (admin):**
1. Ny flik "Frånvaroperioder" i lönerapporten — lista per byggare/dag med GPS-karta för perioden.
2. Knappar **Godkänn** (tiden återförs) / **Avvisa** (avdraget kvarstår). Bulk-godkänn per dag finns.
3. Tills chefen godkänner är perioden **avdragen** från lönen (default).

## Teknisk plan

**1. Databas (migration)**

- `worker_location_pings` — `check_in_id, recorded_at, lat, lng, accuracy_m, distance_m, inside_radius, is_mocked`. Index på `(check_in_id, recorded_at)`.
- `worker_absence_periods` — `check_in_id, user_id, organization_id, left_at, returned_at, duration_minutes, reason, receipt_url, status ('pending'|'approved'|'rejected'), reviewed_by, reviewed_at`.
- `worker_check_ins`: lägg till `gross_hours`, `absence_minutes`, `net_hours`, `auto_closed`.
- `projects`: lägg till `geofence_radius_m` (default 50).
- RLS: byggare ser/skapar egna pings & absences; org-medlemmar läser; admin uppdaterar status. GRANTs enligt mall.

**2. Edge function `process-location-ping`**

- Tar emot `{check_in_id, lat, lng, accuracy, is_mocked, recorded_at}`.
- Hämtar projektets koordinat + radie, räknar Haversine-avstånd serverside (klienten kan inte fuska).
- Skriver ping. Om `inside_radius` växlar → öppnar/stänger absence period.
- Auto-stänger check-in efter 12 h utan ping.
- Blockar `is_mocked = true` (markerar perioden som `rejected` automatiskt).

**3. Mobil-klient (Capacitor)**

- `@capacitor/geolocation` med `watchPosition` (60 s intervall, high accuracy).
- Background mode via `@capacitor-community/background-geolocation` så det funkar med skärmen släckt.
- Hook `useGeofenceTracker(checkInId)` som pingar edge function + visar röd banner när utanför.
- Lokal notis vid utträde ("Du är utanför arbetsplatsen – timern räknar nu av tid").

**4. UI-ändringar**

- **WorkerCheckInView**: röd "utanför arbetsplats"-banner med live-timer, lista över dagens frånvaroperioder med motivera-knapp.
- **Utcheckningsdialog**: visar Brutto / Frånvaro / Netto + uppmaning att motivera ej-motiverade perioder.
- **PayrollReportView**: summera `net_hours` istället för `duration_hours`, ny kolumn "Avdrag (min)", expanderbar rad per check-in med periodlista.
- **Ny vy `AbsenceApprovalView`**: chefens godkännandekö med mini-karta (Leaflet) över GPS-spåret.
- **ProjectEditDialog**: nytt fält "Geofence-radie (m)" default 50.

**5. Lönelogik**

```text
gross_hours    = (check_out - check_in)
absence_min    = SUM(duration) WHERE status != 'approved'
net_hours      = gross_hours - absence_min/60
wage_amount    = net_hours * hourly_rate_snapshot
```

Räknas om i realtid när chef godkänner/avvisar period.

## Genomförandeordning

1. Migration (tabeller + RLS + GRANTs + radie-fält).
2. Edge function `process-location-ping` + tester.
3. Mobil: installera Capacitor geolocation-plugins, bygg `useGeofenceTracker`.
4. UI: banner + utcheckningsdialog + frånvarolista i `WorkerCheckInView`.
5. Admin: `AbsenceApprovalView` + uppdatera `PayrollReportView` till `net_hours`.
6. Lägg till "Geofence-radie"-fält i projektredigering.

## Att tänka på

- **Befintliga check-ins** påverkas inte — `net_hours` faller tillbaka på `duration_hours` när inga pings finns.
- **Capacitor krävs** för bakgrunds-GPS. I webbläsaren funkar det bara när fliken är öppen (visa varning).
- **Batteri**: 60 s intervall + `distanceFilter: 20m` håller förbrukningen rimlig.
- **GPS-drift på 50 m**: accuracy > 30 m räknas inte som "utanför" för att undvika falska larm trots "direkt vid första ping"-regeln (annars triggar drift hela tiden). Detta är teknisk nödvändighet — säg till om du vill skippa det.
