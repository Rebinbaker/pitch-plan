-- Remove older duplicate for 'Släp AWA02G', keep the newest
DELETE FROM public.scaffolding
WHERE name = 'Släp AWA02G'
  AND id <> (
    SELECT id FROM public.scaffolding
    WHERE name = 'Släp AWA02G'
    ORDER BY created_at DESC
    LIMIT 1
  );