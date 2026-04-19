import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────────────────

const POLL_MS = 8000;

// Office canvas dimensions (fixed pixel art canvas)
const OW = 960;  // office width
const OH = 580;  // office height

// Room Y boundaries
const TOP_WALL_H   = 32;
const ROOM_BOTTOM  = 200;
const OPEN_TOP     = 204;
const OPEN_BOTTOM  = 488;
const REC_TOP      = 492;
const REC_BOTTOM   = 552;

// Room X boundaries
const TT_RIGHT   = 280;   // Think Tank right edge
const MR_LEFT    = 680;   // Meeting Room left edge

// Desk dimensions
const DESK_W = 148;
const DESK_H = 100;

// Named desk layout — hierarchical
// Lev centered in row 1; Scout + Quill flank below; 2 future slots
interface NamedDesk {
  key: "lev" | "scout" | "quill" | "future";
  x: number;
  y: number;
}
const NAMED_DESKS: NamedDesk[] = [
  { key: "lev",    x: 406, y: 224 },  // Centered, row 1
  { key: "scout",  x: 204, y: 352 },  // Flanks left, row 2
  { key: "quill",  x: 596, y: 352 },  // Flanks right, row 2
  { key: "future", x: 32,  y: 352 },  // Far-left future slot
  { key: "future", x: 780, y: 352 },  // Far-right future slot
];

// Hierarchy connector points (bottom-center of Lev → top-center of sub-agents)
const LEV_BC   = { x: 406 + DESK_W / 2, y: 224 + DESK_H };   // 480, 324
const SCOUT_TC = { x: 204 + DESK_W / 2, y: 352 };              // 278, 352
const QUILL_TC = { x: 596 + DESK_W / 2, y: 352 };              // 670, 352
const BRANCH_Y = 338; // midpoint for org-chart elbow

// Stub agents — pre-configured desks shown even before NanoClaw creates them
const STUB_SCOUT: AgentData = { id: "scout", name: "Scout", role: "Research",     status: "offline", task: null };
const STUB_QUILL: AgentData = { id: "quill", name: "Quill", role: "Copywriting",  status: "offline", task: null };

const STATUS_CFG = {
  active: {
    color: "#3fb950", border: "#3fb950", label: "TYPING",
    screenBg: "#061208", screenLine: "#3fb950",
    headFill: "#3fb950", bodyFill: "#2a7a38", glowColor: "rgba(63,185,80,0.18)",
    anim: "ao-bounce",
  },
  processing: {
    color: "#d29922", border: "#d29922", label: "READING",
    screenBg: "#120e00", screenLine: "#d29922",
    headFill: "#d29922", bodyFill: "#7a5400", glowColor: "rgba(210,153,34,0.18)",
    anim: "ao-pulse-char",
  },
  idle: {
    color: "#388bfd", border: "#388bfd", label: "IDLE",
    screenBg: "#060c18", screenLine: "#388bfd",
    headFill: "#388bfd", bodyFill: "#1a4a9a", glowColor: "rgba(56,139,253,0.14)",
    anim: "ao-breathe",
  },
  offline: {
    color: "#6e7681", border: "#30363d", label: "OFFLINE",
    screenBg: "#0a0a0a", screenLine: "#222",
    headFill: "#6e7681", bodyFill: "#3a3f47", glowColor: "transparent",
    anim: "ao-sleep",
  },
} as const;

// ─── CSS ─────────────────────────────────────────────────────────────────────

const OFFICE_CSS = `
  /* ── Lev character ── */
  @keyframes ao-lev-idle {
    0%,55%,100% { transform: translateY(0) translateX(0); }
    65%  { transform: translateY(-1px) translateX(-1px); }
    75%  { transform: translateY(-1px) translateX(-1px); }
    85%  { transform: translateY(0) translateX(0); }
  }
  @keyframes ao-lev-active {
    0%,100% { transform: translateY(-2px) translateX(-1px); }
    40%     { transform: translateY(-3px) translateX(-2px); }
    70%     { transform: translateY(-2px) translateX(-1px); }
  }
  @keyframes ao-lev-process {
    0%,100% { transform: translateY(-1px); }
    50%     { transform: translateY(-2px); }
  }
  @keyframes ao-lev-offline {
    0%,100% { transform: rotate(-3deg) translateY(0); }
    50%     { transform: rotate(-2deg) translateY(-1px); }
  }
  @keyframes ao-lev-wake {
    0%   { transform: rotate(-3deg) translateY(3px); opacity:0.7; }
    22%  { transform: rotate(0deg) translateY(-4px); opacity:1; }
    42%  { transform: translateY(-4px) scaleX(1.03); }
    62%  { transform: translateY(-3px) translateX(-2px); }
    82%  { transform: translateY(-2px) translateX(-1px); }
    100% { transform: translateY(-2px) translateX(-1px); }
  }
  /* ── Generic characters ── */
  @keyframes ao-char-active {
    0%,100% { transform: translateY(-1px); }
    40%     { transform: translateY(-2px); }
  }
  @keyframes ao-char-process {
    0%,100% { opacity:1; }
    50%     { opacity:0.72; }
  }
  @keyframes ao-char-idle {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-1px); }
  }
  @keyframes ao-char-offline {
    0%,100% { transform: rotate(-5deg) translateY(2px); }
    50%     { transform: rotate(-3deg) translateY(1px); }
  }
  @keyframes ao-char-wake {
    0%   { transform: rotate(-5deg) translateY(3px); }
    40%  { transform: rotate(0deg) translateY(-3px); }
    70%  { transform: translateY(-2px); }
    100% { transform: translateY(0); }
  }
  /* ── Desk / environment ── */
  @keyframes ao-blink-cursor {
    0%,49% { opacity:1; } 50%,100% { opacity:0; }
  }
  @keyframes ao-scan {
    0%   { transform: translateY(0); opacity:0.9; }
    100% { transform: translateY(16px); opacity:0.2; }
  }
  @keyframes ao-zzz {
    0%   { transform: translate(0,0) scale(0.5); opacity:0; }
    20%  { opacity:1; }
    100% { transform: translate(8px,-20px) scale(1.1); opacity:0; }
  }
  @keyframes ao-desk-on {
    0%   { box-shadow: 0 0 0 0 transparent; }
    40%  { box-shadow: 0 0 24px 4px var(--desk-glow); }
    100% { box-shadow: 0 0 8px 2px var(--desk-glow); }
  }
  @keyframes ao-monitor-glow {
    0%,100% { opacity:0.8; }
    50%     { opacity:1; }
  }
  @keyframes ao-doc-float {
    0%,100% { transform: translateY(0) rotate(-2deg); }
    50%     { transform: translateY(-2px) rotate(-1deg); }
  }
  @keyframes ao-steam {
    0%   { transform: translateY(0) scaleX(1); opacity:0.5; }
    100% { transform: translateY(-6px) scaleX(1.3); opacity:0; }
  }
  @keyframes ao-light-flicker {
    0%,100% { opacity:0.82; }
    45%     { opacity:0.78; }
    50%     { opacity:0.88; }
    55%     { opacity:0.80; }
  }
  @keyframes ao-star-twinkle {
    0%,100% { opacity:0.6; }
    50%     { opacity:1; }
  }
  @keyframes ao-status-dot {
    0%,100% { opacity:1; }
    50%     { opacity:0.3; }
  }
  .ao-lev-idle    { animation: ao-lev-idle 8s ease-in-out infinite; transform-origin: bottom center; }
  .ao-lev-active  { animation: ao-lev-active 0.7s ease-in-out infinite; transform-origin: bottom center; }
  .ao-lev-process { animation: ao-lev-process 2.5s ease-in-out infinite; transform-origin: bottom center; }
  .ao-lev-offline { animation: ao-lev-offline 4s ease-in-out infinite; transform-origin: bottom center; }
  .ao-lev-wake    { animation: ao-lev-wake 1.6s ease-out forwards; transform-origin: bottom center; }
  .ao-char-active  { animation: ao-char-active 0.6s ease-in-out infinite; transform-origin: bottom center; }
  .ao-char-process { animation: ao-char-process 1.8s ease-in-out infinite; transform-origin: bottom center; }
  .ao-char-idle    { animation: ao-char-idle 4s ease-in-out infinite; transform-origin: bottom center; }
  .ao-char-offline { animation: ao-char-offline 3s ease-in-out infinite; transform-origin: bottom center; }
  .ao-char-wake    { animation: ao-char-wake 1.4s ease-out forwards; transform-origin: bottom center; }

  /* ── Scout (alert, dual-monitor glancer) ── */
  @keyframes ao-scout-idle {
    0%,40%,100% { transform: translateX(0) translateY(0); }
    55%  { transform: translateX(-2px) translateY(-1px); }
    70%  { transform: translateX(-2px) translateY(-1px); }
    80%  { transform: translateX(2px) translateY(-1px); }
    90%  { transform: translateX(0) translateY(0); }
  }
  @keyframes ao-scout-active {
    0%,100% { transform: translateY(-2px) translateX(-1px); }
    30%     { transform: translateY(-3px) translateX(-2px); }
    60%     { transform: translateY(-2px) translateX(1px); }
  }
  @keyframes ao-scout-aha {
    0%   { transform: translateY(0) scale(1); }
    15%  { transform: translateY(-5px) scale(1.04); }
    35%  { transform: translateY(-4px) translateX(1px) scale(1.02); }
    60%  { transform: translateY(-3px); }
    100% { transform: translateY(-2px) translateX(-1px); }
  }
  @keyframes ao-scout-offline {
    0%,100% { transform: rotate(-4deg) translateY(1px); }
    50%     { transform: rotate(-2deg) translateY(0); }
  }
  @keyframes ao-scout-wake {
    0%   { transform: rotate(-4deg) translateY(3px); opacity:0.7; }
    20%  { transform: translateY(-5px) translateX(-2px); opacity:1; }
    45%  { transform: translateY(-4px) translateX(2px); }
    70%  { transform: translateY(-3px) translateX(-1px); }
    100% { transform: translateY(-2px) translateX(-1px); }
  }
  .ao-scout-idle    { animation: ao-scout-idle 5s ease-in-out infinite; transform-origin: bottom center; }
  .ao-scout-active  { animation: ao-scout-active 0.5s ease-in-out infinite; transform-origin: bottom center; }
  .ao-scout-aha     { animation: ao-scout-aha 1.8s ease-out forwards; transform-origin: bottom center; }
  .ao-scout-offline { animation: ao-scout-offline 3.5s ease-in-out infinite; transform-origin: bottom center; }
  .ao-scout-wake    { animation: ao-scout-wake 1.5s ease-out forwards; transform-origin: bottom center; }

  /* ── Quill (relaxed, thoughtful pauses) ── */
  @keyframes ao-quill-idle {
    0%,60%,100% { transform: translateY(0) rotate(0deg); }
    72%  { transform: translateY(-1px) rotate(1deg); }
    84%  { transform: translateY(-2px) rotate(1deg); }
    92%  { transform: translateY(-1px) rotate(0deg); }
  }
  @keyframes ao-quill-active {
    0%,100% { transform: translateY(-1px); }
    40%     { transform: translateY(-2px) rotate(1deg); }
    70%     { transform: translateY(-1px) rotate(-1deg); }
  }
  @keyframes ao-quill-process {
    0%,100% { transform: translateY(0) rotate(2deg); }
    50%     { transform: translateY(-3px) rotate(2deg); }
  }
  @keyframes ao-quill-offline {
    0%,100% { transform: rotate(-3deg) translateY(2px); }
    50%     { transform: rotate(-1deg) translateY(1px); }
  }
  @keyframes ao-quill-wake {
    0%   { transform: rotate(-3deg) translateY(3px); opacity:0.7; }
    30%  { transform: rotate(2deg) translateY(-3px); opacity:1; }
    55%  { transform: rotate(1deg) translateY(-2px); }
    80%  { transform: translateY(-1px); }
    100% { transform: translateY(0); }
  }
  .ao-quill-idle    { animation: ao-quill-idle 7s ease-in-out infinite; transform-origin: bottom center; }
  .ao-quill-active  { animation: ao-quill-active 0.9s ease-in-out infinite; transform-origin: bottom center; }
  .ao-quill-process { animation: ao-quill-process 3s ease-in-out infinite; transform-origin: bottom center; }
  .ao-quill-offline { animation: ao-quill-offline 4s ease-in-out infinite; transform-origin: bottom center; }
  .ao-quill-wake    { animation: ao-quill-wake 1.6s ease-out forwards; transform-origin: bottom center; }

  /* ── Meeting / boardroom transitions ── */
  @keyframes ao-stand-up {
    0%   { transform: translateY(0); opacity: 1; }
    25%  { transform: translateY(-6px) translateX(2px); }
    60%  { transform: translateY(-4px) translateX(8px); opacity: 0.6; }
    100% { transform: translateY(-2px) translateX(20px); opacity: 0; }
  }
  @keyframes ao-walk-in {
    0%   { transform: translateY(10px) translateX(-8px); opacity: 0; }
    35%  { transform: translateY(-3px) translateX(2px); opacity: 1; }
    55%  { transform: translateY(-2px); }
    75%  { transform: translateY(-1px); }
    100% { transform: translateY(0); opacity: 1; }
  }
  @keyframes ao-desk-away {
    0%,100% { opacity: 0.28; }
    50%     { opacity: 0.22; }
  }
  @keyframes ao-boardroom-pulse {
    0%,100% { box-shadow: 0 0 0 0 transparent; }
    50%     { box-shadow: 0 0 18px 4px rgba(100,120,255,0.18); }
  }
  .ao-stand-up    { animation: ao-stand-up  0.55s ease-in forwards; transform-origin: bottom center; }
  .ao-walk-in     { animation: ao-walk-in   0.5s  ease-out forwards; transform-origin: bottom center; }
  .ao-desk-away   { animation: ao-desk-away 3s    ease-in-out infinite; }

  /* ── Walk cycle (playing while position is transitioning) ── */
  @keyframes ao-walk {
    0%,100% { transform: translateX(-2px) rotate(-4deg); }
    25%     { transform: translateX(0)    rotate(0deg);   }
    50%     { transform: translateX(2px)  rotate(4deg);   }
    75%     { transform: translateX(0)    rotate(0deg);   }
  }
  .ao-walk { animation: ao-walk 0.25s ease-in-out infinite; transform-origin: bottom center; }

  /* ── Enhanced ambient life ── */
  @keyframes ao-lev-sip {
    0%,100% { transform: translateY(0); }
    20%  { transform: translateY(-3px) rotate(-8deg); }
    40%  { transform: translateY(-3px) rotate(-8deg); }
    55%  { transform: translateY(0) rotate(0deg); }
  }
  @keyframes ao-ambient-glance {
    0%,70%,100% { transform: translateX(0); }
    80%  { transform: translateX(-2px); }
    90%  { transform: translateX(2px); }
  }
  @keyframes ao-ambient-stretch {
    0%,100% { transform: translateY(0) scaleY(1); }
    40%  { transform: translateY(-4px) scaleY(1.05); }
    60%  { transform: translateY(-3px); }
  }
  .ao-lev-sip      { animation: ao-lev-sip      1.8s ease-in-out forwards; transform-origin: bottom center; }
  .ao-ambient-glance  { animation: ao-ambient-glance  6s ease-in-out infinite; transform-origin: bottom center; }
  .ao-ambient-stretch { animation: ao-ambient-stretch 12s ease-in-out infinite; transform-origin: bottom center; }

  .ao-canvas {
    position: relative;
    width: ${OW}px;
    height: ${OH}px;
    font-family: 'Courier New', Courier, monospace;
    image-rendering: pixelated;
    transform-origin: top left;
  }
  .ao-viewport {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #080a14;
  }

  .ao-desk {
    position: absolute;
    width: ${DESK_W}px;
    height: ${DESK_H}px;
    box-sizing: border-box;
    transition: box-shadow 0.6s ease;
  }
  .ao-speech {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(100% + 12px);
    width: 140px;
    background: #1c2128;
    outline: 2px solid #30363d;
    padding: 5px 7px;
    font-size: 9px;
    line-height: 1.4;
    color: #e6edf3;
    text-align: center;
    word-break: break-word;
    white-space: normal;
    pointer-events: none;
    z-index: 20;
  }
  .ao-speech-tail {
    position: absolute;
    bottom: -7px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
  }
`;

