-- Enable realtime for scaffolding table
ALTER TABLE public.scaffolding REPLICA IDENTITY FULL;

-- Enable realtime for projects table
ALTER TABLE public.projects REPLICA IDENTITY FULL;