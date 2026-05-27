
## Mål

Återanvända Olivers befintliga huvudvy (`ProjectDashboard` + `ProjectDetailModal` + `ProjectCard`) för alla chef-roller. Samma design, kort, modaler, flikar, badges och färger — enda skillnaden är **vilken data** och **vilka actions** som visas/är skrivbara. Allt skriver till samma `projects`-rad så Olivers vy uppdateras live.

## 1. Roller

Utöka `app_role` enum + `UserRole`-typen:
- `production_controller` (Oliver) — ser allt, kan allt (samma som admin)
- `scaffolding_manager` (Ställningschef)
- `container_manager` (Containeransvarig)
- `construction_manager` (Byggledare / materialansvarig)

Roll sätts via Chef-teamet i `TeamsView` — titel ("Ställningschef", "Containeransvarig", "Byggledare") mappas till systemroll när inloggning skapas.

## 2. Routing

I `App.tsx` lägger jag in en `RoleRouter`-wrapper på `/`:
- `admin` / `production_controller` → nuvarande `Index` (oförändrad)
- `scaffolding_manager` → `/chef/stallning`
- `container_manager` → `/chef/container`
- `construction_manager` → `/chef/bygg`
- `worker` → `/worker` (finns redan)

Varje chef-route renderar **samma `Index`-sida** men med en `roleScope`-context som filtrerar projektlistan och styr vilka flikar/actions som visas i modalen. Inga nya kort, inga nya modaler — bara villkorad rendering inuti de befintliga.

## 3. Data — använder befintliga JSONB-fält

Migrationen som redan körts har:
- `projects.scaffolding_status` jsonb
- `projects.container_status` jsonb
- `projects.construction_status` jsonb
- `projects.activity_log` jsonb (finns redan)
- `projects.completion_percentage`, `work_phases`, `material_order`, `checklist` (finns redan)

Inga nya kolumner behövs. Varje roll skriver bara till sitt eget JSONB-fält + appendar i `activity_log`.

## 4. Rollscope i `ProjectDashboard` & `ProjectDetailModal`

En ny prop `roleScope?: 'all' | 'scaffolding' | 'container' | 'construction'`:

**Dashboard-filter:**
- `scaffolding` → projekt där ställning behövs (har `scaffolding_team_id` eller checklist innehåller ställningspost)
- `container` → projekt som behöver container (checklist eller `container_status` initierad)
- `construction` → alla aktiva projekt (material berör alla)
- `all` → ingen filtrering (Oliver/admin)

**Modal-flikar:** existerande flikar visas/döljs efter scope. Övriga fält renderas read-only så chefen ser kontext (planerad byggstart, väder, kund, adress) men kan bara redigera sin del.

**Actions per scope:**
- Ställning: planera, ritning, leverantör (PERI), tilldela montörer, datum, statusknappar (Beställd / På väg / Monterad / Nedmontering bokad / Nedmonterad), kommentar, filuppladdning
- Container: boka, typ ('10 Kubikare'/'20 Kubikare' — befintlig constraint), leverantör, leveransdatum, statusknappar, sortering, extra kostnad, kommentar, filer
- Bygg: materialbeställning, materiallista, Beställt/Levererat, tekniska kommentarer, avvikelse, godkänn teknisk plan, egenkontroller, slutbesiktning, filer

## 5. Live-sync till Olivers vy

Aktiverar Supabase Realtime på `projects`. I `ProjectDashboard` lägger jag in en `useEffect` med `supabase.channel('projects').on('postgres_changes', …)` som mergear inkommande rader in i lokal state. Eftersom alla roller skriver till samma rad uppdateras Olivers kort, progressbar och badges direkt utan reload.

## 6. Aktivitetslogg

En hjälpfunktion `logActivity(projectId, { user, role, field, oldValue, newValue, comment })` som varje rollvy anropar i samma update-call (appendar till `activity_log` JSONB). `ActivityLogView` renderar redan loggen — jag lägger bara till roll-badge.

## 7. Skapa chef-inloggningar

Edge function `create-chef-account` (kopia av befintliga `create-worker-account`) som tar email + password + titel och:
1. Skapar auth-användare
2. Mappar titel → systemroll
3. Lägger raden i `user_roles`
4. Lägger till user_id på Chef-teamets medlem

Knapp "Skapa inloggning" på Chef-kortet i `TeamsView`.

## Filer som ändras / skapas

**Skapas:**
- `src/components/RoleRouter.tsx`
- `src/contexts/RoleScopeContext.tsx`
- `src/pages/ChefStallning.tsx`, `ChefContainer.tsx`, `ChefBygg.tsx` (tunna wrappers runt `Index` som sätter scope)
- `supabase/functions/create-chef-account/index.ts`

**Ändras:**
- `src/App.tsx` — `RoleRouter` på `/` + tre chef-routes
- `src/hooks/useUserRole.ts` — utöka `UserRole`
- `src/components/ProjectDashboard.tsx` — `roleScope`-filter + realtime-subscription
- `src/components/ProjectDetailModal.tsx` — visa flikar/actions efter scope, övrigt read-only
- `src/components/ProjectCard.tsx` — oförändrat (badges drivs redan av samma data)
- `src/components/TeamsView.tsx` — "Skapa inloggning"-knapp på Chef
- DB-migration: lägg till enum-värden + (om saknas) JSONB-kolumner

## Vad jag INTE rör

- Designsystem, färger, spacing, befintliga komponenter
- Worker-app, Scaffolder-app (egna flöden som redan finns)
- Olivers/admins vy — exakt som idag
- Affärslogik i `ProjectDashboard` utöver filter + realtime

## Leveransordning

1. DB-migration (roller + ev. saknade kolumner)
2. `RoleScopeContext` + `RoleRouter` + chef-pages
3. `roleScope`-prop genom `ProjectDashboard` → `ProjectDetailModal`
4. Realtime-subscription
5. Edge function + "Skapa inloggning"-knapp i `TeamsView`
6. Aktivitetslogg-hjälpare + roll-badge

Vill du att jag kör hela ordningen i ett svep, eller börjar med steg 1–3 så du kan testa rollroutingen innan resten?
