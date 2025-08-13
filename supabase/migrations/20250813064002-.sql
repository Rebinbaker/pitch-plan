-- Clean up orphaned trailer assignments
-- First, let's see what we have in the scaffolding and projects tables
DO $$
DECLARE
    trailer_record RECORD;
    project_record RECORD;
BEGIN
    -- Log current state
    RAISE NOTICE 'Current scaffolding records:';
    FOR trailer_record IN SELECT * FROM scaffolding LOOP
        RAISE NOTICE 'Scaffolding: % - Status: %', trailer_record.name, trailer_record.status;
    END LOOP;
    
    RAISE NOTICE 'Projects with assigned trailers:';
    FOR project_record IN SELECT name, assigned_trailer FROM projects WHERE assigned_trailer IS NOT NULL LOOP
        RAISE NOTICE 'Project: % - Assigned trailer: %', project_record.name, project_record.assigned_trailer;
    END LOOP;
END $$;

-- Reset all scaffolding to available status
UPDATE scaffolding SET status = 'Tillgänglig';

-- Clear trailer assignments from projects where the trailer doesn't exist in scaffolding table
UPDATE projects 
SET assigned_trailer = NULL 
WHERE assigned_trailer IS NOT NULL 
AND assigned_trailer NOT IN (SELECT name FROM scaffolding WHERE name IS NOT NULL);

-- Create a function to automatically manage trailer availability
CREATE OR REPLACE FUNCTION public.manage_trailer_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If a trailer is being assigned to a project
    IF NEW.assigned_trailer IS NOT NULL AND NEW.assigned_trailer != OLD.assigned_trailer THEN
        -- Mark the trailer as unavailable
        UPDATE scaffolding 
        SET status = 'Ej tillgänglig' 
        WHERE name = NEW.assigned_trailer;
        
        -- If there was a previously assigned trailer, make it available
        IF OLD.assigned_trailer IS NOT NULL AND OLD.assigned_trailer != NEW.assigned_trailer THEN
            UPDATE scaffolding 
            SET status = 'Tillgänglig' 
            WHERE name = OLD.assigned_trailer;
        END IF;
    -- If a trailer assignment is being removed
    ELSIF NEW.assigned_trailer IS NULL AND OLD.assigned_trailer IS NOT NULL THEN
        -- Make the previously assigned trailer available
        UPDATE scaffolding 
        SET status = 'Tillgänglig' 
        WHERE name = OLD.assigned_trailer;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project updates
DROP TRIGGER IF EXISTS trigger_manage_trailer_assignment ON projects;
CREATE TRIGGER trigger_manage_trailer_assignment
    AFTER UPDATE OF assigned_trailer ON projects
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_trailer_assignment();

-- Create a function to clean up trailer assignments when projects are deleted
CREATE OR REPLACE FUNCTION public.cleanup_trailer_on_project_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- If the deleted project had an assigned trailer, make it available
    IF OLD.assigned_trailer IS NOT NULL THEN
        UPDATE scaffolding 
        SET status = 'Tillgänglig' 
        WHERE name = OLD.assigned_trailer;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project deletions
DROP TRIGGER IF EXISTS trigger_cleanup_trailer_on_delete ON projects;
CREATE TRIGGER trigger_cleanup_trailer_on_delete
    AFTER DELETE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_trailer_on_project_delete();

-- Function to sync trailer status based on current project assignments
CREATE OR REPLACE FUNCTION public.sync_trailer_status()
RETURNS void AS $$
BEGIN
    -- Mark all trailers as available first
    UPDATE scaffolding SET status = 'Tillgänglig';
    
    -- Mark trailers as unavailable if they are assigned to active projects
    UPDATE scaffolding 
    SET status = 'Ej tillgänglig' 
    WHERE name IN (
        SELECT DISTINCT assigned_trailer 
        FROM projects 
        WHERE assigned_trailer IS NOT NULL
        AND status != 'completed'
        AND status != 'cancelled'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to fix current state
SELECT public.sync_trailer_status();