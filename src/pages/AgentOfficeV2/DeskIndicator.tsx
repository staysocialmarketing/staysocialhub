export type IndicatorType =
  | 'crown'
  | 'briefcase'
  | 'magnifying_glass'
  | 'social_stack'
  | 'envelope'
  | 'code_brackets'
  | 'bullseye'
  | 'video_camera'
  | 'handshake'
  | 'question';

interface DeskIndicatorProps {
  type: IndicatorType;
  color: string;
  x: number;
  y: number;
  deskW: number;
  ghost?: boolean;
}

const BADGE_SIZE = 14;

function CrownIcon() {
  return <polygon points="1,9.5 1,4.8 3.2,2 5,4.5 6.8,2 9,4.8 9,9.5" fill="currentColor"/>;
}

function BriefcaseIcon() {
  return (
    <>
      <path d="M3.5 3.5 L3.5 2 Q3.5 1.2 4.5 1.2 L5.5 1.2 Q6.5 1.2 6.5 2 L6.5 3.5"
        fill="none" stroke="currentColor" strokeWidth="1.1"/>
      <rect x="1" y="3.5" width="8" height="5.5" rx="0.5" fill="currentColor" opacity="0.9"/>
      <line x1="1" y1="6.5" x2="9" y2="6.5" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8"/>
    </>
  );
}

function MagnifyingGlassIcon() {
  return (
    <>
      <circle cx="4" cy="4.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6"/>
      <line x1="6.5" y1="7" x2="9" y2="9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </>
  );
}

function SocialStackIcon() {
  // Three overlapping platform tiles — front tile is fully opaque,
  // back tiles are slightly offset and dimmed to read as layered/stacked.
  return (
    <>
      {/* Back-left tile */}
      <rect x="0" y="1.5" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.45"/>
      {/* Back-right tile */}
      <rect x="3.5" y="0" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.6"/>
      {/* Front-center tile — fully opaque, overlaps both */}
      <rect x="1.8" y="3.2" width="5" height="5" rx="1.2" fill="currentColor"/>
    </>
  );
}

function EnvelopeIcon() {
  return (
    <>
      <rect x="0.5" y="2.5" width="9" height="6.5" rx="0.5" fill="currentColor" opacity="0.85"/>
      <polyline points="0.5,2.5 5,6 9.5,2.5" fill="none" stroke="currentColor" strokeWidth="1"/>
    </>
  );
}

function CodeBracketsIcon() {
  return (
    <>
      <path d="M4.5,2 L2,5 L4.5,8" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5,2 L8,5 L5.5,8" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  );
}

function BullseyeIcon() {
  return (
    <>
      <circle cx="5" cy="5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1"/>
      <circle cx="5" cy="5" r="2.8" fill="currentColor" opacity="0.35"/>
      <circle cx="5" cy="5" r="1.2" fill="currentColor"/>
    </>
  );
}

function VideoCameraIcon() {
  return (
    <>
      <rect x="0.5" y="2.5" width="6" height="5.5" rx="0.5" fill="currentColor" opacity="0.9"/>
      <polygon points="7,3.2 9.5,5.25 7,7.3" fill="currentColor"/>
      <circle cx="3.5" cy="5.25" r="1.5" fill="rgba(255,255,255,0.35)" stroke="currentColor" strokeWidth="0.5"/>
    </>
  );
}

function HandshakeIcon() {
  return (
    <>
      <circle cx="2.5" cy="2" r="1.5" fill="currentColor"/>
      <rect x="1.2" y="3.5" width="2.6" height="3" rx="0.5" fill="currentColor"/>
      <circle cx="7.5" cy="2" r="1.5" fill="currentColor"/>
      <rect x="6.2" y="3.5" width="2.6" height="3" rx="0.5" fill="currentColor"/>
      <line x1="3.8" y1="5" x2="6.2" y2="5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </>
  );
}

function QuestionIcon() {
  return (
    <text x="5" y="8.5" textAnchor="middle" fontSize="9"
      fontFamily="monospace" fill="currentColor" fontWeight="bold">
      ?
    </text>
  );
}

const ICON_MAP: Record<IndicatorType, () => JSX.Element> = {
  crown:             CrownIcon,
  briefcase:         BriefcaseIcon,
  magnifying_glass:  MagnifyingGlassIcon,
  social_stack:      SocialStackIcon,
  envelope:          EnvelopeIcon,
  code_brackets:     CodeBracketsIcon,
  bullseye:          BullseyeIcon,
  video_camera:      VideoCameraIcon,
  handshake:         HandshakeIcon,
  question:          QuestionIcon,
};

export function DeskIndicator({ type, color, x, y, deskW, ghost = false }: DeskIndicatorProps) {
  const left = x + deskW - BADGE_SIZE;
  const top  = y - Math.floor(BADGE_SIZE / 2);
  const Icon = ICON_MAP[type];

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        borderRadius: '50%',
        background: ghost ? '#161c28' : `${color}1a`,
        border: `1px solid ${ghost ? '#252d40' : color}`,
        opacity: ghost ? 0.4 : 1,
        filter: ghost ? 'grayscale(0.55)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <svg
        width={10}
        height={10}
        viewBox="0 0 10 10"
        style={{ color: ghost ? '#4a5878' : color, display: 'block' }}
      >
        <Icon />
      </svg>
    </div>
  );
}
