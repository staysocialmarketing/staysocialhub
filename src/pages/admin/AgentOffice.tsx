import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AgentData {
  id: string;
  name: string;
  role: string;
  status: "active" | "processing" | "idle" | "offline";
  task: string | null;
  model?: string;
}

interface OfficeState {
  agents: AgentData[];
  connected: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const NANOCLAW_URL = "http://localhost:3456/status";
const POLL_MS = 5000;

const STATUS_CFG = {
  active: {
    color: "#3fb950",
    bg: "rgba(63,185,80,0.08)",
    border: "#3fb950",
    label: "TYPING",
    shirt: "#2a8c3f",
    belt: "#3fb950",
    screen: "#0a2a0a",
    screenLine: "#3fb950",
    anim: "ao-bounce",
  },
  processing: {
    color: "#d29922",
    bg: "rgba(210,153,34,0.08)",
    border: "#d29922",
    label: "READING",
    shirt: "#7a5200",
    belt: "#d29922",
    screen: "#1a1200",
    screenLine: "#d29922",
    anim: "ao-pulse",
  },
  idle: {
    color: "#388bfd",
    bg: "rgba(56,139,253,0.06)",
    border: "#388bfd",
    label: "IDLE",
    shirt: "#1a5cbf",
    belt: "#388bfd",
    screen: "#0a0f1a",
    screenLine: "#388bfd",
    anim: "ao-idle",
  },
  offline: {
    color: "#6e7681",
    bg: "rgba(110,118,129,0.04)",
    border: "#30363d",
    label: "OFFLINE",
    shirt: "#444c56",
    belt: "#444c56",
    screen: "#0d1117",
    screenLine: "#30363d",
    anim: "ao-sleep",
  },
} as const;

// ─── CSS ─────────────────────────────────────────────────────────────────────

const OFFICE_CSS = `
  @keyframes ao-bounce {
    0%, 100% { transform: translateY(0px); }
    25% { transform: translateY(-3px); }
    75% { transform: translateY(-1px); }
  }
  @keyframes ao-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes ao-idle {
    0%, 90%, 100% { transform: translateY(0px); }
    95% { transform: translateY(-1px); }
  }
  @keyframes ao-sleep {
    0%, 100% { transform: rotate(0deg) translateY(0px); }
    50% { transform: rotate(-4deg) translateY(2px); }
  }
  @keyframes ao-blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  @keyframes ao-zzz {
    0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
    30% { opacity: 1; }
    100% { transform: translate(10px, -18px) scale(1); opacity: 0; }
  }
  @keyframes ao-scan {
    0% { top: 4px; }
    100% { top: 20px; }
  }
  @keyframes ao-cursor {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  .ao-char-active   { animation: ao-bounce 0.6s ease-in-out infinite; }
  .ao-char-processing { animation: ao-pulse 1.8s ease-in-out infinite; }
  .ao-char-idle     { animation: ao-idle 4s ease-in-out infinite; }
  .ao-char-offline  { animation: ao-sleep 3s ease-in-out infinite; }
  .ao-desk-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 160px;
    padding: 12px 12px 10px;
    background: #161b22;
    outline: 2px solid #30363d;
    cursor: default;
    transition: outline-color 0.2s;
    image-rendering: pixelated;
  }
  .ao-desk-card:hover { outline-color: #58a6ff; }
  .ao-speech {
    position: absolute;
    top: -2px;
    left: 50%;
    transform: translate(-50%, -100%);
    width: 136px;
    background: #1c2128;
    outline: 2px solid #30363d;
    padding: 5px 7px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9px;
    line-height: 1.4;
    color: #e6edf3;
    word-break: break-word;
    text-align: center;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ao-speech::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 6px;
    background: #1c2128;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    outline: none;
  }
  .ao-name-tag {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #e6edf3;
    margin-top: 6px;
    text-align: center;
  }
  .ao-role-tag {
    font-family: 'Courier New', Courier, monospace;
    font-size: 9px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #7d8590;
    text-align: center;
    margin-top: 2px;
  }
  .ao-status-badge {
    display: inline-block;
    margin-top: 6px;
    padding: 2px 6px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    outline: 1px solid currentColor;
  }
  .ao-zzz {
    position: absolute;
    font-size: 9px;
    font-weight: 700;
    color: #6e7681;
    font-family: 'Courier New', Courier, monospace;
    animation: ao-zzz 2.4s ease-out infinite;
  }
  .ao-zzz:nth-child(2) { animation-delay: 0.8s; }
  .ao-zzz:nth-child(3) { animation-delay: 1.6s; }
`;

// ─── Character SVG ───────────────────────────────────────────────────────────

function PixelCharacter({ status }: { status: keyof typeof STATUS_CFG }) {
  const cfg = STATUS_CFG[status];
  const skin = "#e8c090";
  const hair = "#2d1500";
  const eyes = "#0d0d0d";
  const pants = "#1a2e4a";
  const shoes = "#0a0a0a";

  return (
    <svg
      width="45"
      height="65"
      viewBox="0 0 9 13"
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
      className={`ao-char-${status}`}
    >
      {/* Hair */}
      <rect x="3" y="0" width="3" height="1" fill={hair} />
      {/* Head */}
      <rect x="2" y="1" width="5" height="3" fill={skin} />
      {/* Eyes */}
      <rect x="3" y="2" width="1" height="1" fill={eyes} />
      <rect x="5" y="2" width="1" height="1" fill={eyes} />
      {/* Mouth — smile or flat depending on status */}
      {status !== "offline" ? (
        <>
          <rect x="3" y="3" width="1" height="1" fill={eyes} />
          <rect x="5" y="3" width="1" height="1" fill={eyes} />
        </>
      ) : (
        <rect x="3" y="3" width="3" height="1" fill={eyes} />
      )}
      {/* Neck */}
      <rect x="3" y="4" width="3" height="1" fill={skin} />
      {/* Shoulders */}
      <rect x="1" y="5" width="7" height="1" fill={cfg.shirt} />
      {/* Body */}
      <rect x="3" y="6" width="3" height="2" fill={cfg.shirt} />
      {/* Hands */}
      <rect x="1" y="6" width="1" height="1" fill={skin} />
      <rect x="7" y="6" width="1" height="1" fill={skin} />
      {/* Belt */}
      <rect x="2" y="8" width="5" height="1" fill={cfg.belt} />
      {/* Legs */}
      <rect x="2" y="9" width="2" height="3" fill={pants} />
      <rect x="5" y="9" width="2" height="3" fill={pants} />
      {/* Shoes */}
      <rect x="2" y="12" width="2" height="1" fill={shoes} />
      <rect x="5" y="12" width="2" height="1" fill={shoes} />
    </svg>
  );
}

// ─── Monitor SVG ─────────────────────────────────────────────────────────────

function PixelMonitor({ status }: { status: keyof typeof STATUS_CFG }) {
  const cfg = STATUS_CFG[status];

  return (
    <div style={{ position: "relative", width: 68, height: 48, marginBottom: 4 }}>
      {/* Monitor body */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 40,
          background: "#1c2128",
          outline: `2px solid ${cfg.border}`,
          padding: 4,
        }}
      >
        {/* Screen */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: cfg.screen,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {status === "active" && (
            <>
              <div style={{ position: "absolute", top: 4, left: 4, right: 12, height: 2, background: cfg.screenLine, opacity: 0.8 }} />
              <div style={{ position: "absolute", top: 8, left: 4, right: 6, height: 2, background: cfg.screenLine, opacity: 0.6 }} />
              <div style={{ position: "absolute", top: 12, left: 4, right: 16, height: 2, background: cfg.screenLine, opacity: 0.7 }} />
              <div style={{ position: "absolute", top: 16, left: 4, right: 0, height: 2, background: cfg.screenLine, opacity: 0.5, animation: "ao-cursor 0.8s step-end infinite" }} />
            </>
          )}
          {status === "processing" && (
            <>
              {[4, 9, 14, 19].map((top, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top,
                    left: 4,
                    right: 4,
                    height: 2,
                    background: cfg.screenLine,
                    opacity: 0.4 + i * 0.15,
                    animation: `ao-pulse ${1 + i * 0.2}s ease-in-out infinite`,
                  }}
                />
              ))}
            </>
          )}
          {status === "idle" && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 20,
                height: 14,
                background: cfg.screenLine,
                opacity: 0.15,
              }}
            />
          )}
          {status === "offline" && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: 8,
                color: "#6e7681",
                letterSpacing: 1,
              }}
            >
              NO SIGNAL
            </div>
          )}
        </div>
      </div>
      {/* Monitor stand */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 16,
          height: 8,
          background: "#21262d",
          outline: `2px solid ${cfg.border}`,
          outlineOffset: -1,
        }}
      />
    </div>
  );
}

