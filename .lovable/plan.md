

# CRM / Kundregister - Implementationsplan

## Vad vi bygger
Ett kundregister (CRM) med kontaktinformation, kommunikationslogg och koppling till projekt. Kundtjänst ska kunna logga samtal, se kundhistorik och snabbt hitta information.

## Databasändringar

### Ny tabell: `customers`
- id, organization_id, user_id (skapare)
- name, email, phone, address, city, postal_code
- notes (fritext)
- created_at, updated_at
- RLS: organization_members kan CRUD

### Ny tabell: `customer_interactions`
- id, customer_id (FK), organization_id, user_id (vem som loggade)
- interaction_type: 'phone_call' | 'email' | 'meeting' | 'note' | 'complaint'
- subject, description
- related_project_id (optional FK till projects)
- created_at
- RLS: organization_members kan CRUD

### Ändring i `projects`
- Ny kolumn: `customer_id` (uuid, nullable, FK till customers)
- Kopplar projekt till kunder så man kan se alla projekt per kund

## Nya komponenter

### `src/components/CustomersView.tsx`
Huvudvy med:
- Sökbar kundlista (namn, telefon, e-post)
- Lägg till ny kund-knapp
- Klick på kund öppnar detaljvy

### `src/components/CustomerDetailModal.tsx`
- Kontaktinformation (redigerbar)
- Lista på kopplade projekt (klickbara)
- Kommunikationslogg med möjlighet att lägga till nya poster
- Varje loggpost visar: datum, typ (samtal/mail/möte), vem som loggade, beskrivning

### `src/components/AddCustomerModal.tsx`
- Formulär: namn, e-post, telefon, adress, stad, postnummer, anteckningar

### `src/components/CustomerInteractionForm.tsx`
- Typ-väljare (Telefonsamtal, E-post, Möte, Anteckning, Klagomål)
- Ämne, beskrivning
- Valfri projektkoppling (dropdown med befintliga projekt)

## Ändringar i befintliga filer

### `src/pages/Index.tsx`
- Ny flik "Kunder" i TabsList (desktop + mobil)
- Import och rendering av CustomersView

### `src/hooks/useSupabaseStorage.ts`
- Lägg till CRUD-funktioner för customers och customer_interactions

## Flöde för kundtjänst
1. Kund ringer in → kundtjänst söker på namn/telefon
2. Hittar kunden → ser alla projekt och tidigare kontakter
3. Loggar samtalet med ämne och beskrivning
4. Kan koppla samtalet till specifikt projekt om relevant

