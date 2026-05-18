## Mål

Bygga om AI-fotoanalysen till ett **AI-assisterat men regelstyrt** ställningsprojekteringssystem där AI hjälper, användaren mäter, en regelmotor räknar PERI-material och en overlay ritas på bilden.

Detta är ett stort bygge — jag föreslår att leverera i **4 faser** så att varje steg kan testas och justeras innan nästa börjar.

---

## Fas 1 — Datamodell & sektioner (grund)

**Nya/utökade tabeller**
- `scaffolding_sections` — en rad per ställningssektion (Sida 1, gavel osv.)
  - `project_id`, `name`, `length_m`, `height_m`, `eave_height_m`, `width_m` (0.67/0.73), `work_levels`, `ground_condition`, `anchoring`, `bridging` (jsonb), `obstacles` (jsonb), `notes`
- `scaffolding_measurements` — varje ritad linje
  - `project_id`, `section_id` (nullable), `photo_url`, `type` (calibration/length/height/eave/obstacle/bridging/level-diff), `meters`, `px_length`, `coords` (jsonb {x1,y1,x2,y2}), `comment`, `confidence`, `source` (manual/ai)
- `scaffolding_jobs` — utöka med: `project_status` (enum 9 statusar), `material_lines` (jsonb beräknat), `manual_overrides` (jsonb), `overlay_state` (jsonb), `checklist_state` (jsonb)

**Statusenum**
`not_analyzed | ai_draft | measurements_verified | scaffolding_generated | manually_adjusted | material_approved | order_created | built | safety_checked`

---

## Fas 2 — Mät- & kalibreringsflöde

Ersätt nuvarande `ScaffoldingPhotoMeasure` med en flerstegs-canvas:

**Steg 1 – Kalibrering**
- Välj referens: ytterdörr 2,10 m, fönster 1,20 m, garageport 2,10 m, tegelskift 0,32 m, våningshöjd 2,70 m, eller egen
- Rita minst en (helst två) referenslinjer → räkna `metersPerPx` med viktat medelvärde och spridning
- Färgad konfidensbadge (grön <10 %, gul <20 %, röd >20 %)
- Varning om bara 1 referens

**Steg 2 – Mått**
Verktygspalett med typer: `fasadlängd`, `ställningshöjd`, `takfotshöjd`, `hinderzon` (rektangel), `överbryggning`, `marknivå-skillnad`. Axellåsning (vertikal/horisontell) från befintlig logik. Live-tooltip i meter. Varje linje sparas i `scaffolding_measurements`.

**Steg 3 – Sektioner**
Lista över sektioner. Knyt mätta linjer till en sektion (eller skapa ny från en längdlinje + höjdlinje). Formulär för bredd, bomlagshöjd, markförhållande, förankring, behov av fackverksbalk.

---

## Fas 3 — Regelmotor (PERI)

Ny ren TS-modul: `src/utils/peri/scaffoldingEngine.ts`.

**Input**: `ScaffoldingSection[]` + PERI-katalogartiklar (från `peri_catalog`-tabellen).

**Konstanter (default, justerbara per system)**
```ts
BAY_LENGTHS = [3.07, 2.57, 2.07, 1.57, 1.09, 0.73]  // PERI UP standardfack
LIFT_HEIGHT = 2.0    // bomlag
DECK_WIDTH = 0.67    // standard
ANCHOR_GRID = { vertical: 4.0, horizontal: 4.0 }  // var 4:e m
```

