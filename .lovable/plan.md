## Resurser-flik – översikt

En ny flik **"Resurser"** i sidomenyn där projektledare kan hitta externa kontakter (transportörer, leverantörer som XL Bygg, elektriker, rörmokare, solcellsmontörer m.fl.) per län i Sverige. Tanken är att snabbt kunna filtrera fram rätt kontakt när ett behov dyker upp i ett projekt.

## Funktioner

**Huvudvy – Sverigeöversikt**
- Lista över Sveriges 21 län (kort/grid) med antal resurser per län
- Sökfält högst upp som söker tvärs över alla län (namn, företag, ort, typ)
- Knapp "Lägg till resurs"

**Län-vy (klickar på ett län)**
- Lista med alla resurser i det länet
- Filterchips för typ: Transportör, Byggvaruhus, Elektriker, Rörmokare, Solcellsmontör, Plåtslagare, Målare, Container, Ställning, Annat
- Sortering: namn, ort, senast använd
- Möjlighet att markera favorit/ofta använd

**Resurskort visar**
- Företagsnamn
- Typ (badge med färg per kategori)
- Kontaktperson
- Telefon (klickbar `tel:`)
- E-post (klickbar `mailto:`)
- Adress / ort
- Webbsida
- Anteckningar (t.ex. prisnivå, omdöme, vilka projekt de använts på)
- Snabbknappar: Ring, Maila, Kopiera info

**Lägg till / redigera-modal**
- Alla fält ovan
- Län (dropdown), typ (dropdown), möjlighet att lägga in flera typer per resurs (en transportör kan t.ex. täcka flera län – stöds via multi-val på län)

**Behörighet**
- Alla i organisationen kan se och lägga till
- Endast admin kan radera (samma mönster som projektborttagning)

## Vidareutveckling – förslag att överväga

1. **Koppling till projekt**: från ett projekt kunna klicka "Hitta resurs" som öppnar Resurser-fliken förfiltrerad på projektets län.
2. **Användningshistorik**: logga när en resurs "använts" på ett projekt, så man ser vilka som faktiskt anlitats och hur ofta.
3. **Betyg/omdöme** (1–5 stjärnor + kommentar) så teamet bygger upp gemensam erfarenhet.
4. **Bifoga filer** per resurs (offerter, avtal, prislistor) – återanvänder befintlig file storage.
5. **Import/export CSV** för att snabbt fylla på initialt.
6. **Mobilvy** – samma data men kort-baserad, med direkta ring/maila-knappar (viktigt ute på fält).

## Teknisk plan

**Databas (Supabase)** – ny tabell `resources`:
- `name`, `company`, `resource_types` (text[]), `counties` (text[]), `contact_person`, `phone`, `email`, `address`, `city`, `postal_code`, `website`, `notes`, `is_favorite`, `rating` (numeric, valfri), `times_used` (int, default 0)
- Standard `organization_id`, `user_id`, `created_at`, `updated_at`
- RLS: samma mönster som övriga tabeller (`is_organization_member`)
- Admin-only delete via `has_role`

**Konstanter**
- `src/data/swedishCounties.ts` – alla 21 län
- `src/data/resourceTypes.ts` – kategorier + färger/ikoner

**Komponenter**
- `src/components/resources/ResourcesView.tsx` – huvudvy med läns-grid + global sök
- `src/components/resources/CountyResourcesView.tsx` – län-vy med filter
- `src/components/resources/ResourceCard.tsx`
- `src/components/resources/AddEditResourceModal.tsx`
- `src/components/mobile/MobileResourcesView.tsx`

**Hook**
- `src/hooks/useResources.ts` – CRUD mot Supabase, optimistiska uppdateringar i samma stil som `useSupabaseStorage`

**Integration**
- Ny post i `AppNavSidebar.tsx` (ikon: `MapPin` eller `Contact`)
- Ny `TabsContent value="resources"` i `src/pages/Index.tsx`
- Mobil: ny post i `MobileHeader`/navigationen

## Frågor innan jag börjar

1. **Län eller region?** Vill du strikt 21 svenska län, eller era befintliga "regions" från `regions`-tabellen? (Län ger nationell täckning, regions matchar er nuvarande projektindelning.)
2. **Vilka typer ska finnas från start?** Mitt förslag: Transportör, Byggvaruhus, Elektriker, Rörmokare, Solcellsmontör, Plåtslagare, Målare, Container, Ställning, Annat. Lägga till/ta bort något?
3. **Ska en resurs kunna täcka flera län** (t.ex. en transportör som kör hela södra Sverige)? Mitt förslag: ja, via multi-val.
4. **Koppling till projekt** (förslag 1+2 ovan) – vill du ha det i v1 eller spara till senare?
