## Visa senaste projekt på lediga ställningsvagnar

När en ställning checkas av som nedmonterad i checklistan ska vagnen komma ihåg vilket projekt som använde den senast. Den informationen visas på vagnens kort så fort den blir "Tillgänglig" igen — så att laget vet var den står och kan köra den vidare.

### Användarflöde

1. I projektets checklista bockas "Nedmontering ställning" som klar.
2. Den tilldelade vagnen frigörs (status → Tillgänglig) precis som idag.
3. **Nytt:** vagnen taggas med projektets namn + adress + datum för frigörande.
4. På Ställningar-sidan (desktop + mobil) visas på kortet, när status = Tillgänglig:
   *"Senast använd på: Villa Andersson – Storgatan 15 (frigjord 12 maj)"*
5. När vagnen tilldelas ett nytt projekt rensas/skrivs taggen över när den frigörs nästa gång.

### Datamodell

Två nya kolumner på `public.scaffolding`:
- `last_project_name text`
- `last_project_location text`
- `last_released_at timestamptz`

(Räcker med text — vi behöver bara visa det, inte joina mot projects. Om projektet senare raderas finns informationen kvar.)

På `ScaffoldingTrailer`-typen läggs motsvarande fält till:
- `lastProjectName?: string`
- `lastProjectLocation?: string`
- `lastReleasedAt?: string`

### Filer som ändras

- `supabase/migrations/...` (ny) — lägger till tre kolumner.
- `src/types/scaffolding.ts` — nya valfria fält.
- `src/integrations/supabase/types.ts` — regenereras efter migration.
- `src/hooks/useSupabaseStorage.ts`
  - Mappar in nya kolumnerna i `loadSupabaseScaffolding`.
  - `updateScaffolding` skickar med `last_project_name`, `last_project_location`, `last_released_at` när de finns.
- `src/components/ProjectChecklist.tsx` (rad 833–846) — när vagnen frigörs sätts:
  ```ts
  lastProjectName: project.name,
  lastProjectLocation: project.address,
  lastReleasedAt: new Date().toISOString(),
  ```
- `src/components/ScaffoldingView.tsx` — visa rad "Senast använd på: …" på kortet om `status === 'Tillgänglig'` och `lastProjectName` finns.
- `src/components/mobile/MobileScaffoldingView.tsx` — samma rad i mobilkortet.

### Antaganden

- Endast en "senaste användning" sparas (skrivs över vid nästa frigörande).
- Visas bara när vagnen är *Tillgänglig* — när den är *I bruk* visas det aktiva projektet som idag.
- Befintliga vagnar får tomma fält tills de frigörs nästa gång (ingen retroaktiv backfill).
