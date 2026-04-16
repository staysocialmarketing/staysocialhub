const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E1306C",
  linkedin: "#0A66C2",
  google: "#DB4437",
  email: "#6B7280",
  tiktok: "#000000",
};

export function PlatformBadge({ platform }: { platform: string }) {
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
      {platform}
    </span>
  );
}

export function PlatformBadges({ platformStr }: { platformStr: string | null | undefined }) {
  if (!platformStr) return null;
  const platforms = platformStr.split(",").map((p) => p.trim()).filter(Boolean);
  if (platforms.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {platforms.map((p) => (
        <PlatformBadge key={p} platform={p} />
      ))}
    </div>
  );
}