// ─── SVG helpers ─────────────────────────────────────────────────────────────

const R = (
  x: number, y: number, w: number, h: number,
  fill: string,
  extra?: React.SVGProps<SVGRectElement>
) => <rect x={x} y={y} width={w} height={h} fill={fill} {...extra} />;

// ─── Static Office SVG background ────────────────────────────────────────────

function OfficeBg() {
  return (
    <svg
      width={OW}
      height={OH}
      viewBox={`0 0 ${OW} ${OH}`}
      shapeRendering="crispEdges"
      style={{ display: "block", position: "absolute", top: 0, left: 0, imageRendering: "pixelated" }}
    >
      <defs>
        {/* Main open-office checkerboard tile (32×32) */}
        <pattern id="p-floor" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill="#1e2236"/>
          <rect width="16" height="16" fill="#1a1e30"/>
          <rect x="16" y="16" width="16" height="16" fill="#1a1e30"/>
          <rect x="0" y="0" width="1" height="32" fill="#232640" opacity="0.4"/>
          <rect x="0" y="0" width="32" height="1" fill="#232640" opacity="0.4"/>
        </pattern>
        {/* Think Tank carpet */}
        <pattern id="p-tt" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#161d14"/>
          <rect x="2" y="2" width="9" height="9" fill="#14191200"/>
          <rect x="0" y="0" width="12" height="12" fill="#141b12"/>
          <rect x="12" y="12" width="12" height="12" fill="#141b12"/>
          <rect x="0" y="0" width="1" height="24" fill="#1a2218" opacity="0.6"/>
          <rect x="0" y="0" width="24" height="1" fill="#1a2218" opacity="0.6"/>
        </pattern>
        {/* Meeting room carpet */}
        <pattern id="p-mr" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#14142a"/>
          <rect x="0" y="0" width="12" height="12" fill="#121228"/>
          <rect x="12" y="12" width="12" height="12" fill="#121228"/>
          <rect x="0" y="0" width="1" height="24" fill="#1a1a38" opacity="0.6"/>
          <rect x="0" y="0" width="24" height="1" fill="#1a1a38" opacity="0.6"/>
        </pattern>
        {/* Reception marble tiles */}
        <pattern id="p-rec" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="#1e1a10"/>
          <rect x="2" y="2" width="22" height="22" fill="#221c12"/>
          <rect x="26" y="26" width="22" height="22" fill="#221c12"/>
          <rect x="26" y="2" width="22" height="22" fill="#201a10"/>
          <rect x="2" y="26" width="22" height="22" fill="#201a10"/>
          <rect x="0" y="0" width="1" height="48" fill="#2a2416"/>
          <rect x="0" y="0" width="48" height="1" fill="#2a2416"/>
        </pattern>
        {/* Night-sky gradient for windows */}
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050814"/>
          <stop offset="100%" stopColor="#0e1a30"/>
        </linearGradient>
        {/* Warm ceiling glow */}
        <radialGradient id="g-glow" cx="50%" cy="0%" r="70%">
          <stop offset="0%" stopColor="#fff4c0" stopOpacity="0.07"/>
          <stop offset="100%" stopColor="#fff4c0" stopOpacity="0"/>
        </radialGradient>
        {/* Desk lamp glow */}
        <radialGradient id="g-lamp" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#fff8d0" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#fff8d0" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* ── FLOORS ── */}
      {R(0, TOP_WALL_H, OW, ROOM_BOTTOM - TOP_WALL_H, "url(#p-tt)")}
      {R(TT_RIGHT, TOP_WALL_H, MR_LEFT - TT_RIGHT, ROOM_BOTTOM - TOP_WALL_H, "url(#p-floor)")}
      {R(MR_LEFT, TOP_WALL_H, OW - MR_LEFT, ROOM_BOTTOM - TOP_WALL_H, "url(#p-mr)")}
      {R(0, OPEN_TOP, OW, OPEN_BOTTOM - OPEN_TOP, "url(#p-floor)")}
      {R(0, REC_TOP, OW, REC_BOTTOM - REC_TOP, "url(#p-rec)")}
      {/* Warm ambient light over full office */}
      {R(0, TOP_WALL_H, OW, OH - TOP_WALL_H, "url(#g-glow)")}

      {/* ── TOP WALL + WINDOWS ── */}
      {R(0, 0, OW, TOP_WALL_H, "#0c0e1c")}
      {/* Window panes */}
      {[56, 180, 340, 500, 640, 780].map((wx, i) => (
        <g key={i}>
          {/* Frame */}
          {R(wx, 3, 88, 26, "#0e1828")}
          {R(wx, 3, 88, 26, "none", { stroke: "#1e2e48", strokeWidth: 2 } as any)}
          {/* Sky */}
          {R(wx + 2, 5, 84, 22, "url(#g-sky)")}
          {/* Window cross divider */}
          {R(wx + 43, 5, 2, 22, "#1a2840")}
          {R(wx + 2, 15, 84, 2, "#1a2840")}
          {/* Building silhouettes */}
          {R(wx + 4,  12, 8,  10, "#0a0c18")}
          {R(wx + 14, 9,  12, 13, "#0a0c18")}
          {R(wx + 28, 13, 8,  9,  "#0a0c18")}
          {R(wx + 52, 8,  10, 14, "#0a0c18")}
          {R(wx + 64, 12, 14, 10, "#0a0c18")}
          {R(wx + 78, 10, 6,  12, "#0a0c18")}
          {/* Building windows (lit) */}
          <rect x={wx + 5}  y={14} width={2} height={2} fill="#ffe080" opacity="0.7"/>
          <rect x={wx + 9}  y={14} width={2} height={2} fill="#ffe080" opacity="0.5"/>
          <rect x={wx + 16} y={11} width={2} height={2} fill="#ffe080" opacity="0.8"/>
          <rect x={wx + 16} y={15} width={2} height={2} fill="#ffe080" opacity="0.4"/>
          <rect x={wx + 20} y={11} width={2} height={2} fill="#80c0ff" opacity="0.6"/>
          <rect x={wx + 53} y={10} width={2} height={2} fill="#ffe080" opacity="0.7"/>
          <rect x={wx + 57} y={14} width={2} height={2} fill="#ffe080" opacity="0.5"/>
          {/* Stars */}
          <rect x={wx + 38} y={7}  width={1} height={1} fill="#e0e8ff" style={{ animation: `ao-star-twinkle ${1.5 + i * 0.3}s ease-in-out infinite` }}/>
          <rect x={wx + 70} y={6}  width={1} height={1} fill="#e0e8ff" style={{ animation: `ao-star-twinkle ${2 + i * 0.2}s ease-in-out infinite` }}/>
          <rect x={wx + 25} y={8}  width={1} height={1} fill="#ffffff" opacity="0.7"/>
        </g>
      ))}

      {/* ── ROOM WALLS ── */}
      {/* Room row bottom divider */}
      {R(0, ROOM_BOTTOM, OW, 4, "#0c0e1c")}
      {/* Think Tank right wall */}
      {R(TT_RIGHT, TOP_WALL_H, 4, ROOM_BOTTOM - TOP_WALL_H, "#0c0e1c")}
      {/* Think Tank right wall glass panel */}
      {[48, 80, 112, 144].map(gy => R(TT_RIGHT + 1, TOP_WALL_H + gy, 2, 20, "#1a2838", { key: gy }))}
      {/* Meeting room left wall */}
      {R(MR_LEFT, TOP_WALL_H, 4, ROOM_BOTTOM - TOP_WALL_H, "#0c0e1c")}
      {[48, 80, 112, 144].map(gy => R(MR_LEFT + 1, TOP_WALL_H + gy, 2, 20, "#1a2838", { key: gy }))}
      {/* Left edge wall */}
      {R(0, 0, 4, OH, "#0c0e1c")}
      {/* Right edge wall */}
      {R(OW - 4, 0, 4, OH, "#0c0e1c")}

      {/* ── CEILING LIGHT STRIPS ── */}
      {R(4, OPEN_TOP, OW - 8, 4, "#2a2c40")}
      {/* Fluorescent tubes */}
      {[80, 240, 400, 560, 720, 850].map((lx, i) => (
        <g key={i}>
          {R(lx, OPEN_TOP + 1, 80, 2, "#fffad0", { opacity: 0.85 } as any)}
          {/* Glow below tube */}
          {R(lx - 20, OPEN_TOP + 3, 120, 60, "url(#g-glow)")}
        </g>
      ))}
      {/* Light flicker effect (subtle) */}
      {R(4, OPEN_TOP, OW - 8, 4, "#fff8c0", {
        opacity: 0.06,
        style: { animation: "ao-light-flicker 8s ease-in-out infinite" },
      } as any)}

      {/* ── THINK TANK ROOM ── */}
      {/* Room label strip */}
      {R(4, TOP_WALL_H, TT_RIGHT - 8, 8, "#0f1a0e")}
      <text x={TT_RIGHT / 2} y={TOP_WALL_H + 6} textAnchor="middle"
        fill="#2a5a28" fontSize="6" fontFamily="'Courier New', monospace" letterSpacing="2">
        THINK TANK
      </text>
      {/* Whiteboard on back wall */}
      {R(20, TOP_WALL_H + 10, 170, 90, "#dde0ea")}
      {R(20, TOP_WALL_H + 10, 170, 90, "none", { stroke: "#b0b4c4", strokeWidth: 2 } as any)}
      {/* Whiteboard frame */}
      {R(20, TOP_WALL_H + 10, 170, 4, "#a0a4b4")}
      {/* Whiteboard content */}
      <line x1="30" y1={TOP_WALL_H + 30} x2="130" y2={TOP_WALL_H + 30} stroke="#8090c0" strokeWidth="2"/>
      <line x1="30" y1={TOP_WALL_H + 42} x2="110" y2={TOP_WALL_H + 42} stroke="#8090c0" strokeWidth="2"/>
      <line x1="30" y1={TOP_WALL_H + 54} x2="140" y2={TOP_WALL_H + 54} stroke="#8090c0" strokeWidth="2"/>
      {/* Circle diagram */}
      <circle cx="170" cy={TOP_WALL_H + 55} r="20" fill="none" stroke="#5060e0" strokeWidth="2"/>
      <line x1="150" y1={TOP_WALL_H + 55} x2="190" y2={TOP_WALL_H + 55} stroke="#5060e0" strokeWidth="1"/>
      <line x1="170" y1={TOP_WALL_H + 35} x2="170" y2={TOP_WALL_H + 75} stroke="#5060e0" strokeWidth="1"/>
      {/* Arrow on whiteboard */}
      <line x1="60" y1={TOP_WALL_H + 70} x2="100" y2={TOP_WALL_H + 70} stroke="#e05050" strokeWidth="2"/>
      <polygon points={`100,${TOP_WALL_H + 66} 100,${TOP_WALL_H + 74} 108,${TOP_WALL_H + 70}`} fill="#e05050"/>
      {/* Whiteboard tray */}
      {R(20, TOP_WALL_H + 98, 170, 4, "#a0a4b4")}
      {/* Marker holders */}
      {[28, 36, 44].map(mx => R(mx, TOP_WALL_H + 99, 4, 6, "#e05050", { key: mx }))}
      {/* Think Tank bean bags */}
      {[[30, 148], [70, 162], [110, 150], [160, 158]].map(([bx, by], i) => (
        <g key={i}>
          <ellipse cx={bx} cy={by} rx={14} ry={10} fill={["#3a2060","#1a4060","#3a3000","#1a3a20"][i]}/>
          <ellipse cx={bx - 2} cy={by - 2} rx={10} ry={7} fill={["#5a3090","#2a6090","#5a4800","#2a5a30"][i]} opacity="0.7"/>
        </g>
      ))}
      {/* Plant in TT corner */}
      <ellipse cx="254" cy={ROOM_BOTTOM - 12} rx={16} ry={10} fill="#1a3018"/>
      {R(251, ROOM_BOTTOM - 30, 6, 20, "#1a2c18")}
      <ellipse cx="248" cy={ROOM_BOTTOM - 36} rx={14} ry={18} fill="#1e3c1a"/>
      <ellipse cx="260" cy={ROOM_BOTTOM - 40} rx={12} ry={16} fill="#234520"/>
      <ellipse cx="242" cy={ROOM_BOTTOM - 44} rx={10} ry={14} fill="#1e3c1a"/>
      <ellipse cx="254" cy={ROOM_BOTTOM - 50} rx={8} ry={12} fill="#274a24"/>

      {/* ── BOARDROOM (top-centre corridor) ── */}
      {/* Subtle navy tint over the centre floor */}
      {R(TT_RIGHT + 4, TOP_WALL_H, MR_LEFT - TT_RIGHT - 8, ROOM_BOTTOM - TOP_WALL_H, "#09091a", { opacity: 0.55 } as any)}
      {/* Room label strip */}
      {R(TT_RIGHT + 4, TOP_WALL_H, MR_LEFT - TT_RIGHT - 8, 8, "#0a0a1e")}
      <text x={BR_CX} y={TOP_WALL_H + 6} textAnchor="middle"
        fill="#22224a" fontSize="6" fontFamily="'Courier New', monospace" letterSpacing="3">
        BOARDROOM
      </text>
      {/* Projector screen on back wall (centred, above table) */}
      {R(BR_CX - 60, TOP_WALL_H + 10, 120, 52, "#e4e8f4")}
      {R(BR_CX - 60, TOP_WALL_H + 10, 120, 52, "none", { stroke: "#c0c4d4", strokeWidth: 2 } as any)}
      {R(BR_CX - 60, TOP_WALL_H + 10, 120, 3,  "#a0a4b4")}
      {/* Screen content */}
      {R(BR_CX - 56, TOP_WALL_H + 16, 110, 7, "#c8d0f0")}
      <text x={BR_CX} y={TOP_WALL_H + 23} textAnchor="middle"
        fill="#404880" fontSize="5" fontFamily="'Courier New', monospace">STRATEGY REVIEW</text>
      {[[BR_CX-52,TOP_WALL_H+28,90,3],[BR_CX-52,TOP_WALL_H+34,70,3],
        [BR_CX-52,TOP_WALL_H+40,100,3],[BR_CX-52,TOP_WALL_H+46,55,3]].map(([rx,ry,rw,rh],i) =>
        <rect key={i} x={rx} y={ry} width={rw} height={rh} fill="#8090c0" opacity="0.45"/>
      )}
      {/* Conference table — rounded rectangle */}
      {R(BR_TABLE_X,     BR_TABLE_Y,     BR_TABLE_W,     BR_TABLE_H,     "#2a1e10")}
      {R(BR_TABLE_X + 4, BR_TABLE_Y + 4, BR_TABLE_W - 8, BR_TABLE_H - 8, "#321e08")}
      {R(BR_TABLE_X + 4, BR_TABLE_Y + 4, BR_TABLE_W - 8, 3,              "#4a3018")}
      {/* Table grain lines */}
      {[0,1,2,3].map(i =>
        R(BR_TABLE_X + 8, BR_TABLE_Y + 10 + i * 18, BR_TABLE_W - 16, 1, "#3a2808", { key: i, opacity: 0.5 } as any)
      )}
      {/* Notepads on table */}
      {[BR_TABLE_X+16, BR_TABLE_X+68, BR_TABLE_X+124, BR_TABLE_X+178].map((nx, i) => (
        <g key={i}>
          {R(nx, BR_TABLE_Y + 24, 16, 12, "#e8e4d0")}
          {R(nx, BR_TABLE_Y + 24, 16,  2, "#d0ccc0")}
          <line x1={nx+2} y1={BR_TABLE_Y+30} x2={nx+12} y2={BR_TABLE_Y+30} stroke="#a0a090" strokeWidth="1"/>
          <line x1={nx+2} y1={BR_TABLE_Y+33} x2={nx+ 9} y2={BR_TABLE_Y+33} stroke="#a0a090" strokeWidth="1"/>
        </g>
      ))}
      {/* Coffee mugs */}
      {[BR_TABLE_X+50, BR_TABLE_X+154, BR_TABLE_X+214].map((mx, i) => (
        <g key={i}>
          {R(mx, BR_TABLE_Y + 20, 8, 9, "#2a1a0a")}
          {R(mx + 1, BR_TABLE_Y + 22, 6, 5, "#6b2f0a", { opacity: 0.9 } as any)}
        </g>
      ))}
      {/* SVG chair silhouettes — north side (agents sit above) */}
      {[BR_TABLE_X + 42, BR_TABLE_X + 126, BR_TABLE_X + 210].map((cx, i) => (
        <g key={i}>
          {R(cx - 2, BR_TABLE_Y - 12, 24, 8,  "#1a1e38")}
          {R(cx,     BR_TABLE_Y - 10, 20, 6,  "#22263e")}
          {R(cx + 6, BR_TABLE_Y - 4,  8,  4,  "#1a1e38")}
        </g>
      ))}
      {/* Chair west head (Lev's seat) */}
      {R(BR_TABLE_X - 14, BR_TABLE_Y + 30, 8, 24, "#1a1e38")}
      {R(BR_TABLE_X - 12, BR_TABLE_Y + 32, 4, 20, "#22263e")}
      {/* Chair east head */}
      {R(BR_TABLE_X + BR_TABLE_W + 6, BR_TABLE_Y + 30, 8, 24, "#1a1e38")}
      {R(BR_TABLE_X + BR_TABLE_W + 8, BR_TABLE_Y + 32, 4, 20, "#22263e")}
      {/* "LEV" seat marker on west chair */}
      <text x={BR_TABLE_X - 14} y={BR_TABLE_Y + 28} fontSize="5"
        fill="#1e2050" fontFamily="'Courier New', monospace" letterSpacing="1">HOST</text>

      {/* ── MEETING ROOM (right) ── */}
      {/* Room label strip */}
      {R(MR_LEFT + 4, TOP_WALL_H, OW - MR_LEFT - 8, 8, "#0c0c1e")}
      <text x={MR_LEFT + (OW - MR_LEFT) / 2} y={TOP_WALL_H + 6} textAnchor="middle"
        fill="#22224a" fontSize="6" fontFamily="'Courier New', monospace" letterSpacing="2">
        MEETING ROOM
      </text>
      {/* Conference table */}
      {R(696, TOP_WALL_H + 28, 242, 114, "#2a1e10")}
      {R(700, TOP_WALL_H + 32, 234, 106, "#321e08")}
      {R(700, TOP_WALL_H + 32, 234, 4, "#4a3018")}  {/* table edge highlight */}
      {/* Table surface details */}
      {R(704, TOP_WALL_H + 38, 226, 2, "#3a2808", { opacity: 0.6 } as any)}
      {R(704, TOP_WALL_H + 42, 180, 2, "#3a2808", { opacity: 0.4 } as any)}
      {/* Notepads on table */}
      {[710, 760, 810, 860, 890].map((nx, i) => (
        <g key={i}>
          {R(nx, TOP_WALL_H + 50, 18, 14, "#e8e4d0")}
          {R(nx, TOP_WALL_H + 50, 18, 2, "#d0ccc0")}
          <line x1={nx+2} y1={TOP_WALL_H+56} x2={nx+14} y2={TOP_WALL_H+56} stroke="#a0a090" strokeWidth="1"/>
          <line x1={nx+2} y1={TOP_WALL_H+59} x2={nx+10} y2={TOP_WALL_H+59} stroke="#a0a090" strokeWidth="1"/>
        </g>
      ))}
      {/* Chairs — top side */}
      {[706, 748, 790, 832, 874].map(cx => (
        <g key={cx}>
          {R(cx, TOP_WALL_H + 18, 26, 10, "#1a1e38")}
          {R(cx + 2, TOP_WALL_H + 18, 22, 8, "#22263e")}
          {R(cx + 8, TOP_WALL_H + 26, 10, 6, "#1a1e38")}
        </g>
      ))}
      {/* Chairs — bottom side */}
      {[706, 748, 790, 832, 874].map(cx => (
        <g key={cx}>
          {R(cx, ROOM_BOTTOM - 28, 26, 10, "#1a1e38")}
          {R(cx + 2, ROOM_BOTTOM - 26, 22, 8, "#22263e")}
          {R(cx + 8, ROOM_BOTTOM - 36, 10, 8, "#1a1e38")}
        </g>
      ))}
      {/* Chair left side */}
      {R(684, TOP_WALL_H + 80, 10, 26, "#1a1e38")}
      {R(686, TOP_WALL_H + 82, 8, 22, "#22263e")}
      {/* Projector screen on back wall */}
      {R(MR_LEFT + 16, TOP_WALL_H + 10, 150, 80, "#e4e8f0")}
      {R(MR_LEFT + 16, TOP_WALL_H + 10, 150, 80, "none", { stroke: "#c0c4d0", strokeWidth: 2 } as any)}
      {R(MR_LEFT + 16, TOP_WALL_H + 10, 150, 4, "#a0a4b4")}
      {/* Projected content */}
      {R(MR_LEFT + 20, TOP_WALL_H + 18, 140, 8, "#c8d0f0")}
      <text x={MR_LEFT + 90} y={TOP_WALL_H + 26} textAnchor="middle"
        fill="#404880" fontSize="6" fontFamily="'Courier New', monospace">ROADMAP Q2 2026</text>
      {[[MR_LEFT+24, TOP_WALL_H+32,100,4],[MR_LEFT+24,TOP_WALL_H+40,80,4],
        [MR_LEFT+24,TOP_WALL_H+48,120,4],[MR_LEFT+24,TOP_WALL_H+56,60,4]].map(([rx,ry,rw,rh],i) =>
        <rect key={i} x={rx} y={ry} width={rw} height={rh} fill="#8090c0" opacity="0.5"/>
      )}
      {/* Plant in meeting room corner */}
      <ellipse cx={OW - 22} cy={ROOM_BOTTOM - 14} rx={14} ry={9} fill="#1a3018"/>
      {R(OW - 25, ROOM_BOTTOM - 32, 6, 20, "#1a2c18")}
      <ellipse cx={OW - 24} cy={ROOM_BOTTOM - 42} rx={16} ry={20} fill="#1e3c1a"/>
      <ellipse cx={OW - 14} cy={ROOM_BOTTOM - 46} rx={12} ry={16} fill="#234520"/>

      {/* ── OPEN OFFICE FURNISHINGS ── */}
      {/* Filing cabinets — left wall */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          {R(6, OPEN_TOP + 40 + i * 60, 28, 52, "#1a1e2c")}
          {R(6, OPEN_TOP + 40 + i * 60, 28, 52, "none", { stroke: "#2a2e40", strokeWidth: 1 } as any)}
          {R(7, OPEN_TOP + 55 + i * 60, 26, 2, "#2a2e40")}
          {R(7, OPEN_TOP + 68 + i * 60, 26, 2, "#2a2e40")}
          {R(7, OPEN_TOP + 81 + i * 60, 26, 2, "#2a2e40")}
          {/* Handle */}
          <rect x={18} y={OPEN_TOP + 58 + i * 60} width={6} height={2} fill="#3a3e52" rx="1"/>
          <rect x={18} y={OPEN_TOP + 71 + i * 60} width={6} height={2} fill="#3a3e52" rx="1"/>
        </g>
      ))}
      {/* Bookshelf — right wall */}
      {R(OW - 32, OPEN_TOP + 40, 28, 140, "#241a10")}
      {R(OW - 32, OPEN_TOP + 40, 28, 2, "#3a2818")}
      {/* Shelf dividers */}
      {[0, 1, 2, 3].map(i => R(OW - 32, OPEN_TOP + 72 + i * 34, 28, 2, "#3a2818", { key: i }))}
      {/* Books (colored spines) */}
      {[["#e05050","#5080e0","#50a060","#d0a020","#8050c0","#e08020"],
        ["#50c0e0","#e06060","#4060c0","#60b060","#c04040"],
        ["#a050d0","#e0a030","#4080c0","#d06060","#50b070"],
        ["#d04040","#5090d0","#40a058","#c09020","#7040b0"]
      ].map((row, ri) =>
        row.map((color, ci) => (
          <rect key={`${ri}-${ci}`} x={OW - 30 + ci * (ci < 3 ? 4 : 3)} y={OPEN_TOP + 44 + ri * 34}
            width={3} height={25} fill={color} opacity="0.7"/>
        ))
      )}
      {/* Wall clock (right wall, above bookshelf) */}
      <circle cx={OW - 18} cy={OPEN_TOP + 22} r={14} fill="#1c1c28" stroke="#30363d" strokeWidth="2"/>
      <circle cx={OW - 18} cy={OPEN_TOP + 22} r={11} fill="#161620"/>
      <circle cx={OW - 18} cy={OPEN_TOP + 22} r={1.5} fill="#e6edf3"/>
      {/* Clock hour markers */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => {
        const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
        const r1 = 9, r2 = 10.5;
        return <line key={h}
          x1={OW - 18 + Math.cos(a) * r1} y1={OPEN_TOP + 22 + Math.sin(a) * r1}
          x2={OW - 18 + Math.cos(a) * r2} y2={OPEN_TOP + 22 + Math.sin(a) * r2}
          stroke="#3a3a50" strokeWidth="1.5"/>;
      })}
      {/* Hour hand ~10 o'clock */}
      <line x1={OW - 18} y1={OPEN_TOP + 22}
        x2={OW - 18 + Math.cos(-2.1) * 6} y2={OPEN_TOP + 22 + Math.sin(-2.1) * 6}
        stroke="#e6edf3" strokeWidth="1.5"/>
      {/* Minute hand ~2 o'clock */}
      <line x1={OW - 18} y1={OPEN_TOP + 22}
        x2={OW - 18 + Math.cos(0.7) * 8} y2={OPEN_TOP + 22 + Math.sin(0.7) * 8}
        stroke="#888" strokeWidth="1"/>
      {/* Corner plants */}
      {/* Bottom-left plant */}
      <ellipse cx={20} cy={OPEN_BOTTOM - 10} rx={14} ry={9} fill="#1a3018"/>
      {R(17, OPEN_BOTTOM - 28, 6, 20, "#1a2c18")}
      <ellipse cx={16} cy={OPEN_BOTTOM - 36} rx={13} ry={16} fill="#1e3c1a"/>
      <ellipse cx={26} cy={OPEN_BOTTOM - 40} rx={11} ry={14} fill="#234520"/>
      {/* Bottom-right plant */}
      <ellipse cx={OW - 20} cy={OPEN_BOTTOM - 10} rx={14} ry={9} fill="#1a3018"/>
      {R(OW - 23, OPEN_BOTTOM - 28, 6, 20, "#1a2c18")}
      <ellipse cx={OW - 24} cy={OPEN_BOTTOM - 36} rx={13} ry={16} fill="#1e3c1a"/>
      <ellipse cx={OW - 14} cy={OPEN_BOTTOM - 40} rx={11} ry={14} fill="#234520"/>

      {/* ── OPEN OFFICE / ROOM DIVIDER TRIM ── */}
      {R(4, ROOM_BOTTOM, TT_RIGHT - 4, 4, "#111428")}
      {R(MR_LEFT, ROOM_BOTTOM, OW - MR_LEFT - 4, 4, "#111428")}
      {R(TT_RIGHT + 4, ROOM_BOTTOM, MR_LEFT - TT_RIGHT - 4, 4, "#1a1e2c")}
      {/* Section label */}
      <text x={OW / 2} y={OPEN_TOP + 14} textAnchor="middle"
        fill="#2a2e4a" fontSize="6" fontFamily="'Courier New', monospace" letterSpacing="3">
        ▸ OPEN FLOOR — AI OPERATIONS
      </text>

      {/* ── RECEPTION AREA ── */}
      {R(0, OPEN_BOTTOM, OW, 4, "#0c0e1c")}
      {R(0, REC_BOTTOM, OW, 4, "#0c0e1c")}
      {/* Reception counter */}
      {R(280, REC_TOP + 12, 400, 44, "#2e2010")}
      {R(280, REC_TOP + 12, 400, 4,  "#4a3418")}  {/* counter top edge */}
      {R(284, REC_TOP + 16, 392, 36, "#38280c")}  {/* counter surface */}
      {/* Reception desk decorations */}
      {R(296, REC_TOP + 18, 40, 24, "#2a2010")}  {/* left panel */}
      {R(624, REC_TOP + 18, 40, 24, "#2a2010")}  {/* right panel */}
      {/* SS Logo text on counter */}
      <text x="480" y={REC_TOP + 33} textAnchor="middle"
        fill="#f97316" fontSize="10" fontFamily="'Courier New', monospace" fontWeight="bold" letterSpacing="3">
        STAY SOCIAL HUB
      </text>
      <text x="480" y={REC_TOP + 44} textAnchor="middle"
        fill="#5a3a10" fontSize="6" fontFamily="'Courier New', monospace" letterSpacing="4">
        AI OPERATIONS
      </text>
      {/* Entrance mat */}
      {R(380, REC_BOTTOM + 4, 200, 22, "#161410")}
      {R(382, REC_BOTTOM + 6, 196, 18, "#1a1a14")}
      <text x="480" y={REC_BOTTOM + 18} textAnchor="middle"
        fill="#2a2820" fontSize="6" fontFamily="'Courier New', monospace" letterSpacing="2">
        WELCOME
      </text>
    </svg>
  );
}

