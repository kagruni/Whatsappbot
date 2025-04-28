-- Add optional fields to the leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS leads_title_idx ON public.leads(title);
CREATE INDEX IF NOT EXISTS leads_company_name_idx ON public.leads(company_name);
CREATE INDEX IF NOT EXISTS leads_city_idx ON public.leads(city);

COMMENT ON COLUMN public.leads.title IS 'Title or position of the lead';
COMMENT ON COLUMN public.leads.first_name IS 'First name of the lead';
COMMENT ON COLUMN public.leads.last_name IS 'Last name of the lead';
COMMENT ON COLUMN public.leads.city IS 'City where the lead is located';
COMMENT ON COLUMN public.leads.company_name IS 'Company or organization name of the lead'; 