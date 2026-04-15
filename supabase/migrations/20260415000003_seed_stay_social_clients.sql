-- Add platforms column to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS platforms jsonb DEFAULT '[]'::jsonb;

-- Insert 17 new clients (skip if name already exists)
INSERT INTO public.clients (name, niche, company, province, region, status)
SELECT v.name, v.niche, v.company, v.province, v.region, v.status
FROM (VALUES
  ('Alex Spicer'::text,        'Mortgage Brokers'::text, 'Premiere Mortgage Centre'::text, 'Nova Scotia'::text,  'Halifax'::text,   'active'::text),
  ('Jennifer MacLennan'::text, 'Mortgage Brokers',        'Premiere Mortgage Centre',        'Nova Scotia',        'Halifax',          'active'),
  ('Tracy MacIntyre'::text,    'Mortgage Brokers',        'Premiere Mortgage Centre',        'Nova Scotia',        'Halifax',          'active'),
  ('Wheeler Mortgage'::text,   'Mortgage Brokers',        'Premiere Mortgage Centre',        'Nova Scotia',        'Halifax',          'active'),
  ('Premiere Mortgage'::text,  'Mortgage Brokers',        'Premiere Mortgage Centre',        'Nova Scotia',        'Halifax',          'active'),
  ('Nikki Carew'::text,        'Mortgage Brokers',        'Premiere Mortgage Centre',        'Newfoundland',       'St. Johns',        'active'),
  ('Danny Bell'::text,         'Mortgage Brokers',        'Premiere Mortgage Centre',        'Ontario',            'GTA',              'active'),
  ('Kirk Eaton'::text,         'Mortgage Brokers',        'Eaton Mortgage Group',            'Ontario',            'GTA',              'active'),
  ('Kevin Byworth'::text,      'Mortgage Brokers',        'Premiere Mortgage Centre',        'Ontario',            'GTA',              'active'),
  ('Rico Johnston'::text,      'Mortgage Brokers',        'Good Fit Mortgages',              'Ontario',            'GTA',              'active'),
  ('Lendrific'::text,          'Mortgage Brokers',        'Premiere Mortgage Centre',        'Ontario',            'GTA',              'active'),
  ('Andrew Gad'::text,         'Mortgage Brokers',        'AG Mortgage Team',                'Ontario',            'GTA',              'active'),
  ('Danielle Gibson'::text,    'Mortgage Brokers',        'Premiere Mortgage Centre',        'Ontario',            'GTA',              'active'),
  ('Francine Casault'::text,   'Mortgage Brokers',        'Premiere Mortgage Centre',        'Ontario',            'GTA',              'active'),
  ('Lesley Tenaglia'::text,    'Mortgage Brokers',        'Fuse Mortgage',                   'Ontario',            'GTA',              'active'),
  ('Scott Pattinson'::text,    'Mortgage Brokers',        'Blue Rhino Mortgages',            'Ontario',            'GTA',              'active'),
  ('Karen B'::text,            'Mortgage Brokers',        'One Link Mortgage',               'Manitoba',           'Winnipeg',         'active')
) AS v(name, niche, company, province, region, status)
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.name = v.name);

-- Patch Craig Spicer's categorization (already exists, known id)
UPDATE public.clients SET
  niche    = 'Mortgage Brokers',
  company  = 'Craig Spicer Mortgages',
  province = 'Nova Scotia',
  region   = 'Halifax'
WHERE id = '8c86b2a1-a2ef-4965-b4f5-cce64b001c13';

-- Set platforms for every client
UPDATE public.clients SET platforms = '["facebook","instagram","linkedin"]'::jsonb          WHERE name = 'Alex Spicer';
UPDATE public.clients SET platforms = '["facebook","instagram","linkedin","google"]'::jsonb  WHERE id   = '8c86b2a1-a2ef-4965-b4f5-cce64b001c13'; -- Craig Spicer
UPDATE public.clients SET platforms = '["facebook","instagram"]'::jsonb                     WHERE name = 'Jennifer MacLennan';
UPDATE public.clients SET platforms = '["facebook","instagram","linkedin"]'::jsonb          WHERE name = 'Tracy MacIntyre';
UPDATE public.clients SET platforms = '["facebook","instagram"]'::jsonb                     WHERE name = 'Wheeler Mortgage';
UPDATE public.clients SET platforms = '["facebook","instagram"]'::jsonb                     WHERE name = 'Premiere Mortgage';
UPDATE public.clients SET platforms = '["facebook","instagram"]'::jsonb                     WHERE name = 'Nikki Carew';
UPDATE public.clients SET platforms = '["facebook","linkedin","google"]'::jsonb             WHERE name = 'Danny Bell';
UPDATE public.clients SET platforms = '["facebook","instagram"]'::jsonb                     WHERE name = 'Kirk Eaton';
UPDATE public.clients SET platforms = '["facebook","instagram","linkedin","google"]'::jsonb WHERE name = 'Kevin Byworth';
UPDATE public.clients SET platforms = '["facebook","instagram","linkedin","google"]'::jsonb WHERE name = 'Rico Johnston';
UPDATE public.clients SET platforms = '["facebook","instagram","google"]'::jsonb            WHERE name = 'Lendrific';
UPDATE public.clients SET platforms = '["facebook","instagram","google"]'::jsonb            WHERE name = 'Andrew Gad';
UPDATE public.clients SET platforms = '["facebook","instagram"]'::jsonb                     WHERE name = 'Danielle Gibson';
UPDATE public.clients SET platforms = '["facebook","instagram","google"]'::jsonb            WHERE name = 'Francine Casault';
UPDATE public.clients SET platforms = '["facebook","instagram","google"]'::jsonb            WHERE name = 'Lesley Tenaglia';
UPDATE public.clients SET platforms = '["instagram"]'::jsonb                                WHERE name = 'Scott Pattinson';
UPDATE public.clients SET platforms = '["instagram","facebook"]'::jsonb                     WHERE name = 'Karen B';
