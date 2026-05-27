## Mål

Bygga vidare på befintlig app så att varje roll får sin egen filtrerade vy av samma projektdata — med identisk design, UX, kortstruktur och komponenter som Olivers huvudvy. Alla uppdateringar skrivs till samma `projects`-rad och syns live hos Oliver.

## 1. Roller & behörigheter

Utöka `app_role` enum (DB) och `UserRole` (frontend) med fyra nya roller:
- `production_controller` (Oliver) — ser allt, kan redigera allt
- `scaffolding_manager` (Ställningschef)
- `container_manager` (Containeransvarig)
- `construction_manager` (Byggledare / materialansvarig)
- `construction_team` (Bygglag) — finns delvis redan som `worker`

Roll sätts via Chef-teamet som redan skapas i `TeamsView` (titel = ansvarsområde). När en chef skapas kopplas `auth.users` → `user_roles` automatiskt via edge function (samma mönster som `create-worker-account`).

## 2. Routing & login-flow

I `App.tsx` lägger vi till en `RoleRouter` på `/`:
- `admin` / `production_controller` → nuvarande `Index` (Olivers huvudvy, oförändrad)
- `scaffolding_manager` → `/chef/stallning`
- `container_manager` → `/chef/container`
- `construction_manager` → `/chef/bygg`
- `construction_team` / `worker` → `/worker` (finns)

Alla chef-vyer renderar **samma** `ProjectDashboard`-komponent men med:
- en `roleFilter`-prop som filtrerar projektlistan
- en `roleScope`-prop som styr vilka fält/flikar/actions som visas i `ProjectDetailModal`

Detta garanterar 100 % design-paritet — inga nya kort, modaler eller komponenter.

## 3. Datamodell — fält som behövs på `projects`

Tabellen har redan `material_order`, `accommodation_booking`, `activity_log`, `checklist`, `work_phases`, `completion_percentage`, `status`. Vi lägger till JSONB-kolumner för rollspecifika statusar:

- `scaffolding_status` — `{ planned, drawing_done, supplier, assemblers[], assembly_date, ordered_at, en_route_at, assembled_at, dismantle_booked_at, dismantled_at, comment, files[] }`
- `container_status` — `{ booked_at, type, supplier, delivery_date, delivered_at, pickup_booked_at, picked_up_at, sorting, extra_cost, comment, files[] }`
- `construction_status` — `{ material_ordered_at, material_delivered_at, tech_comments[], deviations[], tech_plan_approved_at, self_checks_reviewed_at, final_inspection_passed_at, files[] }`
- `team_daily_status` — `{ entries: [{ date, user_id, phase_updates[], photos[], material_shortage, problems, weather_blocker, note, day_done_at }] }`
- `risk_flags` — `{ id, type, severity, raised_at, resolved_at }[]` (genereras automatiskt, se §6)

Varje uppdatering skriver också en post i `activity_log` med `user_id`, `role`, `field`, `old`, `new`, `timestamp`, `comment`.

## 4. Rollvyer (samma `ProjectDashboard`)

### Ställningschef
- Filtrerar `projects` där `scaffolding_team_id IS NOT NULL` eller där ställning behövs.
- I modal: bara fliken **Ställning** med actions: planera, ritning, leverantör (PERI), tilldela montörer, datum, statusknapparna *Beställd / På väg / Monterad / Nedmontering bokad / Nedmonterad*, kommentar, fil-upload.

### Containeransvarig
- Filtrerar projekt där `container`-fält efterfrågas i checklist eller `container_status` finns.
- Flik **Container**: boka, typ (från memory: '10 Kubikare' / '20 Kubikare'), leverantör, leveransdatum, *Beställd / Levererad / Hämtning bokad / Hämtad*, sortering, extra kostnad, kommentar, filer.

### Byggledare
- Ser alla aktiva projekt (material berör alla).
- Flikar **Material**, **Teknik**, **Egenkontroll**, **Besiktning** med actions enligt spec.