**Algoritm per sektion**
1. Dela längden i fackbitar (girigt största fack först + passbit)
2. Antal bomlag = ceil(height / 2.0)
3. Antal spirelinjer = facksektioner + 1
4. Räkna:
   - **Bottenskruvar/träunderlägg** = spirelinjer
   - **Spiror + toppspiror** = spirelinjer × bomlag (välj längd)
   - **Längd-/tvärbalkar** per fack och bomlag
   - **Stålplan/combiplan** = facksektioner × arbetsnivåer
   - **Fotlister** runt arbetsplan (längd + gavlar)
   - **Räcken** översta planet + ändräcken på gavlar
   - **Diagonaler** = var 5:e fack per bomlag (regel)
   - **Förankringar** = ceil(area / (4×4)) × (öglebult + plugg + förankringsrör + koppling)
   - **Fackverksbalk** om `bridging.span_m > 0`: välj balk efter spann, addera extra spiror vid landningar
   - **Hörn-/returmaterial** = extra koppling/spira per hörn mellan sektioner

5. Mappa varje regel mot `artnr` i `peri_catalog` (fallback om saknas → varningsrad)

**Output**: `MaterialLine[] { artnr, name, qty, unit, section_id, source: 'auto'|'manual', rule_id, note? }`

**Test**: snapshot-test för en 10×6 m sektion → förväntad lista.

---

## Fas 4 — Visuell overlay + AI-assist + checklista

**Overlay-renderare** (SVG ovanpå bilden, skalad med `metersPerPx`)
- Vertikala spirelinjer, horisontella bomlag, arbetsplan (fyllda rektanglar), diagonaler, räcken, fotlister, fackverksbalk över hinder, ankarprickar
- Drag-handtag för att flytta sektion, dra i kant för längd/höjd, +/- bomlag, lägg till/ta bort fack
- Vid ändring → regelmotor körs om → materiallista uppdateras live

**AI-assist** (edge function `analyze-scaffolding-photos` uppdateras)
- Returnerar **förslag** med konfidens för: takfotshöjd, fasadlängd, hinder (typ + bbox), behov av överbryggning, risker
- UI visar förslag i sidpanel — användaren kan "Acceptera" (skapar mätlinje/sektion) eller "Avvisa"
- Tre badges per värde: `AI-förslag` (grå) | `Bekräftad` (grön) | `Behöver granskas` (gul)

**Materiallistepanel**
- Tabell med artnr, namn, antal, enhet, sektion, källa (auto/manuell), kommentar
- "Lägg till manuell rad" + "Justera antal" (sparas i `manual_overrides`)
- Summerad totallista
- Knapp "Godkänn materiallista" → status `material_approved`

**Checklista för ställningschef** (15 punkter enligt spec)
- Sparas i `scaffolding_jobs.checklist_state`
- När "Ställning klar" bockas → uppdatera `projects.status` + logga i `activity_log` (vem, när, bilder, kommentar)

---

## Tekniska detaljer

- **Frontend**: React + Konva (eller ren SVG) för canvas. Konva ger bättre drag-handtag — föreslår att lägga till `react-konva`.
- **Regelmotor**: ren TypeScript i `src/utils/peri/` — körs i browsern (snabbt, inga round-trips). Edge function endast för AI-bildanalys.
- **PERI-katalog**: använd befintlig `peri_catalog`-tabell. Lägg till ett `rule_mapping`-fält (jsonb) per artikel som regelmotorn matchar mot (t.ex. `{ kind: 'spire', length_m: 2.0 }`).
- **Bakåtkomp**: nuvarande `AIPhotoAnalysisTab` ersätts av nytt `ScaffoldingProjectorTab` med 4 underflikar: **Bild & mått** | **Sektioner** | **Ritning & material** | **Checklista**.

---

## Förslag på leveransordning

1. **Fas 1 + 2** först (databas + mätflöde med sektioner) — ca ett par stora steg
2. **Fas 3** (regelmotor + materiallista, ingen overlay än) — verifierbart med tabellutdata
3. **Fas 4** (overlay-canvas, AI-assist-panel, checklista, statusflöde)

Vill du att jag börjar med **Fas 1 + 2** direkt, eller vill du ändra något i planen (t.ex. byta Konva mot ren SVG, eller skala ner sektionsmodellen)?
