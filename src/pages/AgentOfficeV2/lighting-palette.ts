/** Ambient surface colors for day and night modes.
 *  Components import { DAY, NIGHT } and select via mode === 'day' ? DAY : NIGHT.
 *  Desk surfaces, props, sprites, checkerboard are NOT in this palette — they stay constant.
 */

export interface OfficePalette {
  floorBg:          string;
  backWallBg:       string;
  backWallBorder:   string;
  podAiBg:          string;
  podAiBorder:      string;
  podWingBg:        string;
  podWingBorder:    string;
  nookBg:           string;
  nookBorder:       string;
  commonBg:         string;
  commonDivider:    string;
  commonSep:        string;
  clientFrameBg:    string;
  laptopBg:         string;
  upperBg:          string;
  upperWallBg:      string;   // used as gradient start in day; flat in night
  upperWallBorder:  string;
  meetWallBg:       string;
  meetWallBorder:   string;
  chromeBg:         string;
  chromeBorder:     string;
}

/** Day — the +13 lifted palette from Phase 6.9a-v2 */
export const DAY: OfficePalette = {
  floorBg:         '#1a222d',
  backWallBg:      '#171d25',
  backWallBorder:  '#27354d',
  podAiBg:         '#1e2535',
  podAiBorder:     '#2b3749',
  podWingBg:       '#1c232d',
  podWingBorder:   '#27313f',
  nookBg:          '#191d25',
  nookBorder:      '#252d3d',
  commonBg:        '#181e25',
  commonDivider:   '#27354d',
  commonSep:       '#27313f',
  clientFrameBg:   '#171b21',
  laptopBg:        '#1a222d',
  upperBg:         '#1b212f',
  upperWallBg:     '#151b25',
  upperWallBorder: '#253149',
  meetWallBg:      '#191f2d',
  meetWallBorder:  '#27354d',
  chromeBg:        '#161c2a',
  chromeBorder:    '#2e3c54',
};

/** Night — pre-6.9a original dark palette: ambient pulled back ~13 units.
 *  Desk lamps now feel dramatic; ceiling halos dimmed to near-off. */
export const NIGHT: OfficePalette = {
  floorBg:         '#0d1520',
  backWallBg:      '#0a1018',
  backWallBorder:  '#1a2840',
  podAiBg:         '#111828',
  podAiBorder:     '#1e2a3c',
  podWingBg:       '#0f1620',
  podWingBorder:   '#1a2436',
  nookBg:          '#0c1018',
  nookBorder:      '#182030',
  commonBg:        '#0b1118',
  commonDivider:   '#1a2840',
  commonSep:       '#1a2436',
  clientFrameBg:   '#0a0e18',
  laptopBg:        '#0d1520',
  upperBg:         '#0e1422',
  upperWallBg:     '#080e18',
  upperWallBorder: '#18243c',
  meetWallBg:      '#0c1220',
  meetWallBorder:  '#1a2840',
  chromeBg:        '#080e1c',
  chromeBorder:    '#1a2840',
};
