# Boka boende — checklist + karta

Lägger till "Boka boende" som ny checklist-punkt direkt efter "Schedule construction team". Användaren anger boendets namn, **incheckningsdatum** och **antal nätter**. Utcheckningsdatum räknas fram automatiskt. På kartan visas hur många dagar som är kvar till utcheckning.

## Användarflöde

1. I projektets checklista finns en ny rad: **"Boka boende"** (efter "Schedule construction team").
2. Klick på checkbox eller "Redigera" öppnar en dialog med:
   - Boendets namn (text)
   - Incheckningsdatum (datepicker, default = idag)
   - Antal nätter (siffra, min 1, default 1)
   - Beräknad utcheckning visas live under fälten (incheckning + nätter)
3. Vid spara: punkten markeras som klar, bokningen sparas på projektet, en aktivitetslogg-rad skapas.
4. Under raden visas en sammanfattning: *"Hotell X · 3 nätter · checkar ut tors 14 maj"* med "Redigera"-knapp.
5. På kartans projekt-popup visas en ny rad om bokning finns: namn + "X dagar kvar till utcheckning" (röd ≤1 dag, gul ≤3 dagar, annars neutral).

## Datamodell

`src/types/project.ts`:
- Lägg till `accommodationBooking?: { name: string; checkInDate: string; nights: number; bookedAt?: string }` på `Project`.
- Lägg till `accommodationConfirmed?: boolean` på `ChecklistItem`.
- Lägg till `{ label: 'Boka boende', completed: false, weight: 2 }` i `defaultChecklist` direkt efter `Schedule construction team`.
- Hjälpfunktion `getCheckOutDate(booking)` = `checkInDate + nights dagar`.

## Migration

Ny kolumn på `projects`-tabellen:
```
accommodation_booking jsonb
```
(En enkel jsonb räcker — ingen separat tabell behövs eftersom det är 1:1 mot projekt och inga frågor körs mot fälten.)

## Filer som ändras

- `supabase/migrations/...` (ny) — lägger till `accommodation_booking` kolumn.
- `src/types/project.ts` — typer + defaultChecklist + helper.
- `src/components/ProjectChecklist.tsx` — specialhantering av "Boka boende": dialog, sparlogik, sammanfattningsrad.
- `src/components/ProjectMapView.tsx` — visa "X dagar kvar till utcheckning" i popup när bokning finns.
- `src/components/ProjectDashboard.tsx` (eller där DB ↔ frontend mappas) — läs/skriv `accommodation_booking`.
- `src/components/mobile/MobileProjectDetailModal.tsx` — säkerställ att samma checklist-rad fungerar på mobil.

## Antaganden

- Ett boende per projekt.
- Incheckningsdatum default = idag, antal nätter default = 1.
- Inga separata notiser nära utcheckning (bara visuell färgmarkering på kartan).
