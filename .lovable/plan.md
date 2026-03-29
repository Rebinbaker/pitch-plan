
# Lägesbild (vad som faktiskt gäller i koden nu)

- Påståendet från det andra programmet stämmer **inte** för detta repo:
  - `src/pages/Index.tsx` → `handleCreateProject` gör bara `addProject(newProject)` och stänger modal.
  - Ingen `generateQuotePdf` används i frontend.
  - Ingen `quote_pdf_base64` finns i frontend-koden.
- Edge function `supabase/functions/create-project-from-sale/index.ts` **kan** ta emot och spara PDF (`quote_pdf_base64`, `quote_pdf_filename`) och skriva till `files`.
- `files`-tabellen är tom just nu (inga filer inskrivna), vilket betyder att PDF-data inte når fram eller inte kan processas.
- I både desktop- och mobilens projektdetalj är fliken **Filer** fortfarande placeholder (visar inte verkliga filer), så även om fil finns i DB syns den inte där.

# Plan (för att göra detta robust end-to-end)

## 1) Visa riktiga filer inne i projektkortets “Filer”-flik
Uppdatera:
- `src/components/ProjectDetailModal.tsx`
- `src/components/mobile/MobileProjectDetailModal.tsx`

Så att de:
- tar emot `files` som prop,
- filtrerar på `file.projectId === project.id`,
- visar lista/kort med namn, datum, typ,
- öppnar `FilePreviewModal` och stödjer nedladdning.

## 2) Tråda igenom `files` från toppnivå till modalerna
Uppdatera prop-kedjan:
- `src/pages/Index.tsx` (skicka `files` vidare)
- `src/components/ProjectDashboard.tsx`
- `src/components/WeeklyPlanningView.tsx`
- mobilkedjan via `MobileProjectCard` → `MobileProjectDetailModal`

Mål: samma data i globala Filer-vyn och i projektets egen Filer-flik.

## 3) Lägg till realtidslyssning för `files` i `useSupabaseStorage`
I `src/hooks/useSupabaseStorage.ts`:
- skapa `supabase.channel(...).on('postgres_changes', table: 'files', filter org)` likt projects/scaffolding/teams,
- anropa `loadSupabaseFiles()` vid insert/update/delete.

Mål: fil dyker upp utan manuell refresh när CRM skapar projekt + PDF.

## 4) Härda edge function för PDF-inmatning och felsökning
I `supabase/functions/create-project-from-sale/index.ts`:
- acceptera både rå base64 och Data URL-format (`data:application/pdf;base64,...`) genom att alltid strippa prefix defensivt,
- logga tydligt:
  - om `quote_pdf_base64` saknas,
  - om decode misslyckas,
  - om upload till `project-files` misslyckas,
  - om insert i `files` misslyckas,
  - samt success-logg med `project.id` och filnamn.
- (valfritt men rekommenderat) returnera `quote_pdf_received: boolean` och `quote_pdf_stored: boolean` i responsen för enklare verifiering i CRM.

## 5) Verifiering end-to-end
Testflöde:
1. Stäng en affär i CRM med offert-PDF.
2. Kontrollera edge-loggar för “Quote PDF stored for project”.
3. Verifiera ny rad i `files` med rätt `project_id`.
4. Öppna projektkortet → flik “Filer” och kontrollera att PDF syns där.
5. Kontrollera även globala “Filer”-vyn för samma fil.

# Tekniska detaljer (kort)
- Ingen ny tabell krävs (tabell `files` och bucket `project-files` finns redan).
- Fokus är:
  - UI-bindning i projektdetalj,
  - realtidssynk för `files`,
  - robust payload-hantering + observability i edge function.
- Detta angriper både sannolika felkällor:
  1) CRM skickar inte/ skickar fel format på PDF,
  2) filen finns men syns inte i projektkortets nuvarande placeholder-flik.
