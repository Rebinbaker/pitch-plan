-- Create team schedules table for managing team member schedules and availability
CREATE TABLE public.team_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_member_id TEXT NOT NULL, -- References TeamMember.id from teams.members jsonb
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'on_leave', 'sick', 'vacation', 'busy'
  hours_planned NUMERIC DEFAULT 8,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, team_member_id, date)
);

-- Create leave requests table for managing leave approvals
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_member_id TEXT NOT NULL, -- References TeamMember.id from teams.members jsonb
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'vacation', -- 'vacation', 'sick', 'personal', 'parental'
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add leader column to teams table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'leader') THEN
    ALTER TABLE public.teams ADD COLUMN leader TEXT;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.team_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_schedules
CREATE POLICY "Users can view schedules for their teams" 
ON public.team_schedules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create schedules for their teams" 
ON public.team_schedules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update schedules for their teams" 
ON public.team_schedules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete schedules for their teams" 
ON public.team_schedules 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for leave_requests
CREATE POLICY "Users can view leave requests for their teams" 
ON public.leave_requests 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = requested_by);

CREATE POLICY "Users can create leave requests for their teams" 
ON public.leave_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() = requested_by);

CREATE POLICY "Users can update leave requests for their teams" 
ON public.leave_requests 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = requested_by);

CREATE POLICY "Users can delete leave requests for their teams" 
ON public.leave_requests 
FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = requested_by);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_team_schedules_updated_at
BEFORE UPDATE ON public.team_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_team_schedules_team_date ON public.team_schedules(team_id, date);
CREATE INDEX idx_team_schedules_member_date ON public.team_schedules(team_member_id, date);
CREATE INDEX idx_leave_requests_team_dates ON public.leave_requests(team_id, start_date, end_date);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);