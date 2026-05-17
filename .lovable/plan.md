## Mål

Ställningsmontören får en egen vy som speglar admin-vyn, men där allt fokus ligger på ställningar. Han kan följa sina projekt, bocka av ställningsmoment och se sin tidsrapport/lön.

## Vad byggs

### 1. `/scaffolder` — gör om till tre flikar
- **Mina projekt** (default)
- **Historik**
- **Tidsrapport** (lön/incheckningar)

### 2. Fliken "Mina projekt"
- Hämta projekt där `scaffolding_team_id` = mitt team **ELLER** `construction_team` = mitt teams namn (för befintliga projekt utan ny koppling).
- Filtrera på status `pågående` + `planerade` (samma som admin "Pågående" + "Planerat").
- Visa **samma `ProjectCard`-komponent** som admin använder (adress, kund, status, datum, progress) — read-only läge (inga admin-knappar).
- Klick på kort → ny modal `ScaffolderProjectModal` (inte hela admin-modalen).

### 3. `ScaffolderProjectModal` — ställningsfokuserad
- Topp: projektinfo (namn, adress, kund, datum, karta-länk).
- **Ställningschecklista** med tre steg (sparas i `scaffolding_confirmations`):
  1. ✅ Ställningar bokade (kommentar valfri)
  2. ✅ Transport bokad (kommentar valfri)
  3. ✅ Ställningar uppmonterade (foto krävs)
- Varje rad visar bekräftat av/när om klart, "Markera klart"-knapp annars.
- Efter sista bekräftelsen → projektets checklist-item "Ställningshantering" hos admin uppdateras automatiskt (admin-sidan läser från samma tabell).
- (Nedmontering kan läggas till i nästa iteration — håller scopet rent nu.)

### 4. Fliken "Tidsrapport"
- Återanvänd samma in-/utcheckningslogik som `WorkerApp` (samma `worker_check_ins`-tabell, samma foto-flow, samma GPS-check).
- Visa pågående incheckning, dagens summa, historik (timmar + lön).
- Incheckning sker från projektkort i "Mina projekt" (knapp "Checka in" på kortet, precis som i WorkerApp).

### 5. Routing-fix
- WorkerApp redirectar redan till `/scaffolder` om användaren bara är i Ställningsmontör-team. Skärmdumpen visar `/worker` med "inga projekt" — beror på att Michel inte var i ett Ställningsmontör-team än, eller att Index inte redirectade. Behåller logiken; ingen ändring behövs där.

## Teknisk struktur

```text
src/pages/ScaffolderApp.tsx          (skrivs om)
src/components/scaffolder/
  ScaffolderProjectsList.tsx         (ny — visar ProjectCard-grid)
  ScaffolderProjectModal.tsx         (ny — checklista + info)
  ScaffolderTimeTracking.tsx         (ny — extraherad från WorkerApp)
```

- Återanvänder `ProjectCard` direkt (med `isAdmin={false}` så inga admin-knappar visas).
- Återanvänder `scaffolding_confirmations`-tabellen som redan finns.
- Återanvänder `worker_check_ins`-tabellen och `worker-checkin-photos`-bucket.

## Vad som INTE ingår nu
- Nedmontering av ställningar (separat iteration).
- Redigering av projektinfo från montörens vy (read-only).
- Admin-checklistans auto-uppdatering är redan kopplad via `ScaffoldingConfirmationsCard` i ProjectDetailModal — ingen ny logik krävs där.
