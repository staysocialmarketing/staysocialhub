/**
 * Returns a skin-toned wave emoji for specific team members.
 * Default is standard yellow 👋.
 */
const SKIN_TONES: Record<string, string> = {
  tristan: "👋🏿",
  gavin: "👋🏽",
};

export function getWaveEmoji(name?: string | null): string {
  if (!name) return "👋";
  const firstName = name.split(" ")[0].toLowerCase();
  return SKIN_TONES[firstName] || "👋";
}