// ─── Character helpers ────────────────────────────────────────────────────────

function isLevAgent(agent: AgentData) {
  return (
    agent.name?.toLowerCase() === "lev" ||
    agent.id?.toLowerCase().startsWith("lev")
  );
}
function isTeamContext(agent: AgentData) {
  return (
    agent.id?.toLowerCase().includes("team") ||
    agent.id?.toLowerCase().includes("telegram") ||
    agent.role?.toLowerCase().includes("team")
  );
}
function isScoutAgent(agent: AgentData) {
  return (
    agent.name?.toLowerCase() === "scout" ||
    agent.id?.toLowerCase().startsWith("scout")
  );
}
function isQuillAgent(agent: AgentData) {
  return (
    agent.name?.toLowerCase() === "quill" ||
    agent.id?.toLowerCase().startsWith("quill")
  );
}

// ─── Lev's pixel art character (3/4 view, P=3, 11×10 grid = 33×30px) ─────────

const LEV_HAIR   = "#3a1800";
const LEV_HAIR_H = "#6b3a10";
const LEV_HAIR_D = "#260e00";
const LEV_SKIN   = "#c8906a";
const LEV_SKIN_D = "#a87050";
const LEV_SKIN_L = "#daa880";
const LEV_EYE    = "#1e0800";
const LEV_NAVY   = "#1e2d3d";
const LEV_NAVY_L = "#2e4050";
const LEV_NAVY_D = "#141e28";
const LEV_AMBER  = "#d4822a";
const LEV_TEAM_A = "#ff6c00";

