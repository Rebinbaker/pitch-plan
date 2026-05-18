## Mål

Få höjd/längd att stämma bättre genom att (1) tvinga räta linjer och (2) tillåta flera kalibreringsreferenser (egna mått + byggnadsstandarder) som snittas ihop till en stabilare skala.

## Varför nuvarande mått blir för korta

- Skalan kommer från **en enda kort kalibreringslinje** (du satte 2,1 m). Ett pixelfel på 5 px ger 10–20 % skalfel.
- Höjd- och längdlinjerna är **inte räta** — du drar diagonalt, så pixelavståndet underskattar verkligt avstånd när du tror du drar lodrätt/vågrätt.
- Ingen perspektivkompensation. En kort referens långt fram i bilden ger fel skala för fasaden längre bort.

## Vad jag bygger

### 1. Lås raka linjer (`ScaffoldingPhotoMeasure.tsx`)
- Ny `axis`-egenskap per linjetyp:
  - `height` → låst **vertikal** (samma x)
  - `length` → låst **horisontell** (samma y)
  - `calibrate` → fri, eller väljbar (vertikal/horisontell/fri)
- Shift-tangent = tillfälligt fri linje om något undantag behövs.
- Vid `onMove`: snäpp x2/y2 till linjens fasta axel.
- Tooltip visar live-mått under dragning.

### 2. Flera referensmått (kalibreringspanel)
Ersätt enskilt "Referensmått"-fält med en lista över referenser:

```
[ + Lägg till referens ]
  • Egen: rita linje + skriv mått (t.ex. "fönsterbredd 1,2 m")  [ta bort]
  • Standard: dropdown med vanliga svenska byggmått ▾
       - Ytterdörr höjd 2,10 m
       - Ytterdörr bredd 0,90 m
       - Fönster standard höjd 1,20 m
       - Fönster standard bredd 1,00 m
       - Tegelpannrad ≈ 0,32 m
       - Våningshöjd hus ≈ 2,70 m
       - Garageport höjd 2,10 m
       - Takfotshöjd 1-plan ≈ 2,70 m
```

- Varje referens = en uppmätt linje + känt mått → ger en `metersPerPx`.
- Slutlig skala = **viktat medel** där referenser med längre pixellängd får högre vikt (mer pålitliga).
- Visa skala + spridning: "Skala 1,8 cm/px (±6 %, 3 referenser)" — färgat gult om spridning >15 %.
- Varning om spridning är stor: "Dina referenser är inkonsekventa — kontrollera placeringen."

### 3. Bättre UX runt kalibrering
- Tydlig instruktion: "Rita längs något så långt som möjligt på samma avstånd som fasaden för bäst noggrannhet."
- Knapp "Använd vägg-/fönsterstandard" som låter dig välja standardmått och bara rita linjen.
- Höjd/längd-mått visas både vid linjen och i sammanfattningen, med konfidens-badge baserat på spridningen.

### 4. Skicka rikare data till `visualize-scaffolding`
- `measurements.calibration_sources: [{label, meters, px}]`
- `measurements.scale_confidence: number`
- AI-prompten nämner att måtten är kalibrerade mot flera referenser.

## Filer som ändras
- `src/components/scaffolder/ScaffoldingPhotoMeasure.tsx` — axislåsning, multi-referens-state, viktad skala, ny UI.
- `supabase/functions/visualize-scaffolding/index.ts` — ta emot `calibration_sources`, använda i prompten.

## Inte i scope nu
- Perspektivkorrigering (4-punkts homografi) — kan läggas till senare som "avancerat läge" om detta inte räcker.
- AI-snäppning till takfot/kanter — kan läggas till efteråt.