// ─── Agent Desk Card ──────────────────────────────────────────────────────────

function AgentDesk({ agent }: { agent: AgentData }) {
  const status = (agent.status in STATUS_CFG ? agent.status : "idle") as keyof typeof STATUS_CFG;
  const cfg = STATUS_CFG[status];
  const taskText = agent.task || (status === "idle" ? "Waiting for work..." : status === "offline" ? "Offline" : "Working...");

  return (
    <div style={{ paddingTop: 56 }}>
      {/* Speech bubble rendered above card */}
      <div style={{ position: "relative" }}>
        <div className="ao-speech" style={{ outlineColor: cfg.border }}>
          {taskText}
          <div
            style={{
              position: "absolute",
              bottom: -7,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `7px solid ${cfg.border}`,
            }}
          />
        </div>

        <div className="ao-desk-card" style={{ outlineColor: cfg.border, background: cfg.bg }}>
          {/* Monitor */}
          <PixelMonitor status={status} />

          {/* Desk surface */}
          <div
            style={{
              width: "100%",
              height: 6,
              background: "#3d2b1f",
              outline: "2px solid #5a3d2a",
              marginBottom: 8,
              position: "relative",
            }}
          >
            {/* Keyboard hint */}
            <div
              style={{
                position: "absolute",
                right: 8,
                top: 1,
                width: 20,
                height: 4,
                background: "#4a3628",
                outline: "1px solid #6b5040",
              }}
            />
          </div>

          {/* Character + ZZZ for offline */}
          <div style={{ position: "relative" }}>
            <PixelCharacter status={status} />
            {status === "offline" && (
              <>
                <span className="ao-zzz" style={{ top: -4, right: 2 }}>Z</span>
                <span className="ao-zzz" style={{ top: -8, right: 6, fontSize: 11 }}>Z</span>
                <span className="ao-zzz" style={{ top: -12, right: 10, fontSize: 13 }}>Z</span>
              </>
            )}
          </div>

          {/* Name tag */}
          <div className="ao-name-tag">{agent.name}</div>
          <div className="ao-role-tag">{agent.role}</div>
          <span
            className="ao-status-badge"
            style={{ color: cfg.color, outlineColor: cfg.color }}
          >
            {cfg.label}
          </span>

          {agent.model && (
            <div
              style={{
                marginTop: 4,
                fontSize: 8,
                color: "#7d8590",
                fontFamily: "'Courier New', Courier, monospace",
                letterSpacing: 0.5,
              }}
            >
              {agent.model}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ error }: { error: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        gap: 16,
      }}
    >
      {/* Pixel art empty desk */}
      <svg width="80" height="60" viewBox="0 0 20 15" shapeRendering="crispEdges" style={{ imageRendering: "pixelated", opacity: 0.4 }}>
        {/* Monitor outline */}
        <rect x="3" y="0" width="14" height="9" fill="none" stroke="#30363d" strokeWidth="1" />
        {/* X on screen */}
        <rect x="6" y="2" width="2" height="2" fill="#30363d" />
        <rect x="12" y="2" width="2" height="2" fill="#30363d" />
        <rect x="8" y="4" width="4" height="1" fill="#30363d" />
        <rect x="6" y="6" width="2" height="2" fill="#30363d" />
        <rect x="12" y="6" width="2" height="2" fill="#30363d" />
        {/* Stand */}
        <rect x="9" y="9" width="2" height="2" fill="#30363d" />
        {/* Desk */}
        <rect x="0" y="11" width="20" height="2" fill="#21262d" />
        <rect x="0" y="11" width="20" height="1" fill="#30363d" />
      </svg>

      <div
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 14,
          color: "#6e7681",
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        NO AGENTS CONNECTED
      </div>

      <div
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 10,
          color: "#484f58",
          letterSpacing: 1,
          textAlign: "center",
          maxWidth: 300,
        }}
      >
        {error
          ? `NANOCLAW OFFLINE — ${error.toUpperCase()}`
          : "WAITING FOR NANOCLAW ON localhost:3456"}
      </div>

      <div
        style={{
          width: 8,
          height: 8,
          background: "#30363d",
          outline: "2px solid #484f58",
          animation: "ao-pulse 2s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar({
  agents,
  connected,
  lastUpdated,
}: {
  agents: AgentData[];
  connected: boolean;
  lastUpdated: Date | null;
}) {
  const activeCount = agents.filter((a) => a.status === "active").length;
  const totalOnline = agents.filter((a) => a.status !== "offline").length;

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", { hour12: false })
    : "--:--:--";

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        marginTop: 32,
        padding: "8px 16px",
        background: "#0d1117",
        borderTop: "2px solid #30363d",
        display: "flex",
        alignItems: "center",
        gap: 24,
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: 10,
        letterSpacing: 1.5,
        color: "#6e7681",
        textTransform: "uppercase",
      }}
    >
      {/* Connection dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 6,
            height: 6,
            background: connected ? "#3fb950" : "#f85149",
            outline: `1px solid ${connected ? "#3fb950" : "#f85149"}`,
            animation: connected ? "ao-pulse 2s ease-in-out infinite" : "none",
          }}
        />
        <span style={{ color: connected ? "#3fb950" : "#f85149" }}>
          {connected ? "NANOCLAW ONLINE" : "NANOCLAW OFFLINE"}
        </span>
      </div>

      <span>|</span>

      <span>
        <span style={{ color: "#3fb950" }}>{activeCount}</span>
        {" ACTIVE · "}
        <span style={{ color: "#388bfd" }}>{totalOnline}</span>
        {" ONLINE · "}
        <span>{agents.length}</span>
        {" TOTAL"}
      </span>

      <span>|</span>

      <span>LAST SYNC: {timeStr}</span>

      <span style={{ marginLeft: "auto", color: "#484f58" }}>
        POLLING EVERY {POLL_MS / 1000}s
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentOffice() {
  const { isSSAdmin, loading } = useAuth();
  const [state, setState] = useState<OfficeState>({
    agents: [],
    connected: false,
    lastUpdated: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(NANOCLAW_URL, {
          signal: AbortSignal.timeout(4000),
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setState({
            agents: Array.isArray(data.agents) ? data.agents : [],
            connected: true,
            lastUpdated: new Date(),
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            connected: false,
            lastUpdated: new Date(),
            error: err instanceof Error ? err.message : "Connection failed",
          }));
        }
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) return null;
  if (!isSSAdmin) return <Navigate to="/dashboard" replace />;

  const showEmpty = !state.connected && state.agents.length === 0;

  return (
    <div
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        background: "#0d1117",
        minHeight: "100%",
        color: "#e6edf3",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{OFFICE_CSS}</style>

      {/* Header */}
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "2px solid #21262d",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#f97316",
              margin: 0,
            }}
          >
            ▓▓ AGENT OFFICE
          </h1>
          <span
            style={{
              fontSize: 9,
              color: "#484f58",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            NANOCLAW OPERATIONS CENTER — INTERNAL
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 9,
            color: "#484f58",
            letterSpacing: 1,
          }}
        >
          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
        </div>
      </div>

      {/* Office floor */}
      <div style={{ flex: 1, padding: "40px 24px 8px", overflowY: "auto" }}>
        {showEmpty ? (
          <EmptyState error={state.error} />
        ) : (
          <>
            {/* Floor label */}
            <div
              style={{
                fontSize: 9,
                color: "#484f58",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 40,
              }}
            >
              ▸ FLOOR 1 — AI OPERATIONS
            </div>

            {/* Agent grid */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "64px 24px",
                alignItems: "flex-end",
              }}
            >
              {state.agents.map((agent) => (
                <AgentDesk key={agent.id} agent={agent} />
              ))}
            </div>

            {/* Floor tile decoration */}
            <div
              style={{
                marginTop: 48,
                borderTop: "2px solid #161b22",
                paddingTop: 8,
                fontSize: 9,
                color: "#21262d",
                letterSpacing: 1,
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              {"████░████░████░████░████░████░████░████░████░████░████░████░████░████░████░████"}
            </div>
          </>
        )}
      </div>

      {/* Status bar */}
      <StatusBar
        agents={state.agents}
        connected={state.connected}
        lastUpdated={state.lastUpdated}
      />
    </div>
  );
}
