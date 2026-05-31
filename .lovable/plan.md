## Utöka "Välkomstsamtal" i projektchecklistan

### Vad som läggs till i kortet

Under checklistpunkten "Välkomstsamtal" visas en utökad panel med:

1. **Vem ringde + när** – auto-fylls med inloggad användare och tidsstämpel när första anteckningen sparas. Visas som "Samtal av [namn] · [datum/tid]". Kan justeras manuellt om någon annan ringde.

2. **Tips-ruta (kollapsbar samtalsguide)** – en liten "Visa tips"-knapp som fäller ut en lista med förslag på vad man bör ta upp, t.ex.:
   - Presentera projektledare och bygglag
   - Gå igenom preliminär tidsplan och startvecka
   - Förklara ROT-avdrag och fakturering
   - Informera om ställning, container och tillfartsvägar
   - Stäm av kontaktperson och anträffbarhet
   - Fråga om grannar är informerade
   - Bekräfta att kund är införstådd

3. **Kunds inställning** – tre snabbknappar: Positiv / Neutral / Orolig. Färgkodade. "Orolig" flaggar kortet visuellt så projektledaren ser det i översikten.

4. **Fritextanteckning** – textarea för vad som sas.

5. **Uppföljning krävs** – checkbox. Om ikryssad visas ett datumfält för när uppföljning ska ske. Om datum passerats utan att samtalet är avbockat → visuell varning på kortet.

### Tekniska detaljer

**`src/types/project.ts`** — utöka `ChecklistItem` med:
- `welcomeCallNotes?: string` (finns redan)
- `welcomeCallAt?: string` (finns redan)
- `welcomeCallBy?: string` (namn/e-post på den som ringde)
- `welcomeCallMood?: 'positive' | 'neutral' | 'worried'`
- `welcomeCallFollowUpRequired?: boolean`
- `welcomeCallFollowUpDate?: string` (ISO yyyy-mm-dd)

**`src/components/ProjectChecklist.tsx`** — ersätt nuvarande enkla textarea för `isWelcomeCall` med en komplett panel:
- Header med "Samtal av X · datum" (auto-fyll vid första save via `useAuth`)
- Kollapsbar tips-ruta (lokal `useState` för open/close, ChevronDown-ikon)
- Tre toggle-knappar för humör (använd `Badge`/`Button` med variant)
- Textarea (befintlig)
- Checkbox + Input type="date" för uppföljning

Alla ändringar sparas via `onChecklistUpdate` precis som idag — inga DB-schemaändringar krävs eftersom checklistan lagras som `jsonb` på `projects.checklist`.

**Ingen migration behövs** — nya fält är optional och befintliga projekt fortsätter fungera. Punkten "Välkomstsamtal" injiceras redan i `useSupabaseStorage` för äldre projekt.

### Bonus (om önskat senare)
Visning av "Orolig kund" eller "Uppföljning försenad" som risk-flagga i ProjectCard / Control Tower.