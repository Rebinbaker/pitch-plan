

# Automatisk offert-PDF i projektets filer

## Problem
När CRM:et skapar ett projekt skickas ingen offert-PDF med. Filer lagras idag i localStorage, så edge function kan inte lägga till filer direkt.

## Lösning
Skapa en `project_files`-tabell i Supabase + lagra PDF:en i Supabase Storage. Uppdatera appen att ladda filer från Supabase istället för bara localStorage.

## Tekniska steg

### 1. Skapa `project_files`-tabell i Supabase
- Kolumner: `id`, `project_id` (FK till projects), `name`, `type`, `url`, `uploaded_by`, `description`, `tags`, `created_at`
- RLS-policies för att läsa/skriva baserat på organization via project

### 2. Skapa Storage-bucket `project-files`
- Publik bucket för att kunna visa/ladda ner filer
- RLS-policies för uppladdning/läsning

### 3. Uppdatera Edge Function `create-project-from-sale`
- Acceptera `quote_pdf_base64` och `quote_pdf_filename` i request body
- Dekoda base64 → spara PDF i `project-files` bucket
- Skapa en rad i `project_files`-tabellen kopplad till det nya projektet

### 4. Uppdatera `useSupabaseStorage.ts`
- Ladda filer från `project_files`-tabellen istället för localStorage
- `uploadFile` sparar till Supabase Storage + tabell
- `deleteFile` tar bort från Supabase

### 5. Prompt till Saleschamp CRM
- Instruktion att skicka med offert-PDF:en som base64 i anropet till edge function:
  ```json
  { "quote_pdf_base64": "<base64-data>", "quote_pdf_filename": "Offert_Adress.pdf" }
  ```

## Resultat
När en affär stängs i CRM:et skapas projektet med offert-PDF:en direkt tillgänglig under "Filer"-fliken.

