-- Real preview images for the design styles (Stay Social's own tiles, never a client's).
-- Files live in the HUB at /design-styles/<key>.jpg. play marks the video styles.
update public.design_styles set preview = preview || jsonb_build_object('image', '/design-styles/' || key || '.jpg');
update public.design_styles set preview = preview || '{"play": true}'::jsonb where key in ('motion', 'pixar', 'puppet');
update public.design_styles set preview = preview - 'play' where key not in ('motion', 'pixar', 'puppet');
