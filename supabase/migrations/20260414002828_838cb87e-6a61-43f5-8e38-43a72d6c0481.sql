
-- Personalization settings table
CREATE TABLE public.personalization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  response_style TEXT NOT NULL DEFAULT 'professional',
  tone TEXT NOT NULL DEFAULT 'balanced',
  detail_level TEXT NOT NULL DEFAULT 'moderate',
  domain TEXT DEFAULT '',
  preferred_language TEXT DEFAULT 'English',
  time_zone TEXT DEFAULT 'UTC',
  response_format TEXT NOT NULL DEFAULT 'text',
  include_code_examples BOOLEAN NOT NULL DEFAULT true,
  include_visualizations BOOLEAN NOT NULL DEFAULT true,
  summary_mode TEXT NOT NULL DEFAULT 'when_complex',
  show_thinking_steps TEXT NOT NULL DEFAULT 'always',
  tool_transparency BOOLEAN NOT NULL DEFAULT true,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  enable_email_generation BOOLEAN NOT NULL DEFAULT true,
  enable_sql_queries BOOLEAN NOT NULL DEFAULT true,
  enable_csv_analysis BOOLEAN NOT NULL DEFAULT true,
  enable_pdf_search BOOLEAN NOT NULL DEFAULT true,
  custom_instructions TEXT DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'light',
  font_size TEXT NOT NULL DEFAULT 'normal',
  message_density TEXT NOT NULL DEFAULT 'normal',
  sidebar_position TEXT NOT NULL DEFAULT 'left',
  user_name TEXT DEFAULT '',
  user_role TEXT DEFAULT '',
  user_department TEXT DEFAULT '',
  user_goals TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personalization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own personalization" ON public.personalization_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_personalization_updated_at
  BEFORE UPDATE ON public.personalization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User files table
CREATE TABLE public.user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'txt',
  file_size INTEGER NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_hash TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own files" ON public.user_files
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  thinking_steps JSONB DEFAULT '[]',
  tools_used TEXT[] DEFAULT '{}',
  token_count INTEGER DEFAULT 0,
  files_referenced UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own messages" ON public.chat_messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- AI thinking steps table
CREATE TABLE public.ai_thinking_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL DEFAULT 1,
  step_type TEXT NOT NULL DEFAULT 'reasoning',
  content TEXT NOT NULL DEFAULT '',
  tool_name TEXT DEFAULT '',
  tool_status TEXT NOT NULL DEFAULT 'pending',
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_thinking_steps ENABLE ROW LEVEL SECURITY;

-- Policy based on message ownership
CREATE POLICY "Users read own thinking steps" ON public.ai_thinking_steps
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_messages WHERE chat_messages.id = ai_thinking_steps.message_id AND chat_messages.user_id = auth.uid()));

CREATE POLICY "Users insert own thinking steps" ON public.ai_thinking_steps
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_messages WHERE chat_messages.id = ai_thinking_steps.message_id AND chat_messages.user_id = auth.uid()));

-- Storage bucket for user files
INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);
