-- Optional: run this in Supabase SQL Editor to see "all data" as readable tables.
-- After running, you'll see "Current clients" and "Current policies" in Table Editor
-- (they show the data from your latest submission, not the raw JSON log).

-- Drop views if they exist (so we can re-run this script)
DROP VIEW IF EXISTS public.current_policies;
DROP VIEW IF EXISTS public.current_clients;

-- View: all clients from the current submission (read-only table you can browse in Supabase)
CREATE VIEW public.current_clients AS
SELECT
  row_number() OVER () AS row_num,
  elem->>'col_1'  AS full_name,
  elem->>'col_2'  AS first_name,
  elem->>'col_3'  AS middle_name,
  elem->>'col_4'  AS last_name,
  elem->>'col_5'  AS suffix,
  elem->>'col_6'  AS tin,
  elem->>'col_7'  AS email,
  elem->>'col_8'  AS contact_no,
  elem->>'col_9'  AS birthday,
  elem->>'col_10' AS birth_place,
  elem->>'col_11' AS nationality,
  elem->>'col_12' AS country,
  elem->>'col_13' AS city,
  elem->>'col_14' AS zip_code,
  elem->>'col_15' AS full_address,
  elem->>'col_16' AS upload_kyc,
  elem->>'col_17' AS status
FROM public.submissions s,
     jsonb_array_elements(COALESCE(s.data->'client_info', '[]'::jsonb)) AS elem
WHERE s.id = (
  SELECT id FROM public.submissions
  ORDER BY submitted_at DESC
  LIMIT 1
);

-- View: all policies from the current submission (read-only table you can browse in Supabase)
CREATE VIEW public.current_policies AS
SELECT
  row_number() OVER () AS row_num,
  elem->>'col_1'  AS full_name,
  elem->>'col_2'  AS insured_name,
  elem->>'col_3'  AS policy_no,
  elem->>'col_4'  AS provider,
  elem->>'col_5'  AS line,
  elem->>'col_6'  AS issued_date,
  elem->>'col_7'  AS inception_date,
  elem->>'col_8'  AS expiry_date,
  elem->>'col_9'  AS status,
  elem->>'col_10' AS sum_insured,
  elem->>'col_11' AS gross_premium,
  elem->>'col_12' AS basic_premium,
  elem->>'col_13' AS commission,
  elem->>'col_14' AS withholding_tax,
  elem->>'col_15' AS vat,
  elem->>'col_16' AS discount,
  elem->>'col_17' AS net_commission,
  elem->>'col_18' AS upload_policy_copy
FROM public.submissions s,
     jsonb_array_elements(COALESCE(s.data->'policy_info', '[]'::jsonb)) AS elem
WHERE s.id = (
  SELECT id FROM public.submissions
  ORDER BY submitted_at DESC
  LIMIT 1
);

-- Best practice: only logged-in users can read. Do not grant to anon or public.
REVOKE ALL ON public.current_clients FROM anon, public;
REVOKE ALL ON public.current_policies FROM anon, public;
GRANT SELECT ON public.current_clients TO authenticated;
GRANT SELECT ON public.current_policies TO authenticated;
