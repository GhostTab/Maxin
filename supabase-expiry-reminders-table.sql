-- Run in Supabase SQL Editor (Dashboard → SQL Editor).
-- Tracks which expiry reminders have been sent so we don't send the same reminder every day.
-- The Edge Function "send-expiry-reminders" reads this table and inserts after sending.

CREATE TABLE IF NOT EXISTS public.expiry_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,
  policy_identifier TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  sms_sent_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id, policy_identifier, expiry_date)
);

-- RLS: allow service role (Edge Function) full access; authenticated users can read for UI
ALTER TABLE public.expiry_reminders_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access expiry_reminders_sent" ON public.expiry_reminders_sent;
CREATE POLICY "Service role full access expiry_reminders_sent"
  ON public.expiry_reminders_sent
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read expiry_reminders_sent" ON public.expiry_reminders_sent;
CREATE POLICY "Authenticated read expiry_reminders_sent"
  ON public.expiry_reminders_sent
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.expiry_reminders_sent IS 'Tracks sent SMS/email reminders for policies expiring in 30 days. Used by send-expiry-reminders Edge Function.';
