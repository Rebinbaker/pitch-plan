-- Step 1: Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Step 2: Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Step 3: Create default organization and add all existing users
INSERT INTO public.organizations (name) 
VALUES ('Lokala Hantverkarna') 
RETURNING id;

-- Add all existing users to the default organization
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  (SELECT id FROM public.organizations LIMIT 1),
  id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.users.id AND role = 'admin') 
    THEN 'admin'
    ELSE 'member'
  END
FROM auth.users;

-- Step 4: Add organization_id to existing tables
ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.scaffolding ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.teams ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.files ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.notifications ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.time_entries ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.time_reports ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.work_sessions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.team_schedules ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.leave_requests ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Step 5: Migrate existing data to default organization
UPDATE public.projects 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.scaffolding 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.teams 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.files 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.notifications 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.time_entries 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.time_reports 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.work_sessions 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.team_schedules 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.leave_requests 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

-- Step 6: Make organization_id NOT NULL after migration
ALTER TABLE public.projects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.scaffolding ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.teams ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.files ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.time_entries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.time_reports ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.work_sessions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.team_schedules ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.leave_requests ALTER COLUMN organization_id SET NOT NULL;

-- Step 7: Create helper function to check organization membership
CREATE OR REPLACE FUNCTION public.is_organization_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Step 8: Update RLS policies for projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

CREATE POLICY "Organization members can view projects"
ON public.projects FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create projects"
ON public.projects FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update projects"
ON public.projects FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete projects"
ON public.projects FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 9: Update RLS policies for scaffolding
DROP POLICY IF EXISTS "Users can view their own scaffolding" ON public.scaffolding;
DROP POLICY IF EXISTS "Users can create their own scaffolding" ON public.scaffolding;
DROP POLICY IF EXISTS "Users can update their own scaffolding" ON public.scaffolding;
DROP POLICY IF EXISTS "Users can delete their own scaffolding" ON public.scaffolding;

CREATE POLICY "Organization members can view scaffolding"
ON public.scaffolding FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create scaffolding"
ON public.scaffolding FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update scaffolding"
ON public.scaffolding FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete scaffolding"
ON public.scaffolding FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 10: Update RLS policies for teams
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON public.teams;

CREATE POLICY "Organization members can view teams"
ON public.teams FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create teams"
ON public.teams FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update teams"
ON public.teams FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete teams"
ON public.teams FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 11: Update RLS policies for files
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can create their own files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;

CREATE POLICY "Organization members can view files"
ON public.files FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create files"
ON public.files FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update files"
ON public.files FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete files"
ON public.files FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 12: Update RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Organization members can view notifications"
ON public.notifications FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update notifications"
ON public.notifications FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete notifications"
ON public.notifications FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 13: Update RLS policies for time_entries
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;

CREATE POLICY "Organization members can view time entries"
ON public.time_entries FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create time entries"
ON public.time_entries FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update time entries"
ON public.time_entries FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete time entries"
ON public.time_entries FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 14: Update RLS policies for time_reports
DROP POLICY IF EXISTS "Users can view their own time reports" ON public.time_reports;
DROP POLICY IF EXISTS "Users can create their own time reports" ON public.time_reports;
DROP POLICY IF EXISTS "Users can update their own time reports" ON public.time_reports;
DROP POLICY IF EXISTS "Users can delete their own time reports" ON public.time_reports;

CREATE POLICY "Organization members can view time reports"
ON public.time_reports FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create time reports"
ON public.time_reports FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update time reports"
ON public.time_reports FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete time reports"
ON public.time_reports FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 15: Update RLS policies for work_sessions
DROP POLICY IF EXISTS "Users can view their own work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Users can create their own work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Users can update their own work sessions" ON public.work_sessions;
DROP POLICY IF EXISTS "Users can delete their own work sessions" ON public.work_sessions;

CREATE POLICY "Organization members can view work sessions"
ON public.work_sessions FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create work sessions"
ON public.work_sessions FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update work sessions"
ON public.work_sessions FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete work sessions"
ON public.work_sessions FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 16: Update RLS policies for team_schedules
DROP POLICY IF EXISTS "Users can view schedules for their teams" ON public.team_schedules;
DROP POLICY IF EXISTS "Users can create schedules for their teams" ON public.team_schedules;
DROP POLICY IF EXISTS "Users can update schedules for their teams" ON public.team_schedules;
DROP POLICY IF EXISTS "Users can delete schedules for their teams" ON public.team_schedules;

CREATE POLICY "Organization members can view team schedules"
ON public.team_schedules FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create team schedules"
ON public.team_schedules FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update team schedules"
ON public.team_schedules FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete team schedules"
ON public.team_schedules FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 17: Update RLS policies for leave_requests
DROP POLICY IF EXISTS "Users can view leave requests for their teams" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create leave requests for their teams" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can update leave requests for their teams" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can delete leave requests for their teams" ON public.leave_requests;

CREATE POLICY "Organization members can view leave requests"
ON public.leave_requests FOR SELECT
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can create leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can update leave requests"
ON public.leave_requests FOR UPDATE
USING (public.is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Organization members can delete leave requests"
ON public.leave_requests FOR DELETE
USING (public.is_organization_member(auth.uid(), organization_id));

-- Step 18: RLS policies for organizations table
CREATE POLICY "Organization members can view their organization"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = organizations.id
      AND user_id = auth.uid()
  )
);

-- Step 19: RLS policies for organization_members table
CREATE POLICY "Organization members can view members"
ON public.organization_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
  )
);

-- Step 20: Trigger to auto-add new users to default organization
CREATE OR REPLACE FUNCTION public.add_user_to_default_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (
    (SELECT id FROM public.organizations ORDER BY created_at ASC LIMIT 1),
    NEW.id,
    'member'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_add_to_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.add_user_to_default_organization();

-- Step 21: Add trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();