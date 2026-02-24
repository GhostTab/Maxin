-- Run this in your Supabase project: Dashboard → SQL Editor → New query → paste and run.
-- Required: app needs the submissions table. If you see 400 errors in the browser console, run this script.
-- Single-file mode: one "current" document (is_current = true), plus up to 5 previous versions for revert.

CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted',
  data JSONB NOT NULL DEFAULT '{}',
  is_current BOOLEAN NOT NULL DEFAULT false,
  message TEXT
);

-- ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false;
-- ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS message TEXT;
-- UPDATE public.submissions SET is_current = false;
-- UPDATE public.submissions SET is_current = true WHERE id = (SELECT id FROM public.submissions ORDER BY submitted_at DESC LIMIT 1);

-- RLS: only admin users can access data (prevents non-admin authenticated users and all anon)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can do everything on submissions" ON public.submissions;
DROP POLICY IF EXISTS "Only admin can access submissions" ON public.submissions;
CREATE POLICY "Only admin can access submissions"
  ON public.submissions
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Storage bucket for uploads (KYC, Policy copies). Only admin can upload/list; bucket stays public so file links work.
-- For large files: In Dashboard → Storage → Configuration, increase "File size limit" per bucket if needed (e.g. 100MB+).
-- Supabase standard uploads support up to 5GB; resumable (TUS) uploads support up to 50GB for very large files.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('uploads', 'uploads', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Only admin upload" ON storage.objects;
DROP POLICY IF EXISTS "Only admin read" ON storage.objects;
CREATE POLICY "Only admin upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Only admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Optional: to see all client/policy data as readable tables in the dashboard, run supabase-views.sql in SQL Editor.
