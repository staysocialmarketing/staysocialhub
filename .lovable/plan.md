

# Expanded Brand Twin Framework — Full AI Interview Intelligence System

## What This Changes

The current Brand Twin has 5 JSONB columns (`brand_basics`, `brand_voice`, `audience`, `offers`, `content_rules`) plus `source_material`. The ChatGPT strategist framework defines **15 sections** covering visual design, colour, typography, composition, website/social direction, formatting rules, seasonal cues, CTA style, avoid lists, locked rules, and AI prompt notes — none of which exist today.

This plan expands the Brand Twin schema, the AI interview flow, the extraction logic, and the UI across all surfaces so everything connects end-to-end.

## Database Changes

### 1. Add 10 new JSONB columns to `brand_twin` table

```sql
ALTER TABLE brand_twin
  ADD COLUMN visual_design_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN colour_direction_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN typography_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN text_on_design_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN composition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN website_direction_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN social_direction_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN seasonal_local_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN cta_style_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN avoid_list_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN locked_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN prompt_notes_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN formatting_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN subject_themes_json jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Also rename existing sections conceptually in code to align:
- `brand_basics_json` → stays (maps to **Brand Identity** + business info)
- `brand_voice_json` → stays (voice + messaging)
- `audience_json` → stays (maps to **Audience Perception Goals** + demographics)
- `offers_json` → stays
- `content_rules_json` → stays (platform/content type rules)

No existing columns are removed — only additions.

### 2. Add new interview template: `visual_brand`

A new interview template specifically for the visual/design deep-dive (Phases 2-6 from the framework: visual style, colour, typography, composition, text-on-design, avoid list).

## AI Interview Changes

### 3. New interview template prompt — `supabase/functions/ai-interview/index.ts`

Add `visual_brand` template covering the 6 interview phases from the framework:

- **Phase 1** (Brand Feel): Already handled by `full_onboarding` and `brand_voice`
- **Phase 2** (Visual Style): Bold vs lifestyle, premium vs casual, minimal vs layered
- **Phase 3** (Colour Behaviour): Plain-language colour descriptions, dominant/accent/avoid
- **Phase 4** (Web + Social Application): Consistency across web/social, visual priorities
- **Phase 5** (Content Rules): Text density, headline style, CTA directness
- **Phase 6** (Negative Direction): Off-brand visuals, colours, tones, styles to avoid

The template follows existing pacing rules (one question at a time).

### 4. Expanded extraction tools — `supabase/functions/ai-interview/index.ts`

Add new extraction sections for all 14 new fields. The `visual_brand` template uses a dedicated extractor that maps to:
- `visual_design_json`: design_style, social_visual_style, website_visual_style, photo_realism, brand_polish_level
- `colour_direction_json`: primary_colour_mood, accent_colour_mood, dominant, supporting (array), avoid (array), descriptions
- `typography_json`: font_feel, headline_style, supporting_text_style, text_density, caps_preference, bold_vs_subtle
- `text_on_design_json`: headline_only_vs_multiline, educational_on_graphics, subtitles_ok, caption_carries_message
- `composition_json`: focal_point, single_vs_split_scene, text_room, subject_placement, mobile_priority
- `social_direction_json`: post_style, ad_style, carousel_style, quote_post_look, educational_graphic_rules, consistency_system
- `website_direction_json`: homepage_mood, hero_style, section_density, luxury_vs_clarity, lead_gen_vs_credibility
- `seasonal_local_json`: local_region, neighbourhood_vibe, urban_vs_suburban, seasonal_reflection, seasonal_strength, weather_cues, holiday_style
- `subject_themes_json`: people_types, home_style, business_setting, city_elements, lifestyle_cues, symbolic_themes
- `cta_style_json`: strong_vs_soft, educational_vs_conversion, preferred_phrasing, salesiness_threshold
- `formatting_rules_json`: bullet_style, emoji_level, hashtag_count, contact_info_rules, platform_tone
- `avoid_list_json`: visual_dislikes (array), colour_dislikes (array), tone_dislikes (array), bad_fit_styles (array), overused_trends (array)
- `locked_rules_json`: rules (array of non-negotiable strings)
- `prompt_notes_json`: notes (free text for prompt-ready language)

The `full_onboarding` extraction is also expanded to capture audience perception goals into `audience_json` (target_emotional_response, trust_signals, first_impression, engagement_drivers).

### 5. Update `InterviewTab.tsx` template picker

Add the new `visual_brand` template card:
- Label: "Visual & Design Direction"
- Description: "Colours, typography, layout, visual style & brand avoid list"
- Icon: `Palette` (from lucide)
- Colour: teal

### 6. Update merge logic in `InterviewTab.tsx`

Extend `triggerAutoExtract` to merge the new extracted sections into the corresponding new `brand_twin` columns using the same non-destructive `mergeSection` logic.

## UI Changes

### 7. Admin Brand Twin editor — `src/pages/admin/ClientBrain.tsx`

Add accordion sections for all new fields. Group into logical clusters:

**Identity & Voice** (existing): Brand Basics, Brand Voice, Audience, Offers, Content Rules

**Visual System** (new):
- Visual Design Direction — inputs for design_style, visual_style, photo_realism, polish_level
- Colour Direction — inputs for primary/accent/dominant + TagInputs for supporting/avoid colours
- Typography + Text Rules — inputs for font_feel, headline_style, text_density, caps_preference
- Text-on-Design Rules — inputs for headline policy, educational graphics, caption strategy
- Composition + Layout — inputs for focal_point, scene type, text room, mobile priority

**Content Direction** (new):
- Social Content Direction — inputs for post_style, ad_style, carousel_style, consistency
- Website Design Direction — inputs for homepage_mood, hero_style, section_density
- Subject Matter / Visual Themes — inputs for people_types, settings, lifestyle cues
- Seasonal + Local Identity — inputs for region, seasonality, weather cues

**Rules & Prompts** (new):
- CTA + Conversion Style — inputs for CTA strength, phrasing, educational vs conversion
- Formatting Rules — inputs for bullets, emojis, hashtags, contact info
- Avoid List — TagInputs for each dislike category
- Locked Brand Rules — TagInput for non-negotiable rules
- AI Prompt Notes — large Textarea for prompt-ready language

### 8. Client-facing Brand Twin viewer — `src/pages/client/BrandTwin.tsx`

Expand the SECTIONS array to display all new sections in a clean read-only card grid. Group the cards logically matching the admin layout.

## Interview Flow Mapping

```text
Template                  → Sections Populated
─────────────────────────────────────────────────
full_onboarding          → brand_basics, brand_voice, audience, offers, content_rules
brand_voice              → brand_voice, cta_style, formatting_rules
audience                 → audience (including perception goals)
content_strategy         → content_rules, social_direction, formatting_rules
website_discovery        → website_briefs table (unchanged)
visual_brand (NEW)       → visual_design, colour_direction, typography, text_on_design,
                           composition, social_direction, website_direction,
                           subject_themes, seasonal_local, avoid_list
```

After interviews, the admin can manually refine and then "lock" rules into `locked_rules_json` and write `prompt_notes_json` for the design team.

## Files Changed

| File | Change |
|---|---|
| Migration SQL | Add 14 JSONB columns to `brand_twin` |
| `supabase/functions/ai-interview/index.ts` | Add `visual_brand` template prompt + expanded extraction tools for all new sections |
| `src/components/brain/InterviewTab.tsx` | Add `visual_brand` to template picker + expand merge logic for new columns |
| `src/pages/admin/ClientBrain.tsx` | Add accordion sections for all 14 new Brand Twin fields |
| `src/pages/client/BrandTwin.tsx` | Expand SECTIONS to show all new fields in read-only cards |

No changes to RLS (existing `brand_twin` policies cover all columns). No changes to `website_briefs` (that stays separate).

