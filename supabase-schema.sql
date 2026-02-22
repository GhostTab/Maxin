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

-- RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can do everything on submissions" ON public.submissions;
CREATE POLICY "Authenticated users can do everything on submissions"
  ON public.submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Storage bucket for uploads (KYC, Policy copies). Create in Dashboard → Storage → New bucket if this fails.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('uploads', 'uploads', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload and read
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
CREATE POLICY "Authenticated upload"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Authenticated read" ON storage.objects;
CREATE POLICY "Authenticated read"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'uploads');
