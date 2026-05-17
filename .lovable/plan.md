# Ställningsmontör-app (egen vy som uppdaterar projektkortet)

## Mål
Ge ställningsmontörer en egen mobilvänlig vy (likt `WorkerApp`) där de bara ser sina tilldelade projekt och kan bekräfta tre steg per projekt:
1. **Ställning bokad**
2. **Transport bokad**
3. **Ställning uppmonterad på plats**

När montören bockar i ett steg uppdateras motsvarande fält på projektet så att admin/projektledare ser det direkt i checklistan på projektkortet. Samma princip som ni redan har för "byggare" — varje roll jobbar i sin egen vy och uppdaterar samma projektkort.

## Hur det knyts ihop med befintligt system

- **Tilldelning:** Ett projekts ställningsteam pekas ut via `project.constructionTeam` redan idag (eller liknande fält). Vi inför ett separat fält `scaffolding_team` på projektet så ett bygge kan ha både ett byggteam och ett ställningsteam samtidigt utan att krocka.
- **Vilka ser projektet:** En ställningsmontör (TeamMember i ett team av typ `Ställningsmontör`) ser bara projekt där deras team är satt som `scaffolding_team`.
- **Roller:** Vi använder samma `worker`-roll som idag (skapas via "Create worker login"). Routing baseras på *teamets typ*, inte på en ny DB-roll — montörer som tillhör ett Ställningsmontör-team får ställningsvyn, övriga workers får byggarvyn.

## Nya/uppdaterade ytor

### 1. Ny route `/scaffolder` (ny sida `src/pages/ScaffolderApp.tsx`)
Tre kort per tilldelat projekt med adress, projektnamn, lagledare och tre toggle-knappar:
- ☐ Bokat ställningar (datum + ev. anteckning)
- ☐ Bokat transport (datum + ev. anteckning)
- ☐ Ställningar uppmonterade (kräver foto, samma flöde som dagens incheckning)

Varje bekräftelse är "engångs"-action (kan ångras endast av admin). Visar status, vem som bekräftade och när.

### 2. Routing i `src/App.tsx` / `src/pages/Index.tsx`
Vid inloggning: hämta användarens team. Om hen tillhör ett team med `type = 'Ställningsmontör'` → redirect till `/scaffolder`. Om `worker` men byggteam → `/worker` (befintligt). Övriga → admin-vyn.

### 3. Projektchecklistan (admin-sida)
Befintliga checklist-item `Ställningshantering` (och relaterade ställnings-actions) får tre understatus som speglar montörens bekräftelser. Auto-bockas när alla tre är klara. Visar liten badge "Bekräftat av [montör] · [datum]" så projektledaren ser källan.

### 4. Tilldela ställningsteam till projekt
I `MobileEditProjectModal` och projektets edit-flöde: ny dropdown "Ställningsteam" som **bara** listar team av typ `Ställningsmontör` (motsvarande filtret som redan utesluter Säljare/Ställningsmontör från byggteam-dropdownen, fast tvärtom).

## Databasändringar

Ny tabell `scaffolding_confirmations` (en rad per projekt):

| fält | typ |
|---|---|
| project_id | uuid |
| organization_id | uuid |
| booked_at / booked_by / booked_note | timestamptz / uuid / text |
| transport_booked_at / _by / _note | – |
| assembled_at / _by / _note / _photo_url | – + text |

RLS:
- SELECT: org members
- INSERT/UPDATE: org member **och** användaren tillhör projektets `scaffolding_team`
- Admin får alltid skriva

Tillägg på `projects`: `scaffolding_team_id uuid` (nullable).

Storage: återanvänd bucket `worker-checkin-photos` för uppmonteringsfoton (eller ny `scaffolding-photos` om ni vill separera — säg till).

## Tekniska detaljer

- `ScaffolderApp.tsx` återanvänder mönstret från `WorkerApp.tsx` (auth-guard, hämtning av tilldelade projekt, foto-capture med `capture="environment"`, GPS-verifiering valfri för uppmontering).
- Ny hook `useScaffolderJobs` som returnerar projekt där `scaffolding_team_id` matchar något av användarens team.
- I `ProjectChecklist.tsx` läs `scaffolding_confirmations` och rendera de tre understegen som read-only checkboxar för admin (de bockas av montören).
- Notifiering till projektledaren via befintliga `notifications`-tabellen när ett steg bekräftas.

## Öppna frågor innan jag bygger

1. Ska "transport bokad" innehålla val av leverantör / vilken ställningsvagn (kopplat till befintliga `scaffolding`-tabellen), eller räcker fri text?
2. Ska foto vara obligatoriskt även för "bokat ställningar" och "bokat transport", eller bara för uppmontering?
3. Vill du att nedmontering också ska in i denna vy senare (matchar checklist-itemet "Nedmontering av ställningar")? Jag kan lägga grunden för det nu.
