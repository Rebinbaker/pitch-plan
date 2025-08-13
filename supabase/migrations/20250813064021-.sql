-- Fix security warnings by setting proper search paths for functions
CREATE OR REPLACE FUNCTION public.manage_trailer_assignment()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- If a trailer is being assigned to a project
    IF NEW.assigned_trailer IS NOT NULL AND (OLD.assigned_trailer IS NULL OR NEW.assigned_trailer != OLD.assigned_trailer) THEN
        -- Mark the trailer as unavailable
        UPDATE public.scaffolding 
        SET status = 'Ej tillgänglig' 
        WHERE name = NEW.assigned_trailer;
        
        -- If there was a previously assigned trailer, make it available
        IF OLD.assigned_trailer IS NOT NULL AND OLD.assigned_trailer != NEW.assigned_trailer THEN
            UPDATE public.scaffolding 
            SET status = 'Tillgänglig' 
            WHERE name = OLD.assigned_trailer;
        END IF;
    -- If a trailer assignment is being removed
    ELSIF NEW.assigned_trailer IS NULL AND OLD.assigned_trailer IS NOT NULL THEN
        -- Make the previously assigned trailer available
        UPDATE public.scaffolding 
        SET status = 'Tillgänglig' 
        WHERE name = OLD.assigned_trailer;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update cleanup function with proper search path
CREATE OR REPLACE FUNCTION public.cleanup_trailer_on_project_delete()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- If the deleted project had an assigned trailer, make it available
    IF OLD.assigned_trailer IS NOT NULL THEN
        UPDATE public.scaffolding 
        SET status = 'Tillgänglig' 
        WHERE name = OLD.assigned_trailer;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update sync function with proper search path
CREATE OR REPLACE FUNCTION public.sync_trailer_status()
RETURNS void 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Mark all trailers as available first
    UPDATE public.scaffolding SET status = 'Tillgänglig';
    
    -- Mark trailers as unavailable if they are assigned to active projects
    UPDATE public.scaffolding 
    SET status = 'Ej tillgänglig' 
    WHERE name IN (
        SELECT DISTINCT assigned_trailer 
        FROM public.projects 
        WHERE assigned_trailer IS NOT NULL
        AND status != 'completed'
        AND status != 'cancelled'
    );
END;
$$ LANGUAGE plpgsql;