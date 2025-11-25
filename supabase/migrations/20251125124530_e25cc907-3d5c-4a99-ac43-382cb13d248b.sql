-- Fix infinite recursion in organization_members RLS policies
-- The problem is that the policy queries the same table it's protecting

-- Drop the problematic policies
DROP POLICY IF EXISTS "Organization members can view members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organizations;

-- Create simpler, non-recursive policies for organization_members
-- Users can view memberships in organizations they belong to
CREATE POLICY "Users can view organization memberships"
ON public.organization_members FOR SELECT
USING (
  -- User can see memberships for organizations they are part of
  organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for organizations
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);