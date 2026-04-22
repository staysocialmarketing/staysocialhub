const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  google: "#DB4437",
  email: "#6B7280",
  tiktok: "#000000",
};

/**
 * Normalise a raw platform value into an array of individual platform names.
 * Handles:
 *   - Single string: "Facebook"        → ["Facebook"]
 *   - Comma-separated: "facebook,instagram" → ["facebook", "instagram"]
 *   - Already an array: ["Facebook", "Instagram"] → ["Facebook", "Instagram"]
 */
function normalisePlatforms(platform: string | string[] | null | undefined): string[] {
  if (!platform) return [];
  if (Array.isArray(platform)) return platform.map((p) => p.trim()).filter(Boolean);
  // It's a string — split on commas regardless of whether there's one value or many
  return platform.split(",").map((p) => p.trim()).filter(Boolean);
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Renders a single platform badge. */
export function PlatformBadge({ platform }: { platform: string }) {
  const label = capitalise(platform);
  return (
    <span
      style={{
        backgroundColor: PLATFORM_COLORS[platform.toLowerCase()] || "#6B7280",
        color: "white",
        fontSize: "11px",
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: "9999px",
        textTransform: "capitalize",
        display: "inline-block",
        lineHeight: "1.4",
      }}
    >
      {label}
    </span>
  );
}

/**
 * Renders one or more platform badges from a raw value.
 * Accepts a comma-separated string, a single platform name, or an array.
 * This is the preferred component for displaying platform fields from the database.
 */
export function PlatformBadges({
  platformStr,
}: {
  platformStr: string | string[] | null | undefined;
}) {
  const platforms = normalisePlatforms(platformStr);
  if (platforms.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {platforms.map((p) => (
        <PlatformBadge key={p} platform={p} />
      ))}
    </div>
  );
}
