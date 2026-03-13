-- Run this in Supabase: Dashboard → SQL Editor → New query → paste and run.
-- Use this if you get "new row violates row-level security policy" when adding/editing/deleting clients or policies.
-- This allows any logged-in user to read/write submissions and uploads (no admin role required).
-- For a single-user app this is fine. To restrict to admins later, set app_metadata.role = 'admin' in Auth and switch back to admin-only policies.

-- Submissions: allow all authenticated users
DROP POLICY IF EXISTS "Only admin can access submissions" ON public.submissions;
CREATE POLICY "Authenticated users can manage submissions"
  ON public.submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Storage (uploads bucket): allow authenticated users to upload and read
DROP POLICY IF EXISTS "Only admin upload" ON storage.objects;
DROP POLICY IF EXISTS "Only admin read" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Authenticated users can read uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads');
