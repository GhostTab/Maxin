-- RLS: Admin has full access; all authenticated users (including clients) can READ submissions.
-- Clients see only their own data in the app (filtered by email); DB allows read so they can load the current submission.
-- Run in Supabase: Dashboard → SQL Editor → New query → paste and run.

-- Submissions: replace single policy with admin-all + authenticated-read
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admin can access submissions" ON public.submissions;
DROP POLICY IF EXISTS "Admin full access submissions" ON public.submissions;
DROP POLICY IF EXISTS "Authenticated read submissions" ON public.submissions;

CREATE POLICY "Admin full access submissions"
  ON public.submissions
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Authenticated read submissions"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Storage: keep admin-only upload/read (clients don't need storage access for this app)
-- No change needed if you already have "Only admin upload" and "Only admin read".
