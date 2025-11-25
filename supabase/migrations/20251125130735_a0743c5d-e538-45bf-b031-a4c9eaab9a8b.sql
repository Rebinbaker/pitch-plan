-- Remove old test scaffolding data
-- Keep only the most recently created scaffolding (Släp AWA02G from 2025-11-25)
DELETE FROM public.scaffolding 
WHERE created_at < '2025-11-25 00:00:00';