### Bygglag
- Filtrerar projekt där `auth.uid()` finns i `teams.members` för projektets `construction_team`.
- Flik **Mitt arbete**: arbetsmoment-checkbox per fas (skriver `work_phases`), foto-upload, knappar *Materialbrist / Problem / Väderhinder*, dagsstatus-textfält, *Dagens arbete klart*.

### Oliver (oförändrad)
- Ser alla flikar och alla actions. Får dessutom en ny **Mina uppgifter / Riskflaggor**-panel överst på dashboarden.

## 5. Live-uppdatering till Olivers vy

- Aktivera Supabase Realtime på `projects` (redan möjligt — vi enablar replikering).
- I `ProjectDashboard` lägger vi till en `useEffect` med `supabase.channel('projects').on('postgres_changes', …)` som uppdaterar lokal state vid INSERT/UPDATE.
- Eftersom alla roller skriver till samma rad reflekteras ändringar omedelbart i Olivers kort, progressbar och badges.

## 6. Riskflaggor (cron / on-read)

En edge function `compute-risk-flags` körs schemalagt (var 15:e min) och uppdaterar `risk_flags`-kolumnen enligt reglerna:
- Ställning ej monterad < 24h före `start_date`
- Material ej beställt < 48h före `start_date`
- Container ej bokad < 24h före `start_date`
- Inga foton från bygglag på 24h
- `work_phases` orörda på 24h
- Passerat `deadline`
- Alla arbetsmoment klara men ingen `final_inspection_passed_at`

Flaggorna renderas som badges på `ProjectCard` (befintlig komponent — ny variant `risk`) och i Olivers KPI-panel.

## 7. Aktivitetslogg

En hjälpfunktion `logActivity(projectId, change)` används av alla rollvyer. Skriver till `projects.activity_log` (befintlig JSONB). Visas redan i `ActivityLogView` — vi utökar bara renderingen att visa roll-badge.

## Tekniska detaljer

**DB-migration:**
- Lägg till kolumner ovan på `projects`
- Lägg till enum-värden i `app_role`
- Uppdatera `has_role`-baserade RLS — projekt kan redan läsas/skrivas av alla org-medlemmar, så ingen RLS-ändring krävs för basscenariot. Bygglagets filtrering sker i frontend + `is_project_scaffolder`-motsvarighet för construction.
- Lägg till `is_project_construction_team(uuid, uuid)` security-definer-funktion analogt med befintlig `is_project_scaffolder`.

**Frontend-filer som ändras:**
- `src/App.tsx` — ny `RoleRouter`
- `src/hooks/useUserRole.ts` — utöka `UserRole`-typen
- `src/components/ProjectDashboard.tsx` — `roleFilter` + `roleScope` props, realtime-subscription
- `src/components/ProjectDetailModal.tsx` — visa flikar/actions baserat på `roleScope`
- `src/components/ProjectCard.tsx` — rendera risk-badges
- `src/components/TeamsView.tsx` — när Chef skapas, anropa edge function för att skapa auth-user med rätt roll
- Nya tunna wrappers: `pages/ChefScaffolding.tsx`, `pages/ChefContainer.tsx`, `pages/ChefConstruction.tsx` (var och en bara `<ProjectDashboard roleScope="…" />`)

**Edge functions:**
- `create-chef-account` (kopia av `create-worker-account` med dynamisk roll)
- `compute-risk-flags` (cron)

## Vad jag INTE rör

- Designsystem, färger, spacing, befintliga komponenter
- Worker-app, Scaffolder-app (separata flöden som redan finns)
- Auth-flöden, organisation/medlemskap
- Befintlig affärslogik i `ProjectDashboard`

## Leveransordning

1. DB-migration (roller + kolumner + helper-funktion)
2. Edge function för chef-konton + koppla i `TeamsView`
3. `RoleRouter` + chef-pages
4. `roleScope`-prop genom `ProjectDashboard` → `ProjectDetailModal`
5. Realtime-subscription
6. Risk-flag edge function + badge-rendering
7. Bygglagets vy (filtrering på `members`)

Vill du att jag kör hela ordningen i ett svep, eller börjar med steg 1–3 så du kan testa rollroutingen innan resten?