

# Integration: CRM → Projekthantering (automatiskt projektkort vid stängd affär)

## Sammanfattning

Eftersom båda apparna är byggda på Lovable behöver vi avgöra om de delar samma Supabase-projekt. Oavsett vilket är den bästa lösningen att skapa ett **API-endpoint (Edge Function)** i detta projekt som CRM-appen kan anropa när en affär stängs.

## Steg 1: Kontrollera Supabase-koppling

Gå till ditt CRM-projekt på Lovable och kolla i filen `src/integrations/supabase/client.ts` — om `SUPABASE_URL` innehåller **mskdohetwbbkuexcolcl** delar ni samma databas. Berätta gärna detta så att jag kan välja optimal lösning.

## Steg 2a: Om SAMMA Supabase-projekt (enklaste vägen)

- Skapa en **database trigger** på CRM:ets sälj-tabell som automatiskt skapar en rad i `projects`-tabellen när en affär markeras som stängd
- Ingen extra kod behövs — allt sker i databasen

## Steg 2b: Om OLIKA Supabase-projekt (mest troligt)

### Skapa en Edge Function i detta projekt

**Fil:** `supabase/functions/create-project-from-sale/index.ts`

- Tar emot ett POST-anrop med kunddata (namn, adress, telefon, etc.)
- Validerar indata med Zod
- Autentiserar anropet via en delad API-nyckel (secret)
- Skapar ett nytt projekt i `projects`-tabellen med status `planned`
- Returnerar det skapade projektets ID

### Anropa från CRM-appen

I CRM-projektet lägger vi till ett `fetch()`-anrop som triggas när säljaren stänger en affär. Anropet skickar kundinformation till Edge Function-URL:en.

```text
CRM-app (Lovable)                    Projekthantering (detta projekt)
┌─────────────────┐                  ┌──────────────────────────┐
│ Säljare stänger │  POST /create-   │ Edge Function            │
│ affär           │ ──────────────── │ → Validerar              │
│                 │  project-from-   │ → Skapar projekt i DB    │
│                 │  sale            │ → Returnerar projekt-ID  │
└─────────────────┘                  └──────────────────────────┘
```

### Data som skickas från CRM

| Fält | Mappas till |
|------|------------|
| Kundnamn | `customer_name` |
| Adress | `address` |
| Telefon | `customer_phone` |
| Säljare | `responsible_seller` |
| Region | `region` |
| ROT-avdrag | `rot_status` |

### Säkerhet

- En delad API-nyckel (secret) lagras i båda projekten
- Edge Function validerar nyckeln innan den skapar något

## Vad jag behöver från dig

1. **Kolla om samma Supabase**: Öppna CRM-projektets `client.ts` och berätta om projekt-ID:t är `mskdohetwbbkuexcolcl`
2. **Vilka fält** skickas med när säljaren stänger en affär i CRM:et? (så att jag mappar rätt data)

