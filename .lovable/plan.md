
## Mål

Michel (ställningschef) ska, så fort ett sälj skapas, automatiskt få ett eget ställningskort där han kan driva hela processen: mäta upp → materialspec → beställa material (mail skickas automatiskt) → boka transport → tilldela montörer + datum → bekräfta uppmontering → nedmontering. Allt syns även hos admin.

## Vad Michels kort ska innehålla

Kortet blir ett scrollbart fönster med tydliga sektioner. I ordning:

**1. Projektinfo (top)**
- Adress (klickbar → Google Maps), kund, telefon, säljare, ROT-status
- Startvecka + planerat start-datum
- Notisfält "Senaste händelse" (vem gjorde vad senast)

**2. Mätning & uppskattning**
- Fält: antal löpmeter ställning, antal våningar, fasadhöjd, sidor (norr/söder/öst/väst), special (utskjutande tak, balkonger, etc.)
- Fältet "Beräknat antal sektioner" räknas ut automatiskt
- "Mätt klart"-toggle med datum + ev. foto av huset

**3. Materialspecifikation**
- Lista rader: typ (ram, plank, fotlist, räcke, konsol, fästöra, etc.), antal, enhet, kommentar
- Lägg till/ta bort rad, spara som utkast
- Förifyllda standardrader från en mall (kan ändras)
- Summering: total vikt/volym (informativt)

**4. Materialbeställning**
- Knapp "Skicka beställning" → edge function mailar leverantör (Resend) med materialspec + leveransadress + önskat leveransdatum
- Visar status: utkast → skickad (visar tidpunkt + mottagare) → bekräftad (markeras manuellt när leverantör svarat)
- Möjlighet att skicka påminnelse

**5. Transport**
- Fält: transportör, önskad leveransdag, kontaktperson, bilstorlek
- Bekräfta-knapp (samma mönster som idag) + ev. foto av lastad bil

**6. Montörsplanering**
- Lista över medlemmar i Michels Ställning-team
- Välj vilka montörer som ska på jobbet + startdatum + uppskattat antal dagar
- Skapar rader i `team_schedules` så montörerna ser jobbet i sin egen kalender
- Visar deras tillgänglighet (upptagen/ledig den veckan)

**7. Uppmontering (bekräftelse)**
- Bock + foto (befintlig logik), kommentar
- Triggar att admin-checklistans "Ställningshantering" sätts klar

**8. Nedmontering**
- Egen rad: planerat datum + ansvarig montör
- Bock + foto när nedmonterat
- Trigger för admin-checklistans "Nedmontering av ställningar"

**9. Dokument & foton**
- Mini-galleri med alla foton (mätning, lastning, uppmontering, nedmontering)
- Möjlighet att ladda upp fritt: ritningar, kvitton, leveransbevis

**10. Aktivitetslogg**
- Vem gjorde vad och när (lokalt för kortet)

## Automatik vid nytt sälj

Trigger på `projects` (AFTER INSERT): skapa tom rad i `scaffolding_confirmations` + tom rad i ny tabell `scaffolding_jobs` (se nedan) för projektet, så Michels kort är redo direkt.

(Auto-tilldelning av team och notiser tar vi i nästa iteration enligt önskemål.)

## Teknisk struktur

```text
Nya/ändrade filer:
  src/components/scaffolder/ScaffolderProjectModal.tsx   (skrivs om till fliksystem)
  src/components/scaffolder/sections/
    MeasurementSection.tsx
    MaterialSpecSection.tsx
    MaterialOrderSection.tsx
    TransportSection.tsx
    AssemblerAssignmentSection.tsx
    AssemblySection.tsx          (befintlig 'assembled'-logik, utbruten)
    DismantleSection.tsx
    DocumentsSection.tsx
    ScaffolderActivityLog.tsx

  supabase/functions/send-scaffolding-order/index.ts     (ny edge function, Resend)

Databasmigration:
  CREATE TABLE scaffolding_jobs (
    id uuid PK,
    project_id uuid (unik),
    organization_id uuid,
    measurement jsonb,              -- { meters, floors, height, sides, notes, completed_at, photo_url }
    material_spec jsonb,            -- array av rader
    order_status text,              -- draft | sent | confirmed
    order_sent_at timestamptz,
    order_sent_to text,
    order_confirmed_at timestamptz,
    transport jsonb,                -- { carrier, date, contact, vehicle, booked_at, photo_url }
    assigned_members jsonb,         -- [{ user_id, name, start_date, days }]
    dismantle jsonb,                -- { planned_date, responsible, done_at, photo_url, note }
    documents jsonb,                -- [{ url, name, type, uploaded_at, uploaded_by }]
    activity_log jsonb,
    created_at, updated_at
  );

  ALTER TABLE scaffolding_confirmations -- ingen ändring, fortsätter användas för 3 huvudbekräftelser

  RLS:
    SELECT  -> organization_member
    INSERT/UPDATE -> admin OR is_project_scaffolder(auth.uid(), project_id)

  Trigger på projects AFTER INSERT:
    INSERT INTO scaffolding_confirmations (project_id, organization_id) ...
    INSERT INTO scaffolding_jobs (project_id, organization_id) ...

Edge function send-scaffolding-order:
  - Input: project_id
  - Validerar att caller är project-scaffolder eller admin
  - Hämtar projekt + scaffolding_jobs + leverantörsmail (från ny secret eller fält i jobbet)
  - Renderar HTML-mail (adress, materialrader, leveransdatum, kontakt)
  - Skickar via Resend (RESEND_API_KEY finns redan)
  - Uppdaterar scaffolding_jobs.order_status='sent', order_sent_at, order_sent_to
  - Loggar i activity_log

Admin-sidan:
  - ScaffoldingConfirmationsCard utökas med summering av jobs-data (material skickad? transport bokad? montörer satta?)
  - Ingen brytande ändring för befintliga projekt
```

## Säkerhet
- Funktionen `is_project_scaffolder` finns redan och återanvänds i RLS för `scaffolding_jobs`.
- Edge function använder service-role internt, validerar caller via JWT + RPC `is_project_scaffolder`.

## Vad som INTE ingår nu
- Auto-tilldelning av Michels team baserat på region (sparas till senare)
- Notifikation i hans flöde vid nytt sälj (sparas)
- Auto-block i veckoplanering (vi gör det manuellt via montörsplanering-sektionen tills vidare)
- Leverantörsregister/prisuppföljning som egna vyer — vi börjar med fritt fält för leverantörsmail per beställning

## Förslag på ordning för bygget
1. Migration (ny tabell + trigger + RLS) — backfill rader för befintliga projekt
2. Edge function `send-scaffolding-order`
3. Skriv om `ScaffolderProjectModal` till fliklayout med sektionerna
4. Bygg sektionerna i tur och ordning (mätning → materialspec → beställning → transport → montörer → nedmontering → dokument)
5. Utöka `ScaffoldingConfirmationsCard` för admin-vyn
6. Test: skapa nytt projekt, verifiera att Michels kort dyker upp tomt och kan fyllas i hela vägen
