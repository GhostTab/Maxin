-- Run in Supabase SQL Editor (after supabase-expiry-reminders-table.sql).
-- Adds tracking for "30 days before expiry" reminders; existing columns track "expiry day" reminders.

ALTER TABLE public.expiry_reminders_sent
  ADD COLUMN IF NOT EXISTS sms_30day_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_30day_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.expiry_reminders_sent.sms_30day_sent_at IS 'When the "30 days before expiry" SMS was sent.';
COMMENT ON COLUMN public.expiry_reminders_sent.email_30day_sent_at IS 'When the "30 days before expiry" email was sent.';
