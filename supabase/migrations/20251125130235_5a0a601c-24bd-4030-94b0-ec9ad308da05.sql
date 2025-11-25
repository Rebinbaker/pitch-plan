-- Fix infinite recursion in organization_members policy
-- The previous policy was still recursive

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Create simple, non-recursive policies
-- Users can only see their own memberships
CREATE POLICY "Users can view their own memberships"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

-- Users can see organizations where they have a membership
CREATE POLICY "Users can view organizations where they are members"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members om
    WHERE om.organization_id = organizations.id 
    AND om.user_id = auth.uid()
  )
);