function LevCharacter({
  animClass,
  isTeam,
}: {
  animClass: string;
  isTeam: boolean;
}) {
  const P = 3;
  const W = 11 * P, H = 10 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x * P} y={y * P} width={w * P} height={h * P} fill={fill} />
  );
  const A = isTeam ? LEV_TEAM_A : LEV_AMBER;

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block", overflow: "visible" }}
      className={animClass}
    >
      {/* ── Hair ── */}
      {r(2, 0, 6, 1, LEV_HAIR_D)}
      {r(1, 1, 9, 2, LEV_HAIR)}
      {r(3, 1, 2, 1, LEV_HAIR_H)}
      {r(6, 1, 2, 1, LEV_HAIR_H)}
      {r(1, 2, 1, 1, LEV_HAIR_D)}
      {r(9, 2, 1, 1, LEV_HAIR_D)}

      {/* ── Face ── */}
      {r(2, 3, 7, 1, LEV_SKIN_D)}   {/* forehead shadow */}
      {r(2, 4, 7, 3, LEV_SKIN)}     {/* face body */}
      {r(2, 3, 7, 1, LEV_SKIN)}     {/* forehead */}
      {r(3, 5, 5, 1, LEV_SKIN_L)}   {/* cheeks highlight */}

      {/* Eyes */}
      {r(3, 4, 2, 1, LEV_EYE)}
      {r(6, 4, 2, 1, LEV_EYE)}
      <rect x={3 * P + 1} y={4 * P + 1} width={1} height={1} fill="#fff" />
      <rect x={6 * P + 1} y={4 * P + 1} width={1} height={1} fill="#fff" />

      {/* Mouth — subtle smirk */}
      {r(4, 6, 1, 1, LEV_SKIN_D)}
      {r(5, 6, 2, 1, LEV_SKIN_D)}

      {/* Chin */}
      {r(3, 7, 5, 1, LEV_SKIN_D)}

      {/* ── Neck ── */}
      {r(4, 8, 3, 1, LEV_SKIN)}
      {/* Amber collar pips */}
      {r(3, 8, 1, 1, A)}
      {r(7, 8, 1, 1, A)}

      {/* ── Shirt / shoulders ── */}
      {r(1, 9, 9, 1, LEV_NAVY_L)}   {/* shoulder highlight */}
      {r(1, 9, 1, 1, LEV_NAVY_D)}   {/* left shadow */}
      {r(9, 9, 1, 1, LEV_NAVY_D)}   {/* right shadow */}

      {/* Amber badge — right chest */}
      <rect x={7 * P} y={9 * P + 1} width={P} height={P - 1} fill={A} />

      {/* Team indicator dot — left shoulder */}
      {isTeam && (
        <rect x={2 * P} y={9 * P + 1} width={3} height={3} fill={LEV_TEAM_A} />
      )}
    </svg>
  );
}

