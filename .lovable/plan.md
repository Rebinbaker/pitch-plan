# Boende med avstånd & restid till objektet

## Mål
När man bokar boende ska man kunna fylla i boendets adress. Systemet räknar då ut **avstånd (km)** och **restid (min)** med bil från boendet till projektets objektadress, och visar det i boendekortet.

## Ändringar

### 1. Datamodell (`src/types/project.ts`)
Utöka `AccommodationBooking` med:
- `address?: string` — boendets adress
- `latitude?: number`, `longitude?: number` — geokodade koordinater (cache)
- `distanceKm?: number` — vägavstånd från objektet
- `travelMinutes?: number` — körtid från objektet

### 2. Ny util (`src/utils/travelDistance.ts`)
Funktion `getDrivingRoute(from, to)` som anropar OSRM:s publika demo-API  
`https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=false`  
och returnerar `{ distanceKm, travelMinutes }`. Vid fel → fallback till Haversine-avstånd och ~70 km/h.

### 3. Komponent (`src/components/AccommodationBookingItem.tsx`)
- Nytt fält **"Boendets adress"** i dialogen.
- Knapp **"Beräkna avstånd"** (körs också automatiskt vid Spara):
  1. Geokoda boendets adress via befintliga `geocodeAddress` (`src/utils/geocoding.ts`).
  2. Geokoda projektets `address` om `project.latitude/longitude` saknas.
  3. Anropa `getDrivingRoute` och visa resultatet i dialogen innan man sparar.
- Visa i sparade boendekortet en extra rad:  
  `🚗 12,4 km · ~18 min från objektet`  
  (med en liten varning om värdet bygger på fågelvägen som fallback).

### 4. Inget backend-jobb krävs
Allt sker klient-sidan; `accommodation_booking` på `projects`-tabellen är redan en `jsonb` så de nya fälten ryms direkt.

## Teknisk notering
OSRM-demoservern är gratis men ingen produktions-SLA. Om det blir problem kan vi senare byta till Google Maps Distance Matrix via befintlig connector — då räcker det att byta implementation i `travelDistance.ts`.
