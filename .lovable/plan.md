## Mål
Skala ned ställningsmontörens vy till ett enkelt kort med AI-driven foto-analys som returnerar uppskattad höjd/längd och en PERI-materiallista.

## 1. Förenklad checklista (4 punkter)

Ersätt 6-stegs checklistan med:

```text
☐ Foton + AI-analys klar
☐ Materiallista godkänd & beställd
☐ Transport bokad + montörer tilldelade
☐ Ställning byggd & säkerhetssignerad
```

Allt annat (planerings-8-punkter, transport-5, bemanning-5, utförande-5, slutfört-3) tas bort. Risk-badge och "Klar"-spärr (foton + signering) behålls.

## 2. AI-foto-analys (huvudfunktionen)

Ny tabb **"AI-analys"** i ställningsmodalen:

- **Bildkälla**: knapp "Använd projektets bilder" (hämtar från `project-files`) + drag-and-drop upload till `worker-checkin-photos/scaffolding/{project_id}/ai-input/`
- **"Analysera med AI"**-knapp → anropar edge function `analyze-scaffolding-photos`
- **Resultat** visas direkt:
  - Uppskattad **höjd**, **längd per sida**, **antal våningar**, **taktyp**, **risker** (åtkomst/mark/lift)
  - **PERI-materiallista** (tabell: artikel, antal, enhet)
  - Konfidensgrad + "AI-uppskattning, justera vid behov"-not
- **"Använd som materialspecifikation"** fyller befintlig `material_spec` → befintligt beställnings-mail fungerar

## 3. PERI-katalog

Du laddar upp PERI-katalogen (PDF/Excel) i nästa steg. Vi:

1. Parsar den med `document--parse_document` 
2. Sparar artiklar i ny tabell `peri_catalog` (artikelnummer, namn, kategori, enhet, ev. pris)
3. AI:n får katalogen som kontext + system-prompt: *"Returnera ENDAST artiklar från denna katalog"*

## 4. Edge function: `analyze-scaffolding-photos`

```text
Input:  { project_id, photo_urls: [], catalog_version }
1. Hämtar PERI-katalog från DB
2. Skickar bilderna + katalog till Lovable AI (google/gemini-2.5-pro — multimodal)
3. Output via AI SDK structured output (Zod-schema):
     { estimated: {sides_m[], height_m, floors, roof_type},
       risks: [],
       materials: [{peri_artnr, name, qty, unit}],
       confidence: 0-1, notes }
4. Sparar i scaffolding_jobs.ai_analysis (jsonb)
5. Returnerar till klienten
```

Använder befintlig `LOVABLE_API_KEY` och `createLovableAiGatewayProvider`-mönstret.

## 5. Databas

```sql
ALTER TABLE scaffolding_jobs 
  ADD COLUMN ai_analysis jsonb DEFAULT '{}',
  ADD COLUMN ai_analyzed_at timestamptz;

CREATE TABLE peri_catalog (
  id uuid pk, organization_id uuid, 
  artnr text, name text, category text, unit text, 
  price_sek numeric, active boolean default true
);
-- RLS: org-medlemmar läser, admin/moderator skriver
```

Vi tar bort de oanvända kolumnerna `checklist`, `photos`, `safety_signed_at/by`, `risk_level` behålls.

## 6. Filer som ändras/skapas

```text
SKAPAS:
  supabase/functions/analyze-scaffolding-photos/index.ts
  supabase/functions/_shared/ai-gateway.ts (om saknas)
  src/components/scaffolder/AIPhotoAnalysisTab.tsx
  src/components/admin/PeriCatalogUpload.tsx (admin laddar upp katalogen)

FÖRENKLAS:
  src/components/scaffolder/ScaffolderProjectModal.tsx  → 3 tabbar: Översikt | AI-analys | Material
  src/components/scaffolder/scaffoldingChecklist.ts     → 4 punkter
  src/components/scaffolder/ScaffolderProjectCard.tsx   → mindre info

TAS BORT:
  Sektionerna för planering/transport/bemanning/utförande/slutfört (komponenter fanns aldrig som separata filer — bara i checklistan)
```

## Byggordning

1. **Du laddar upp PERI-katalogen** → jag parsar och skapar migration för `peri_catalog` + seed
2. Migration: förenkla `scaffolding_jobs`
3. Edge function `analyze-scaffolding-photos`
4. `AIPhotoAnalysisTab` + förenklad modal/checklista
5. Test med 3-4 riktiga husbilder

## Begränsningar

- AI-uppskattning är just det — en uppskattning. Användaren måste alltid kunna justera värdena innan beställning.
- Första versionen kör en bild-batch åt gången (max ~10 bilder per analys).
- Priser i PERI-katalogen lägger vi till senare om de inte finns med från start.
