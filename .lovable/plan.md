## Mål
Bygg om ställningschefens vy så att den ser ut och fungerar som huvudappen (kort + checklista-modal + karta), men helt anpassad för ställningsarbete med 6-stegs checklista, automatisk materialberäkning, fotokrav och notiser.

## 1. Layout — matcha huvudappen

Ersätt nuvarande `ScaffolderProjectsList` + `ScaffolderProjectModal` med samma struktur som `ProjectDashboard`/`ProjectDetailModal`:

- Header med bild-bakgrund, titel "Ställningsprojekt", sökfält, statusfilter (Planerad / Pågående / Klar)
- KPI-rad: `Totalt`, `Att planera`, `Pågående`, `Klara denna vecka`, `Försenade`
- **Lista / Karta**-toggle (samma knapp uppe till höger)
- Projektkort med adress, kund, byggstart, progress-bar (baserat på ställnings-checklistans 6 steg), risk-badge (röd/gul/grön)
- Modal: flikar **Översikt · Checklista · Material · Transport · Bemanning · Foton · Aktivitetslogg**

## 2. Checklista (6 sektioner i tabben "Checklista")

Tabb-modal i exakt samma stil som huvudappens checklista (collapsible-sektioner med progress).

```text
1. PLANERING        8 punkter + Kommentarer/Risker/Extra material
2. MATERIALBERÄKNING fält + auto-räknad lista + "Materiallista godkänd"
3. TRANSPORT        5 punkter + tel/Maps-länk/bilder på avställning
4. BEMANNING        5 punkter (montörer/starttid/boende/verktyg/lastbil)
5. UTFÖRANDE        5 punkter (påbörjad/färdig/säkerhet/bilder/signering)
6. SLUTFÖRT         3 punkter (PL notifierad/bygglag kan starta/klarmarkerad)
```

Varje box sparas direkt till `scaffolding_jobs.checklist` (ny jsonb-kolumn) med `{key, checked, at, by}`.

## 3. Auto-materialberäkning

Tabben "Material" får ett formulär:

```text
Indata: längder (sidor[]), höjd (m), antal gavlar, specialdelar (textarea)

Beräknas:
  ramar         = ceil(totalLängd / 3) * floors
  bomlag        = ramar
  diagonaler    = ceil(ramar / 2)
  fotplattor    = ramar * 2
  räcken        = ramar * floors
  trappor       = max(1, floor(totalLängd / 12))
  konsoler      = round(ramar * 0.3)
  väderskydd    = checkbox → täcker hela ytan
```

Resultatet visas som tabell + knapp **"Använd som materialspecifikation"** som fyller `material_spec` (befintlig). Sedan fungerar befintliga **Beställning**-flöde.

## 4. Fotokrav (blockerar slutförande)

Ny jsonb `documents.photos = { before: {hus,mark,placering}, after: {sida_n,sida_s,sida_o,sida_v,infästning,åtkomst,helhet} }`.

Lagring: bucket `worker-checkin-photos` under prefix `scaffolding/{project_id}/`.

Regel i klienten + edge: "Klar"-knapp disabled tills alla obligatoriska foton finns + säkerhetscheck signerad.

## 5. Karta

Ny komponent `ScaffolderMapView` som återanvänder `react-leaflet`-uppställningen från `ProjectMapView` men:

- Pin-färg = ställningsstatus (grå=ej planerad, blå=planerad, gul=pågående, grön=klar)
- Sidopanel listar **Ställningsvagnar nära att släppas** (från `scaffolding`-tabellen där `status='I bruk'` + projekt med checklist-key `assembled` checked → "snart ledig") och **Upptagna ställningar**
- Toggle Lista/Karta lagras i `localStorage` (`scaffolder-view-mode`), samma mönster som projektmemoryt

## 6. Automatisering (notiser + logg)

När `utforande.faerdigbyggd` markeras:

- Uppdatera `scaffolding_confirmations.assembled_at` (befintlig flow)
- Sätt motsvarande checkbox i `projects.checklist` ("Boka ställningsvagn") som klar
- Skriv `activity_log`-rad med user_id + timestamp
- Skapa `notifications`-rader till alla org-medlemmar med role admin/moderator (byggledare/COO) och till `responsible_seller`

Görs i ny edge function `scaffolding-mark-assembled` som kallas från klienten.

## Teknisk översikt

### Databas (migration)
- `scaffolding_jobs` ALTER: lägg till kolumn `checklist jsonb not null default '{}'`, `photos jsonb not null default '{}'`, `safety_signed_at timestamptz`, `safety_signed_by uuid`
- `scaffolding_jobs` ALTER: lägg till `risk_level text check in ('green','yellow','red') default 'green'`
- Storage: använd befintlig `worker-checkin-photos`-bucket, policys finns redan

### Edge functions
- Ny: `scaffolding-mark-assembled` (validerar scaffolder/admin, uppdaterar tabeller, skickar notiser)
- Befintlig `send-scaffolding-order` behålls

### Frontend (nya/ändrade filer)
```text
src/pages/ScaffolderApp.tsx                       (tabs: Projekt | Karta | Historik | Tid)
src/components/scaffolder/ScaffolderDashboard.tsx (NY — header/KPI/grid)
src/components/scaffolder/ScaffolderProjectCard.tsx (NY)
src/components/scaffolder/ScaffolderMapView.tsx   (NY)
src/components/scaffolder/ScaffolderProjectModal.tsx (omarbetad — 7 tabbar)
src/components/scaffolder/sections/
  PlaneringSection.tsx
  MaterialBerakningSection.tsx
  TransportSection.tsx
  BemanningSection.tsx
  UtforandeSection.tsx
  SlutfortSection.tsx
  FotoUploadSection.tsx
src/utils/scaffoldingCalculator.ts                (NY — auto-formler)
```

### Byggordning
1. Migration (kolumner på `scaffolding_jobs`)
2. `scaffoldingCalculator.ts` + sektionskomponenter
3. Modal med 7 tabbar
4. Dashboard + kort (kopiera mönster från `ProjectDashboard`)
5. Kartvy
6. Edge function + notiser
7. Genomtest med befintligt projekt

### Begränsningar i denna iteration
- Bilder lagras men automatisk komprimering/EXIF görs inte
- Notis-mailen till säljare/COO begränsas till in-app `notifications` (ingen e-post — kan läggas till senare)
- Materialformlerna är schablon-baserade; finjustering görs när Michel testat
