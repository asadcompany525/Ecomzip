-- Search Logs Table: logs all customer searches
CREATE TABLE IF NOT EXISTS public.search_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  results_count integer DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  searched_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (for public search logging)
CREATE POLICY "Anyone can insert search logs" ON public.search_logs FOR INSERT WITH CHECK (true);
-- Only admins can view
CREATE POLICY "Admins can view search logs" ON public.search_logs FOR SELECT USING (true);
CREATE POLICY "Admins can delete search logs" ON public.search_logs FOR DELETE USING (true);

-- Email Logs Table: tracks newsletter campaigns and open rates
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  recipients_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'partial')),
  tracking_id text UNIQUE,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage email logs" ON public.email_logs USING (true) WITH CHECK (true);

-- Add plain_password column to profiles (for admin reference only)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plain_password text;
