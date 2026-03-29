

# Två ändringar: Edge Function + prompt till CRM

## 1. Uppdatera Edge Function (detta projekt)

**Fil:** `supabase/functions/create-project-from-sale/index.ts`

- Lägg till `construction_start_week` och `estimated_work_days` i destructuring av request body (rad 54)
- Inkludera dessa i `.insert()` (rad 85-101): `construction_start_week`, `estimated_work_days`, samt beräkna `start_date` och `deadline` från dessa värden så att väder och planering fungerar

## 2. Prompt att klistra in i Saleschamp CRM

Efter implementationen ger jag dig en färdig prompt att ge till CRM-projektet som instruerar det att:
- Visa en dialog/modal med två fält när säljaren trycker "Stäng affär": **Byggstartvecka** (veckonummer-väljare) och **Ungefärlig arbetstid i dagar** (nummer-input)
- Skicka med `construction_start_week` (format "2025-W33") och `estimated_work_days` (heltal) i fetch-anropet till edge function