// ─── Generic agent character (P=3, 11×8) ─────────────────────────────────────

function GenericCharacter({
  status,
  animClass,
}: {
  status: keyof typeof STATUS_CFG;
  animClass: string;
}) {
  const cfg = STATUS_CFG[status];
  const P = 3;
  const W = 11 * P, H = 8 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x * P} y={y * P} width={w * P} height={h * P} fill={fill} />
  );
  const SKIN = "#c8906a", SKIN_D = "#a87050";
  const EYE  = "#1e0800";
  const HAIR = "#2a1400";

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
      className={animClass}
    >
      {r(2, 0, 7, 2, HAIR)}
      {r(2, 2, 7, 3, SKIN)}
      {r(3, 3, 1, 1, EYE)}
      {r(7, 3, 1, 1, EYE)}
      <rect x={3 * P + 1} y={3 * P + 1} width={1} height={1} fill="#fff" />
      <rect x={7 * P + 1} y={3 * P + 1} width={1} height={1} fill="#fff" />
      {r(3, 5, 5, 1, SKIN_D)}
      {r(4, 6, 3, 1, SKIN)}
      {r(1, 7, 9, 1, cfg.bodyFill)}
      {r(4, 7, 3, 1, cfg.headFill)}
    </svg>
  );
}

// ─── Scout character (alert researcher, P=3, 11×10) ──────────────────────────

const SC_HAIR  = "#1a1a2a";
const SC_HAIR_H= "#2e2e4a";
const SC_SKIN  = "#c8906a";
const SC_SKIN_D= "#a87050";
const SC_GREEN = "#2e6b3e";
const SC_GREEN_L="#3d8a52";
const SC_GREEN_D="#1e4a2a";
const SC_CREAM = "#e8dfc0";
const SC_EYE   = "#1e0800";

function ScoutCharacter({ animClass }: { animClass: string }) {
  const P = 3;
  const W = 11 * P, H = 10 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x * P} y={y * P} width={w * P} height={h * P} fill={fill} />
  );
  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
      className={animClass}
    >
      {/* Hair — short dark, slight side part */}
      {r(2, 0, 7, 1, SC_HAIR)}
      {r(1, 1, 9, 1, SC_HAIR)}
      {r(2, 2, 7, 1, SC_HAIR)}
      {r(3, 1, 1, 2, SC_HAIR_H)}  {/* part highlight */}

      {/* Face */}
      {r(2, 2, 7, 3, SC_SKIN)}
      {r(2, 2, 1, 3, SC_SKIN_D)}  {/* left cheek shadow */}
      {r(8, 2, 1, 3, SC_SKIN_D)}  {/* right cheek shadow */}

      {/* Eyes — wide, alert */}
      {r(3, 3, 1, 1, SC_EYE)}
      {r(7, 3, 1, 1, SC_EYE)}
      <rect x={3 * P + 1} y={3 * P + 1} width={1} height={1} fill="#fff" />
      <rect x={7 * P + 1} y={3 * P + 1} width={1} height={1} fill="#fff" />

      {/* Neck */}
      {r(4, 5, 3, 1, SC_SKIN_D)}
      {r(4, 6, 3, 1, SC_SKIN)}

      {/* Hoodie body — forest green */}
      {r(1, 7, 9, 3, SC_GREEN)}
      {r(1, 7, 1, 3, SC_GREEN_D)}   {/* left shadow */}
      {r(9, 7, 1, 3, SC_GREEN_D)}   {/* right shadow */}
      {r(2, 7, 7, 1, SC_GREEN_L)}   {/* shoulder highlight */}

      {/* Hoodie pocket seam */}
      {r(4, 8, 3, 2, SC_GREEN_D)}
      {r(4, 8, 3, 1, SC_GREEN)}

      {/* Cream collar */}
      {r(4, 7, 3, 1, SC_CREAM)}
    </svg>
  );
}

// ─── Quill character (thoughtful writer, P=3, 11×10) ─────────────────────────

const QL_HAIR  = "#8b3a1a";
const QL_HAIR_H= "#c05020";
const QL_HAIR_D= "#5a1e08";
const QL_SKIN  = "#d4a06a";
const QL_SKIN_D= "#b07848";
const QL_SKIN_L= "#e0b888";
const QL_EYE   = "#1e0800";
const QL_BURG  = "#7a1a2e";
const QL_BURG_L= "#962030";
const QL_BURG_D= "#4e0e1e";
const QL_CREAM = "#e8dfc0";

function QuillCharacter({ animClass }: { animClass: string }) {
  const P = 3;
  const W = 11 * P, H = 10 * P;
  const r = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x * P} y={y * P} width={w * P} height={h * P} fill={fill} />
  );
  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
      className={animClass}
    >
      {/* Auburn hair — slightly longer on sides */}
      {r(2, 0, 7, 1, QL_HAIR)}
      {r(1, 1, 9, 2, QL_HAIR)}
      {r(2, 2, 1, 2, QL_HAIR)}   {/* left side hair */}
      {r(8, 2, 1, 2, QL_HAIR)}   {/* right side hair */}
      {r(4, 0, 3, 1, QL_HAIR_H)} {/* top highlight */}
      {r(1, 1, 1, 1, QL_HAIR_D)} {/* left deep shadow */}
      {r(9, 1, 1, 1, QL_HAIR_D)} {/* right deep shadow */}

      {/* Face — warm skin */}
      {r(2, 2, 7, 3, QL_SKIN)}
      {r(2, 2, 1, 2, QL_SKIN_D)}  {/* left shadow */}
      {r(8, 2, 1, 2, QL_SKIN_D)}  {/* right shadow */}
      {r(4, 2, 3, 1, QL_SKIN_L)}  {/* forehead highlight */}

      {/* Eyes — thoughtful, slightly downcast */}
      {r(3, 3, 1, 1, QL_EYE)}
      {r(7, 3, 1, 1, QL_EYE)}
      <rect x={3 * P + 1} y={3 * P + 1} width={1} height={1} fill="#fff" />
      <rect x={7 * P + 1} y={3 * P + 1} width={1} height={1} fill="#fff" />

      {/* Neck */}
      {r(4, 5, 3, 1, QL_SKIN_D)}
      {r(4, 6, 3, 1, QL_SKIN)}

      {/* Burgundy top */}
      {r(1, 7, 9, 3, QL_BURG)}
      {r(1, 7, 1, 3, QL_BURG_D)}  {/* left shadow */}
      {r(9, 7, 1, 3, QL_BURG_D)}  {/* right shadow */}
      {r(2, 7, 7, 1, QL_BURG_L)}  {/* shoulder highlight */}

      {/* Cream collar accent */}
      {r(4, 7, 3, 1, QL_CREAM)}
      {r(5, 7, 1, 2, QL_CREAM)}   {/* collar V */}
    </svg>
  );
}

// ─── Character dispatcher ─────────────────────────────────────────────────────

function AgentCharacter({
  agent,
  status,
  waking,
  extraClass,
}: {
  agent: AgentData;
  status: keyof typeof STATUS_CFG;
  waking: boolean;
  extraClass?: string;
}) {
  if (isLevAgent(agent)) {
    let cls = "ao-lev-idle";
    if (waking)                       cls = "ao-lev-wake";
    else if (status === "active")      cls = "ao-lev-active";
    else if (status === "processing")  cls = "ao-lev-process";
    else if (status === "offline")     cls = "ao-lev-offline";
    return <LevCharacter animClass={extraClass ?? cls} isTeam={isTeamContext(agent)} />;
  }
  if (isScoutAgent(agent)) {
    let cls = "ao-scout-idle";
    if (waking)                       cls = "ao-scout-wake";
    else if (status === "active")      cls = "ao-scout-active";
    else if (status === "processing")  cls = "ao-scout-aha";
    else if (status === "offline")     cls = "ao-scout-offline";
    return <ScoutCharacter animClass={extraClass ?? cls} />;
  }
  if (isQuillAgent(agent)) {
    let cls = "ao-quill-idle";
    if (waking)                       cls = "ao-quill-wake";
    else if (status === "active")      cls = "ao-quill-active";
    else if (status === "processing")  cls = "ao-quill-process";
    else if (status === "offline")     cls = "ao-quill-offline";
    return <QuillCharacter animClass={extraClass ?? cls} />;
  }
  let cls = "ao-char-idle";
  if (waking)                       cls = "ao-char-wake";
  else if (status === "active")      cls = "ao-char-active";
  else if (status === "processing")  cls = "ao-char-process";
  else if (status === "offline")     cls = "ao-char-offline";
  return <GenericCharacter status={status} animClass={extraClass ?? cls} />;
}

// ─── Document prop (Lev reviewing docs when offline) ─────────────────────────

