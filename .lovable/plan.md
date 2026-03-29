

# Fix: CRM-skapade projekt saknar checklista och arbetsmoment

## Problem
Edge Function `create-project-from-sale` skapar projekt utan `checklist` och `work_phases`, så korten blir tomma jämfört med manuellt skapade projekt.

## Lösning
Uppdatera Edge Function att inkludera standardchecklistan (12 poster) och standardarbetsmomenten (11 poster) vid insert, samma som används i `AddProjectModal`.

## Teknisk ändring

**Fil:** `supabase/functions/create-project-from-sale/index.ts`

- Lägga till `defaultChecklist` och `defaultWorkPhases` som JSON-arrayer direkt i Edge Function (samma data som i `src/types/project.ts`)
- Inkludera `checklist` och `work_phases` i `.insert()`-anropet med genererade ID:n
- Sätta `activity_log` till en tom array `[]`

Inga databasändringar behövs -- kolumnerna finns redan.

