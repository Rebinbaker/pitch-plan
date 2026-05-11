## Mål
Möjliggöra att lägga till nya regioner direkt från projektmodalen (AddProjectModal), så att alla i organisationen kan använda dem. Idag är `Region` hårdkodad till `'Stockholm' | 'Västra Götaland'`.

## Lösning i korthet

### 1. Databas (Supabase)
Ny tabell `regions`:
- `name` (text, unik per organisation)
- `organization_id` (kopplad till organisation)
- `user_id` (vem som skapade)
- standardfält (id, created_at)

RLS: organisationsmedlemmar kan läsa, skapa och ta bort regioner i sin organisation.

Seed: lägg in `Stockholm` och `Västra Götaland` automatiskt för befintlig organisation så inget bryts.

### 2. Typer
- Ändra `Region` i `src/types/project.ts` från en hårdkodad union till `string`, så att vilka regioner som helst kan användas.
- Ta bort fallande TypeScript-fel i komponenter som jämför mot literalvärden.

### 3. Hook
Ny hook `useRegions()` som:
- Hämtar regioner från Supabase för aktuell organisation
- Exponerar `addRegion(name)` och `regions: string[]`
- Cachar lokalt och invaliderar vid tillägg

### 4. UI – AddProjectModal (desktop + mobil)
I region-dropdownen:
- Lista regioner från `useRegions()` istället för hårdkodade värden
- Längst ned i listan: en knapp **"+ Lägg till ny region"**
- Klick öppnar en liten inline-dialog/popover med textfält + Spara-knapp
- Vid spar: anropar `addRegion`, stänger dialogen och väljer den nya regionen automatiskt

Samma ändring i `src/components/mobile/MobileAddProjectModal.tsx`.

### 5. Övriga ställen som listar regioner
Filter-dropdowns (`ProjectHeader`, `WeeklyPlanningView`, `MobilePlanningView`, `TeamsView`, `ProjectMapView`, `MaterialOrdersDashboard`, `OrderHistoryView`, `DataExportModal`) byts till att läsa från `useRegions()` istället för hårdkodade `<SelectItem>`. Inget radering-UI där – bara läsning.

## Tekniska detaljer

```text
regions
├── id (uuid, PK)
├── organization_id (uuid)
├── user_id (uuid)
├── name (text)
├── created_at (timestamptz)
└── UNIQUE (organization_id, name)
```

RLS-policys speglar mönstret från `customers`/`projects` (`is_organization_member(auth.uid(), organization_id)`).

Borttagning av regioner ingår **inte** i denna iteration – endast tillägg från modalen. Kan läggas till senare i Admin om du vill.

## Filer som ändras
- `supabase` migration (ny tabell + RLS + seed)
- `src/types/project.ts` (Region → string)
- `src/hooks/useRegions.ts` (ny)
- `src/components/AddProjectModal.tsx` (dropdown + "Lägg till"-flöde)
- `src/components/mobile/MobileAddProjectModal.tsx` (samma)
- Övriga komponenter ovan: byt hårdkodade regionalternativ mot `useRegions()`
