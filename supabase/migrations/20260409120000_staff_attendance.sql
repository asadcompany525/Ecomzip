-- Staff Attendance: track admin login/logout sessions
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at timestamptz DEFAULT now(),
  logout_at timestamptz,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE WHEN logout_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (logout_at - login_at)) / 60
    ELSE NULL END
  ) STORED
);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own attendance" ON public.staff_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON public.staff_attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attendance" ON public.staff_attendance FOR SELECT USING (true);
CREATE POLICY "Admins can delete attendance" ON public.staff_attendance FOR DELETE USING (true);

-- Custom roles: allow any text role in user_roles (already text, no constraint needed)
-- Just add an index for performance
CREATE INDEX IF NOT EXISTS idx_staff_attendance_user ON public.staff_attendance(user_id, login_at DESC);
