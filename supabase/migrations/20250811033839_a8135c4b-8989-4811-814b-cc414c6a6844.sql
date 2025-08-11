-- Add some initial teams with sellers to restore functionality
-- This will only run if the user has no teams yet

-- First, insert some initial teams
INSERT INTO public.teams (user_id, name, type, availability_next_week, skills, sellers) 
SELECT auth.uid(), 'Stockholm Säljteam', 'Säljare', 'Tillgänglig', 
       '[]'::jsonb, 
       '[
         {
           "id": "seller-anna",
           "firstName": "Anna", 
           "lastName": "Lindberg",
           "region": "Stockholm"
         },
         {
           "id": "seller-johan",
           "firstName": "Johan",
           "lastName": "Svensson", 
           "region": "Stockholm"
         }
       ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE user_id = auth.uid() AND type = 'Säljare' AND name = 'Stockholm Säljteam');

INSERT INTO public.teams (user_id, name, type, availability_next_week, skills, sellers)
SELECT auth.uid(), 'Göteborg Säljteam', 'Säljare', 'Tillgänglig',
       '[]'::jsonb,
       '[
         {
           "id": "seller-marcus",
           "firstName": "Marcus",
           "lastName": "Holm",
           "region": "Västra Götaland"
         },
         {
           "id": "seller-lisa", 
           "firstName": "Lisa",
           "lastName": "Pettersson",
           "region": "Västra Götaland"
         }
       ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.teams WHERE user_id = auth.uid() AND type = 'Säljare' AND name = 'Göteborg Säljteam');