function DocProp() {
  return (
    <div style={{
      position: "absolute",
      bottom: 2,
      right: 4,
      animation: "ao-doc-float 3s ease-in-out infinite",
      pointerEvents: "none",
    }}>
      <svg width={16} height={20} viewBox="0 0 16 20" shapeRendering="crispEdges"
        style={{ imageRendering: "pixelated", display: "block" }}>
        <rect x={1} y={1} width={15} height={19} fill="#101018" opacity="0.5" />
        <rect x={0} y={0} width={14} height={19} fill="#e4e8f0" />
        <rect x={11} y={0} width={3} height={3} fill="#c0c4d4" />
        <rect x={11} y={0} width={1} height={3} fill="#e4e8f0" />
        <rect x={11} y={0} width={3} height={1} fill="#e4e8f0" />
        {[3, 6, 9, 12, 15].map((y, i) => (
          <rect key={i} x={2} y={y} width={i === 2 ? 8 : 10} height={1} fill="#8888a0" opacity="0.8" />
        ))}
        <rect x={2} y={9} width={10} height={2} fill={LEV_AMBER} opacity="0.22" />
      </svg>
    </div>
  );
}

// ─── Enhanced monitor ─────────────────────────────────────────────────────────

function AgentMonitor({
  status,
  lev,
}: {
  status: keyof typeof STATUS_CFG;
  lev: boolean;
}) {
  const cfg = STATUS_CFG[status];
  const glowColor = lev
    ? status === "active"     ? "rgba(80,140,255,0.40)"
    : status === "processing" ? "rgba(212,130,42,0.32)"
    : status === "idle"       ? "rgba(56,139,253,0.14)"
    :                           "transparent"
    : cfg.glowColor;

  return (
    <div style={{ position: "relative" }}>
      {/* Screen bloom behind monitor */}
      {status !== "offline" && (
        <div style={{
          position: "absolute", inset: -5,
          background: `radial-gradient(ellipse at 50% 50%, ${glowColor} 0%, transparent 70%)`,
          pointerEvents: "none",
          animation: status === "active" ? "ao-monitor-glow 1.5s ease-in-out infinite" : "none",
        }} />
      )}
      <div style={{
        width: 44, height: 28,
        background: "#161b22",
        outline: `2px solid ${status !== "offline" ? cfg.border : "#21262d"}`,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          margin: 2,
          background: cfg.screenBg,
          height: "calc(100% - 4px)",
          position: "relative",
          overflow: "hidden",
        }}>
          {status === "active" && (
            <>
              {[2, 6, 10, 14, 18].map((top, i) => (
                <div key={i} style={{
                  position: "absolute", top, left: 2,
                  width: `${42 + i * 7}%`, height: 2,
                  background: cfg.screenLine, opacity: 0.8 - i * 0.12,
                }} />
              ))}
              <div style={{
                position: "absolute", bottom: 2, left: 2,
                width: 2, height: 3,
                background: cfg.screenLine,
                animation: "ao-blink-cursor 0.7s step-end infinite",
              }} />
            </>
          )}
          {status === "processing" && (
            <>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: cfg.screenLine, opacity: 0.7,
                animation: "ao-scan 1.0s linear infinite",
              }} />
              {lev && (
                <div style={{
                  position: "absolute", bottom: 2, left: 2, right: 2, height: 2,
                  background: LEV_AMBER, opacity: 0.35,
                }} />
              )}
            </>
          )}
          {status === "idle" && (
            <div style={{
              position: "absolute", inset: 0,
              background: cfg.screenLine, opacity: 0.04,
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini monitor (top-down) ──────────────────────────────────────────────────

function TopDownMonitor({ status }: { status: keyof typeof STATUS_CFG }) {
  const cfg = STATUS_CFG[status];
  return (
    <div style={{
      width: 40, height: 26,
      background: "#161b22",
      outline: `2px solid ${cfg.border}`,
      position: "relative",
      overflow: "hidden",
      imageRendering: "pixelated",
    }}>
      {/* Screen */}
      <div style={{ margin: 2, background: cfg.screenBg, height: "calc(100% - 4px)", position: "relative", overflow: "hidden" }}>
        {status === "active" && <>
          {[3, 7, 11, 15].map((top, i) => (
            <div key={i} style={{
              position: "absolute", top, left: 2,
              width: `${50 + i * 10}%`, height: 2,
              background: cfg.screenLine, opacity: 0.7 - i * 0.1,
            }}/>
          ))}
          <div style={{
            position: "absolute", top: 15, left: 2, width: 3, height: 3,
            background: cfg.screenLine,
            animation: "ao-blink-cursor 0.8s step-end infinite",
          }}/>
        </>}
        {status === "processing" && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: cfg.screenLine, opacity: 0.6,
            animation: "ao-scan 1.2s linear infinite",
          }}/>
        )}
        {status === "idle" && (
          <div style={{
            position: "absolute", inset: 0,
            background: cfg.screenLine, opacity: 0.04,
          }}/>
        )}
      </div>
    </div>
  );
}

// ─── Agent Desk ───────────────────────────────────────────────────────────────

function AgentDesk({
  agent, x, y, prevStatus, away = false,
}: {
  agent: AgentData; x: number; y: number; prevStatus?: string; away?: boolean;
}) {
  // When agent is in the boardroom, force offline appearance
  const rawStatus = away ? "offline" : (agent.status in STATUS_CFG ? agent.status : "idle");
  const status = rawStatus as keyof typeof STATUS_CFG;
  const cfg = STATUS_CFG[status];
  const lev = isLevAgent(agent);
  const team = lev && isTeamContext(agent);

  const [waking, setWaking] = useState(false);
  useEffect(() => {
    if (prevStatus === "offline" && status !== "offline") {
      setWaking(true);
      const t = setTimeout(() => setWaking(false), 1700);
      return () => clearTimeout(t);
    }
  }, [status, prevStatus]);

  // Ambient idle actions — random sip/glance/stretch every 15–30s when not offline
  const [idleAction, setIdleAction] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (status === "offline") return;
    const IDLE_ACTIONS = isLevAgent(agent)
      ? ["ao-lev-sip", "ao-ambient-glance", "ao-ambient-stretch"]
      : isScoutAgent(agent)
      ? ["ao-scout-idle", "ao-ambient-glance"]
      : isQuillAgent(agent)
      ? ["ao-quill-idle", "ao-ambient-stretch"]
      : ["ao-ambient-glance"];
    let timer: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      const delay = 15000 + Math.random() * 15000;
      timer = setTimeout(() => {
        const action = IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)];
        setIdleAction(action);
        setTimeout(() => { setIdleAction(undefined); scheduleNext(); }, 2000);
      }, delay);
    }
    scheduleNext();
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, agent.id]);

  const showBubble = status === "active" || status === "processing";
  const taskText = agent.task
    || (status === "idle"    ? "Waiting for work…"
      : status === "offline" ? (lev ? "Reviewing docs…" : "—")
      : "Working…");

  return (
    <div
      className="ao-desk"
      style={{
        left: x, top: y,
        "--desk-glow": cfg.glowColor,
        boxShadow: status !== "offline" ? `0 0 10px 2px ${cfg.glowColor}` : "none",
        animation: waking && !prevStatus ? "ao-desk-on 1.2s ease-out forwards" : "none",
      } as React.CSSProperties}
    >
      {/* Speech bubble */}
      {showBubble && (
        <div className="ao-speech" style={{ outlineColor: cfg.border }}>
          {taskText}
          <div className="ao-speech-tail" style={{ borderTopColor: cfg.border }} />
        </div>
      )}

      {/* ── Desk surface ── */}
      <div style={{
        width: "100%", height: DESK_H - 18,
        background: "#3d2b1f",
        outline: "2px solid #5a3d2a",
        position: "relative",
        padding: "5px 6px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}>
        {/* Monitor screen bloom */}
        {status !== "offline" && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "55%",
            background: `radial-gradient(ellipse at 30% 0%, ${cfg.glowColor} 0%, transparent 75%)`,
            pointerEvents: "none",
          }} />
        )}

        {/* ── Top row: monitor + coffee + files ── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5, position: "relative" }}>
          <AgentMonitor status={status} lev={lev} />

          {/* Coffee cup — always full for Lev */}
          <div style={{ marginTop: 10, position: "relative" }}>
            <div style={{
              width: 9, height: 10,
              background: "#2a1a0a",
              outline: "1px solid #4a3020",
              position: "relative",
            }}>
              {/* Handle */}
              <div style={{
                position: "absolute", right: -4, top: 2,
                width: 4, height: 5,
                borderRight: "2px solid #4a3020",
                borderTop: "1px solid #4a3020",
                borderBottom: "1px solid #4a3020",
              }} />
              {/* Liquid */}
              <div style={{
                position: "absolute", top: 2, left: 1, right: 1, bottom: 1,
                background: status !== "offline" ? "#6b2f0a" : "#1a0a00",
                opacity: 0.9,
              }} />
            </div>
            {/* Steam wisps — only when actively working */}
            {(status === "active" || status === "processing") && (
              <div style={{ position: "absolute", top: -7, left: 1, display: "flex", gap: 2 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{
                    width: 2, height: 5,
                    background: "#8a7060",
                    opacity: 0.5,
                    borderRadius: 1,
                    animation: `ao-steam 1.8s ease-out ${i * 0.5}s infinite`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Files stack — always on Lev's desk, optional for others */}
          {(lev || status !== "offline") && (
            <div style={{ marginTop: 6, position: "relative", width: 20, height: 20 }}>
              {/* Three stacked sheets */}
              {[
                { top: 4, left: 2, bg: "#dce0f0", border: "#b0b4c8" },
                { top: 2, left: 1, bg: "#e8e4d4", border: "#c0bc9c" },
                { top: 0, left: 0, bg: "#efe8d0", border: "#ccb870" },
              ].map((s, i) => (
                <div key={i} style={{
                  position: "absolute", top: s.top, left: s.left,
                  width: 18, height: 14,
                  background: s.bg, outline: `1px solid ${s.border}`,
                }}>
                  {i === 0 && (
                    <>
                      <div style={{ position: "absolute", top: 2, left: 2, right: 2, height: 1, background: "#a09880" }} />
                      <div style={{ position: "absolute", top: 5, left: 2, right: 4, height: 1, background: "#a09880" }} />
                      <div style={{ position: "absolute", top: 8, left: 2, right: 1, height: 1, background: "#a09880" }} />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Keyboard */}
        <div style={{
          marginTop: 3, width: 46, height: 6,
          background: "#1e2230",
          outline: "1px solid #2e3448",
          position: "relative",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: "absolute", top: 1, left: 3 + i * 14, width: 12, height: 4,
              background: status === "active" ? "#252840" : "#222636",
              outline: "1px solid #323650",
            }} />
          ))}
        </div>

        {/* ── Character ── */}
        <div style={{ marginTop: 3, position: "relative", display: "inline-block" }}>
          <AgentCharacter agent={agent} status={status} waking={waking} extraClass={idleAction} />

          {/* Offline indicators */}
          {status === "offline" && (
            lev
              ? <DocProp />  /* Lev reviews docs, doesn't sleep */
              : (
                <div style={{ position: "absolute", top: -4, right: -12 }}>
                  {["Z", "Z", "Z"].map((z, i) => (
                    <span key={i} style={{
                      position: "absolute",
                      fontSize: 7 + i * 2, fontWeight: 700,
                      color: "#6e7681",
                      fontFamily: "'Courier New', monospace",
                      animation: `ao-zzz 2.2s ease-out ${i * 0.75}s infinite`,
                      left: i * 5, top: 0,
                    }}>{z}</span>
                  ))}
                </div>
              )
          )}
        </div>
      </div>

      {/* ── Nameplate ── */}
      <div style={{
        height: 18,
        background: status !== "offline" ? cfg.border : "#1a1e2a",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 6px",
        outline: `2px solid ${status !== "offline" ? cfg.border : "#21262d"}`,
        outlineOffset: -2,
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 9, fontWeight: 700, letterSpacing: 1,
            color: status !== "offline" ? "#0d1117" : "#484f58",
            textTransform: "uppercase",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: 78,
          }}>{agent.name}</span>
          {/* Team badge */}
          {team && (
            <span style={{
              fontSize: 6, fontWeight: 700, letterSpacing: 1,
              background: LEV_TEAM_A, color: "#0d1117",
              padding: "0 3px", lineHeight: "9px",
              textTransform: "uppercase",
            }}>TEAM</span>
          )}
        </div>
        <span style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 7, letterSpacing: 1,
          color: away ? "#2a4a6a" : status !== "offline" ? "rgba(0,0,0,0.55)" : "#3a3f4a",
          textTransform: "uppercase",
        }}>{away ? "MEETING" : cfg.label}</span>
      </div>
    </div>
  );
}

// ─── Vacant Desk — clean, waiting, chair tucked ───────────────────────────────

function VacantDesk({ x, y }: { x: number; y: number }) {
  return (
    <div className="ao-desk" style={{ left: x, top: y }}>
      <div style={{
        width: "100%", height: DESK_H - 18,
        background: "#221c14",
        outline: "2px solid #2e2418",
        position: "relative",
        padding: "5px 6px",
        boxSizing: "border-box",
        opacity: 0.5,
      }}>
        {/* Monitor — off, screen dark */}
        <div style={{
          width: 44, height: 28,
          background: "#141820",
          outline: "2px solid #1e2228",
          position: "relative",
        }}>
          <div style={{
            margin: 2, background: "#0a0c10",
            height: "calc(100% - 4px)",
          }} />
        </div>

        {/* Clean keyboard — untouched */}
        <div style={{
          marginTop: 4, width: 46, height: 6,
          background: "#1a1c28",
          outline: "1px solid #242636",
        }} />

        {/* Chair back visible — tucked neatly */}
        <div style={{
          marginTop: 6,
          width: 33, height: 8,
          background: "#181c30",
          outline: "1px solid #22263e",
        }}>
          <div style={{
            margin: "2px 4px",
            height: 4,
            background: "#1e2238",
          }} />
        </div>
      </div>

      {/* Nameplate */}
      <div style={{
        height: 18,
        background: "#161410",
        outline: "2px solid #201c14",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: 0.5,
      }}>
        <span style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 7, fontWeight: 700, letterSpacing: 2,
          color: "#2e2c28", textTransform: "uppercase",
        }}>FUTURE AGENT</span>
      </div>
    </div>
  );
}

// ─── Boardroom geometry ───────────────────────────────────────────────────────

// Top-centre corridor between Think Tank and Server Room walls
const BR_CX  = (TT_RIGHT + MR_LEFT) / 2;  // 480 — boardroom centre X
const BR_TABLE_X = 354, BR_TABLE_Y = 100, BR_TABLE_W = 254, BR_TABLE_H = 84;
// Named seat positions (top-left of each 54×64 component)
const BOARDROOM_SEATS: Record<string, { x: number; y: number }> = {
  lev:    { x: 292, y: 104 },   // west head
  scout:  { x: 370, y: 38  },   // north-left
  quill:  { x: 456, y: 38  },   // north-centre
  future1:{ x: 542, y: 38  },   // north-right
  future2:{ x: 618, y: 104 },   // east head (future)
};
const BR_SEAT_W = 54;
const BR_SEAT_H = 64;

// Canvas-absolute character sprite position within each desk
const DESK_CHAR_POS: Record<string, { x: number; y: number }> = {
  lev:   { x: 406 + 16, y: 224 + 45 },  // { x: 422, y: 269 }
  scout: { x: 204 + 16, y: 352 + 45 },  // { x: 220, y: 397 }
  quill: { x: 596 + 16, y: 352 + 45 },  // { x: 612, y: 397 }
};
// Canvas-absolute character arrival position within each boardroom seat
const BOARD_CHAR_POS: Record<string, { x: number; y: number }> = {
  lev:   { x: 292 + 10, y: 104 + 13 },  // { x: 302, y: 117 }
  scout: { x: 370 + 10, y: 38  + 13 },  // { x: 380, y: 51  }
  quill: { x: 456 + 10, y: 38  + 13 },  // { x: 466, y: 51  }
};

const MEETING_KEYWORDS = /meet|brief|sync|standup|call|present|strategy|board|session/i;


// ─── Boardroom Seat — compact agent view at the conference table ──────────────

function BoardroomSeat({
  agent,
  seatKey,
  walkDelay = 0,
}: {
  agent: AgentData | null;
  seatKey: string;
  walkDelay?: number;
}) {
  const pos = BOARDROOM_SEATS[seatKey];
  if (!pos) return null;

  const status = (
    agent && agent.status in STATUS_CFG ? agent.status : "offline"
  ) as keyof typeof STATUS_CFG;
  const cfg = STATUS_CFG[status];

  // Pick character animation — use existing per-agent classes
  const getAnimClass = () => {
    if (!agent) return "ao-char-offline";
    if (isLevAgent(agent)) return status === "active" ? "ao-lev-active" : status === "processing" ? "ao-lev-process" : "ao-lev-idle";
    if (isScoutAgent(agent)) return status === "active" ? "ao-scout-active" : status === "processing" ? "ao-scout-aha" : "ao-scout-idle";
    if (isQuillAgent(agent)) return status === "active" ? "ao-quill-active" : status === "processing" ? "ao-quill-process" : "ao-quill-idle";
    return status === "active" ? "ao-char-active" : status === "processing" ? "ao-char-process" : "ao-char-idle";
  };

  const isFuture = seatKey.startsWith("future");

  return (
    <div
      className="ao-walk-in"
      style={{
        position: "absolute",
        left: pos.x, top: pos.y,
        width: BR_SEAT_W, height: BR_SEAT_H,
        boxSizing: "border-box",
        animationDelay: `${walkDelay}ms`,
        opacity: isFuture ? 0 : 1,   // future seats invisible unless filled
      }}
    >
      {/* Status dot row */}
      <div style={{
        height: 9,
        background: "#0c0c1e",
        outline: "1px solid #1a1a38",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      }}>
        <div style={{
          width: 4, height: 4,
          background: agent ? cfg.color : "#2a2a4a",
          animation: agent && status !== "offline" ? "ao-status-dot 2s ease-in-out infinite" : "none",
        }} />
        <span style={{
          fontSize: 5, fontWeight: 700, letterSpacing: 1.5,
          color: "#2a2a5a", textTransform: "uppercase",
          fontFamily: "'Courier New', monospace",
          overflow: "hidden", maxWidth: 36, whiteSpace: "nowrap",
        }}>
          {agent?.role ?? "—"}
        </span>
      </div>

      {/* Character body */}
      <div style={{
        height: BR_SEAT_H - 9 - 10,
        background: "#0f0f20",
        outline: `2px solid ${agent && status !== "offline" ? cfg.border : "#161630"}`,
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Status glow */}
        {agent && status !== "offline" && (
          <div style={{
            position: "absolute", inset: -4,
            background: `radial-gradient(ellipse at 50% 60%, ${cfg.glowColor} 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
        )}

        {agent ? (
          <div style={{ position: "relative" }}>
            {isLevAgent(agent)   && <LevCharacter animClass={getAnimClass()} isTeam={false} />}
            {isScoutAgent(agent) && <ScoutCharacter animClass={getAnimClass()} />}
            {isQuillAgent(agent) && <QuillCharacter animClass={getAnimClass()} />}
            {!isLevAgent(agent) && !isScoutAgent(agent) && !isQuillAgent(agent) && (
              <GenericCharacter status={status} animClass={getAnimClass()} />
            )}
          </div>
        ) : (
          /* Empty seat — tucked chair silhouette */
          <div style={{ width: 28, height: 18, background: "#181830", outline: "1px solid #202040", opacity: 0.5 }} />
        )}
      </div>

      {/* Nameplate */}
      <div style={{
        height: 10,
        background: agent && status !== "offline" ? cfg.border : "#0e0e1e",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 4px",
        outline: `1px solid ${agent && status !== "offline" ? cfg.border : "#161626"}`,
        outlineOffset: -1,
      }}>
        <span style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 7, fontWeight: 700, letterSpacing: 1,
          color: agent && status !== "offline" ? "#0d1117" : "#2a2a4a",
          textTransform: "uppercase",
          overflow: "hidden", maxWidth: 32, whiteSpace: "nowrap",
        }}>{agent?.name ?? "—"}</span>
        <span style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 5, letterSpacing: 1,
          color: agent && status !== "offline" ? "rgba(0,0,0,0.5)" : "#1a1a32",
          textTransform: "uppercase",
        }}>{cfg.label}</span>
      </div>
    </div>
  );
}

// ─── Hierarchy Lines — SVG org-chart connectors ──────────────────────────────

function HierarchyLines() {
  const strokeColor = "#2a3040";
  const dotColor    = "#3a4560";
  return (
    <svg
      width={OW} height={OH}
      viewBox={`0 0 ${OW} ${OH}`}
      shapeRendering="crispEdges"
      style={{
        position: "absolute", top: 0, left: 0,
        pointerEvents: "none",
        imageRendering: "pixelated",
      }}
    >
      {/* Vertical drop from Lev bottom-center down to branch Y */}
      <line
        x1={LEV_BC.x} y1={LEV_BC.y}
        x2={LEV_BC.x} y2={BRANCH_Y}
        stroke={strokeColor} strokeWidth={2} strokeDasharray="4 3"
      />
      {/* Horizontal branch spanning Scout → Quill at BRANCH_Y */}
      <line
        x1={SCOUT_TC.x} y1={BRANCH_Y}
        x2={QUILL_TC.x} y2={BRANCH_Y}
        stroke={strokeColor} strokeWidth={2} strokeDasharray="4 3"
      />
      {/* Vertical drop Scout branch → Scout desk top */}
      <line
        x1={SCOUT_TC.x} y1={BRANCH_Y}
        x2={SCOUT_TC.x} y2={SCOUT_TC.y}
        stroke={strokeColor} strokeWidth={2} strokeDasharray="4 3"
      />
      {/* Vertical drop Quill branch → Quill desk top */}
      <line
        x1={QUILL_TC.x} y1={BRANCH_Y}
        x2={QUILL_TC.x} y2={QUILL_TC.y}
        stroke={strokeColor} strokeWidth={2} strokeDasharray="4 3"
      />
      {/* Junction dot at branch midpoint */}
      <rect x={LEV_BC.x - 3} y={BRANCH_Y - 3} width={6} height={6} fill={dotColor} />
      {/* Endpoint dots */}
      <rect x={SCOUT_TC.x - 2} y={SCOUT_TC.y - 2} width={4} height={4} fill={dotColor} />
      <rect x={QUILL_TC.x - 2} y={QUILL_TC.y - 2} width={4} height={4} fill={dotColor} />
    </svg>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar({
  agents, connected, lastUpdated,
}: {
  agents: AgentData[]; connected: boolean; lastUpdated: Date | null;
}) {
  const active  = agents.filter(a => a.status === "active").length;
  const online  = agents.filter(a => a.status !== "offline").length;
  const time    = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", { hour12: false })
    : "--:--:--";

  return (
    <div style={{
      padding: "8px 20px",
      background: "#0a0c18",
      borderTop: "2px solid #1e2236",
      display: "flex",
      alignItems: "center",
      gap: 20,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 10,
      letterSpacing: 1.5,
      color: "#6e7681",
      textTransform: "uppercase",
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 6, height: 6,
          background: connected ? "#3fb950" : "#f85149",
          outline: `1px solid ${connected ? "#3fb950" : "#f85149"}`,
          animation: connected ? "ao-status-dot 2s ease-in-out infinite" : "none",
        }}/>
        <span style={{ color: connected ? "#3fb950" : "#f85149" }}>
          {connected ? "AGENTS ONLINE" : "AGENTS OFFLINE"}
        </span>
      </div>
      <span>│</span>
      <span>
        <span style={{ color: "#3fb950" }}>{active}</span>
        {" TYPING · "}
        <span style={{ color: "#388bfd" }}>{online}</span>
        {" ONLINE · "}
        <span>{agents.length}</span>
        {" AGENTS"}
      </span>
      <span>│</span>
      <span>SYNC: {time}</span>
      <span style={{ marginLeft: "auto", color: "#30363d" }}>
        POLL {POLL_MS / 1000}s · NANOCLAW OPS CENTER
      </span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ error }: { error: string | null }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      pointerEvents: "none",
    }}>
      <div style={{
        padding: "24px 40px",
        background: "rgba(13,17,23,0.92)",
        outline: "2px solid #30363d",
        textAlign: "center",
        fontFamily: "'Courier New', Courier, monospace",
      }}>
        <div style={{ fontSize: 28, color: "#30363d", letterSpacing: 4, marginBottom: 12 }}>
          ▓▒░ NO SIGNAL ░▒▓
        </div>
        <div style={{ fontSize: 11, color: "#6e7681", letterSpacing: 2, textTransform: "uppercase" }}>
          {error
            ? `ERROR — ${error}`
            : "WAITING FOR AGENT STATUS — NanoClaw not yet reporting"}
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 4 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6,
              background: "#30363d",
              animation: `ao-status-dot ${1 + i * 0.2}s ease-in-out ${i * 0.2}s infinite`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Walking Character overlay ────────────────────────────────────────────────
// Renders a free-floating character sprite that CSS-transitions between
// canvas-absolute coordinates to simulate physical movement.

function WalkingCharacter({
  agent,
  from,
  to,
  phase,           // "walking" | "arrived"
}: {
  agent: AgentData;
  from: { x: number; y: number };
  to: { x: number; y: number };
  phase: "walking" | "arrived";
}) {
  // Positions are in raw canvas coords; ao-canvas handles the scale transform
  const pos = phase === "arrived" ? to : from;
  const isWalking = phase === "walking";
  const status = (agent.status in STATUS_CFG ? agent.status : "idle") as keyof typeof STATUS_CFG;

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        transition: "left 800ms ease-in-out, top 800ms ease-in-out",
        zIndex: 30,
        pointerEvents: "none",
        transformOrigin: "bottom center",
      }}
    >
      <AgentCharacter
        agent={agent}
        status={status}
        waking={false}
        extraClass={isWalking ? "ao-walk" : undefined}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentOffice() {
  const { isSSAdmin, isSSRole, loading } = useAuth();
  const [state, setState] = useState<OfficeState>({
    agents: [], connected: false, lastUpdated: null, error: null,
  });
  const prevAgentsRef    = useRef<AgentData[]>([]);
  const viewportRef      = useRef<HTMLDivElement>(null);
  const prevMeetingRef   = useRef(false);
  const walkTimers       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [canvasTransform, setCanvasTransform] = useState({ scale: 1, x: 0, y: 0 });
  // boardroomVisible lags isMeetingMode by ~500 ms so "stand-up" plays first
  const [boardroomVisible, setBoardroomVisible] = useState(false);
  // Per-agent walk phase: "walking" | "arrived" (absent = at desk)
  const [movePhase, setMovePhase] = useState<Record<string, "walking" | "arrived">>({});

  // Scale canvas to fill viewport
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      const scale = Math.min(width / OW, height / OH);
      const x = (width - OW * scale) / 2;
      const y = (height - OH * scale) / 2;
      setCanvasTransform({ scale, x, y });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Poll agent_status table (written by NanoClaw via push-agent-status edge function)
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from("agent_status" as any)
          .select("*")
          .order("id");
        if (cancelled) return;
        if (error) throw new Error(error.message);
        const rows = (data || []) as AgentData[];
        // Consider connected if any agent updated in the last 30 seconds
        const recentlySeen = rows.some((a: any) => {
          const age = Date.now() - new Date(a.updated_at).getTime();
          return age < 30000;
        });
        prevAgentsRef.current = state.agents;
        setState({
          agents: rows,
          connected: recentlySeen,
          lastUpdated: new Date(),
          error: null,
        });
      } catch (err) {
        if (!cancelled) {
          setState(prev => ({
            ...prev, connected: false, lastUpdated: new Date(),
            error: err instanceof Error ? err.message : "Connection failed",
          }));
        }
      }
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) return null;
  if (!isSSRole) return <Navigate to="/dashboard" replace />;

  const { agents, connected, lastUpdated, error } = state;

  // Meeting mode: Lev has a task matching meeting keywords
  const levAgent = agents.find(isLevAgent);
  const isMeetingMode = !!(levAgent?.task && MEETING_KEYWORDS.test(levAgent.task));

  // Boardroom + walk orchestration (ref comparison — only fires on mode change)
  if (isMeetingMode !== prevMeetingRef.current) {
    prevMeetingRef.current = isMeetingMode;
    // Clear any in-flight walk timers
    walkTimers.current.forEach(clearTimeout);
    walkTimers.current = [];

    const WALKERS = ["lev", "scout", "quill"] as const;

    if (isMeetingMode) {
      // Stagger agents walking to boardroom
      WALKERS.forEach((key, i) => {
        const t1 = setTimeout(() => {
          setMovePhase(prev => ({ ...prev, [key]: "walking" }));
          const t2 = setTimeout(() => {
            setMovePhase(prev => ({ ...prev, [key]: "arrived" }));
          }, 820);
          walkTimers.current.push(t2);
        }, i * 180);
        walkTimers.current.push(t1);
      });
      // Boardroom seats appear after last walker arrives
      const t = setTimeout(() => setBoardroomVisible(true), 2 * 180 + 820 + 120);
      walkTimers.current.push(t);
    } else {
      setBoardroomVisible(false);
      // Agents walk back to desks
      WALKERS.forEach((key, i) => {
        const t1 = setTimeout(() => {
          setMovePhase(prev => ({ ...prev, [key]: "walking" }));
          const t2 = setTimeout(() => {
            setMovePhase(prev => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }, 820);
          walkTimers.current.push(t2);
        }, i * 180);
        walkTimers.current.push(t1);
      });
    }
  }

  // Resolve named desk → agent / stub / null
  const resolveDesk = (desk: NamedDesk) => {
    if (desk.key === "future") return null;
    const live = agents.find(a => {
      if (desk.key === "lev")   return isLevAgent(a);
      if (desk.key === "scout") return isScoutAgent(a);
      if (desk.key === "quill") return isQuillAgent(a);
      return false;
    });
    if (live) return live;
    if (desk.key === "scout") return STUB_SCOUT;
    if (desk.key === "quill") return STUB_QUILL;
    return null;
  };

  // Resolve boardroom seat → agent / null
  const resolveSeat = (key: string): AgentData | null => {
    if (key === "future1" || key === "future2") return null;
    if (key === "lev")   return levAgent ?? null;
    if (key === "scout") return agents.find(isScoutAgent) ?? STUB_SCOUT;
    if (key === "quill") return agents.find(isQuillAgent) ?? STUB_QUILL;
    return null;
  };

  const displayAgents = [
    ...agents,
    ...(agents.find(isScoutAgent) ? [] : [STUB_SCOUT]),
    ...(agents.find(isQuillAgent) ? [] : [STUB_QUILL]),
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", background: "#080a14",
      fontFamily: "'Courier New', Courier, monospace",
    }}>
      <style>{OFFICE_CSS}</style>

      {/* Header */}
      <div style={{
        padding: "12px 20px 10px", borderBottom: "2px solid #1e2236",
        flexShrink: 0, display: "flex", alignItems: "baseline", gap: 16,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 4, color: "#f97316", textTransform: "uppercase" }}>
          ▓▓ AGENT OFFICE
        </span>
        <span style={{ fontSize: 9, color: "#30363d", letterSpacing: 2, textTransform: "uppercase" }}>
          NANOCLAW OPS · FLOOR 1
        </span>
        {isMeetingMode && (
          <span style={{
            fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
            color: "#388bfd", animation: "ao-status-dot 2s ease-in-out infinite",
          }}>
            ● IN SESSION
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {isSSAdmin && (
            <a
              href="/agent-office-v2"
              style={{
                fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
                color: "#f97316", textDecoration: "none", opacity: 0.7,
                border: "1px solid #f9731640", padding: "2px 8px",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
            >
              Preview v2 →
            </a>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 6, height: 6,
              background: connected ? "#3fb950" : "#f85149",
              animation: connected ? "ao-status-dot 2s ease-in-out infinite" : "none",
            }}/>
            <span style={{ fontSize: 9, color: connected ? "#3fb950" : "#f85149", letterSpacing: 1 }}>
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div ref={viewportRef} className="ao-viewport">
        <div
          className="ao-canvas"
          style={{
            position: "absolute",
            transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          }}
        >
          <OfficeBg />
          <HierarchyLines />

          {/* ── OPEN-FLOOR DESKS ── always rendered; faded + "MEETING" when in session */}
          {NAMED_DESKS.map((desk, i) => {
            const agent = resolveDesk(desk);
            if (!agent) return <VacantDesk key={`future-${i}`} x={desk.x} y={desk.y} />;
            const isStub = agent === STUB_SCOUT || agent === STUB_QUILL;
            const prevAgent = prevAgentsRef.current.find(a => a.id === agent.id);
            return (
              <div
                key={`${desk.key}-${i}`}
                className={isMeetingMode ? "ao-desk-away" : undefined}
                style={{
                  opacity: isMeetingMode ? 0.32 : isStub ? 0.45 : 1,
                  transition: "opacity 0.4s ease",
                }}
              >
                <AgentDesk
                  agent={agent} x={desk.x} y={desk.y}
                  prevStatus={prevAgent?.status}
                  away={isMeetingMode}
                />
              </div>
            );
          })}

          {/* ── BOARDROOM SCENE — appears after stand-up delay ── */}
          {boardroomVisible && (
            <>
              {/* Soft blue overlay on the boardroom area */}
              <div style={{
                position: "absolute",
                left: TT_RIGHT + 4, top: TOP_WALL_H,
                width: MR_LEFT - TT_RIGHT - 8,
                height: ROOM_BOTTOM - TOP_WALL_H,
                background: "rgba(20,30,80,0.22)",
                animation: "ao-boardroom-pulse 4s ease-in-out infinite",
                pointerEvents: "none",
              }} />
              {/* Agent seats */}
              {Object.keys(BOARDROOM_SEATS).map((key, i) => (
                <BoardroomSeat
                  key={key}
                  agent={resolveSeat(key)}
                  seatKey={key}
                  walkDelay={i * 80}
                />
              ))}
              {/* "IN SESSION" banner above screen */}
              <div style={{
                position: "absolute",
                left: BR_CX - 48, top: TOP_WALL_H + 2,
                padding: "1px 6px",
                background: "#0a1030",
                outline: "1px solid #2a3060",
                fontFamily: "'Courier New', monospace",
                fontSize: 7, letterSpacing: 2, color: "#388bfd",
                textTransform: "uppercase",
                animation: "ao-status-dot 2s ease-in-out infinite",
              }}>
                ● STRATEGY SESSION
              </div>
            </>
          )}

          {/* ── WALKING CHARACTER OVERLAYS ── */}
          {(["lev", "scout", "quill"] as const).map(key => {
            const phase = movePhase[key];
            if (!phase) return null;
            const agentForKey =
              key === "lev"   ? (levAgent ?? null) :
              key === "scout" ? (agents.find(isScoutAgent) ?? STUB_SCOUT) :
                                (agents.find(isQuillAgent) ?? STUB_QUILL);
            if (!agentForKey) return null;
            const from = DESK_CHAR_POS[key];
            const to   = BOARD_CHAR_POS[key];
            if (!from || !to) return null;
            return (
              <WalkingCharacter
                key={key}
                agent={agentForKey}
                from={from}
                to={to}
                phase={phase}
              />
            );
          })}

          {!connected && agents.length === 0 && <EmptyState error={error} />}
        </div>
      </div>

      <StatusBar agents={displayAgents} connected={connected} lastUpdated={lastUpdated} />
    </div>
  );
}
