-- Create chat_history table for persisting AI manager and chat interactions
CREATE TABLE IF NOT EXISTS public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type text NOT NULL DEFAULT 'ai_manager',
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Karachi'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chat history" ON public.chat_history
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own chat history" ON public.chat_history
  FOR SELECT TO public USING (user_id = auth.uid());

CREATE INDEX idx_chat_history_session_type ON public.chat_history(session_type);
CREATE INDEX idx_chat_history_created_at ON public.chat_history(created_at DESC);
