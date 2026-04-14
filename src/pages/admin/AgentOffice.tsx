import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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

const NANOCLAW_URL = "http://localhost:3456/status";
const POLL_MS = 5000;

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

// Desk grid
const DESK_W = 148;
const DESK_H = 100;
const DESK_COLS = [20, 194, 368, 542, 716] as const;
const DESK_ROWS = [224, 358] as const;
// 10 desk slots total; agents fill first N, rest are vacant
const DESK_SLOTS = DESK_ROWS.flatMap(y => DESK_COLS.map(x => ({ x, y })));

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
  @keyframes ao-bounce {
    0%,100% { transform: translateY(0); }
    40%      { transform: translateY(-3px); }
    70%      { transform: translateY(-1px); }
  }
  @keyframes ao-pulse-char {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.7; }
  }
  @keyframes ao-breathe {
    0%,100% { transform: scaleY(1); }
    50%     { transform: scaleY(0.97); }
  }
  @keyframes ao-sleep {
    0%,100% { transform: rotate(0deg) translateY(0); }
    50%     { transform: rotate(-6deg) translateY(2px); }
  }
  @keyframes ao-blink-cursor {
    0%,49% { opacity:1; } 50%,100% { opacity:0; }
  }
  @keyframes ao-scan {
    0%   { transform: translateY(0); opacity:0.9; }
    100% { transform: translateY(14px); opacity:0.3; }
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
  .ao-char-active      { animation: ao-bounce 0.55s ease-in-out infinite; }
  .ao-char-processing  { animation: ao-pulse-char 1.8s ease-in-out infinite; }
  .ao-char-idle        { animation: ao-breathe 3.5s ease-in-out infinite; transform-origin: bottom center; }
  .ao-char-offline     { animation: ao-sleep 3s ease-in-out infinite; transform-origin: bottom center; }

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

      {/* ── MEETING ROOM ── */}
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

// ─── Top-down character sprite ────────────────────────────────────────────────

function TopDownChar({ status }: { status: keyof typeof STATUS_CFG }) {
  const cfg = STATUS_CFG[status];
  const skin = "#e8c090";
  const hair = "#2d1500";
  // Pixel unit = 3px; character is 9×5 pixels
  const P = 3;
  const px = (col: number, row: number, w = 1, h = 1, fill = "#000") => (
    <rect x={col * P} y={row * P} width={w * P} height={h * P} fill={fill} />
  );

  return (
    <svg
      width={9 * P} height={7 * P}
      viewBox={`0 0 ${9 * P} ${7 * P}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
      className={`ao-char-${status}`}
    >
      {/* Head (top-down: slightly oval) */}
      {px(3, 0, 3, 1, hair)}
      {px(2, 1, 5, 3, skin)}
      {/* Eyes */}
      {px(3, 1, 1, 1, "#1a0800")}
      {px(5, 1, 1, 1, "#1a0800")}
      {/* Shoulders */}
      {px(1, 3, 7, 2, cfg.bodyFill)}
      {/* Collar highlight */}
      {px(3, 3, 3, 1, cfg.headFill)}
      {/* Chair back visible at bottom */}
      {px(0, 5, 9, 2, "#1a1e30")}
      {px(1, 5, 7, 2, "#22263e")}
    </svg>
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

// ─── Agent Desk (top-down view) ───────────────────────────────────────────────

function AgentDesk({
  agent, x, y, prevStatus,
}: {
  agent: AgentData; x: number; y: number; prevStatus?: string;
}) {
  const status = (agent.status in STATUS_CFG ? agent.status : "idle") as keyof typeof STATUS_CFG;
  const cfg = STATUS_CFG[status];
  const justCameOnline = prevStatus === "offline" && status !== "offline";

  const showBubble = status === "active" || status === "processing";
  const taskText = agent.task || (status === "idle" ? "Waiting..." : status === "offline" ? "—" : "Working...");

  return (
    <div
      className="ao-desk"
      style={{
        left: x,
        top: y,
        "--desk-glow": cfg.glowColor,
        boxShadow: status !== "offline" ? `0 0 10px 2px ${cfg.glowColor}` : "none",
        animation: justCameOnline ? "ao-desk-on 1.2s ease-out forwards" : "none",
      } as React.CSSProperties}
    >
      {/* Speech bubble */}
      {showBubble && (
        <div className="ao-speech" style={{ outlineColor: cfg.border }}>
          {taskText}
          <div className="ao-speech-tail" style={{
            borderTopColor: cfg.border,
          }}/>
        </div>
      )}

      {/* Desk surface */}
      <div style={{
        width: "100%",
        height: DESK_H - 18,
        background: "#3d2b1f",
        outline: `2px solid #5a3d2a`,
        position: "relative",
        padding: "5px 6px",
        boxSizing: "border-box",
      }}>
        {/* Desk lamp glow (soft radial) */}
        {status !== "offline" && (
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse at 50% 0%, ${cfg.glowColor} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}/>
        )}

        {/* Monitor + accessories row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
          <TopDownMonitor status={status}/>
          {/* Coffee cup */}
          <div style={{
            width: 8, height: 9, marginTop: 8,
            background: "#2a1a0a",
            outline: "1px solid #4a3020",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", top: 1, left: 1, right: 1, height: 3,
              background: status !== "offline" ? "#8b4513" : "#2a1a0a",
              opacity: 0.8,
            }}/>
          </div>
          {/* Stack of papers / sticky note */}
          <div style={{ marginTop: 6 }}>
            <div style={{ width: 14, height: 12, background: "#ffe090", outline: "1px solid #ccb060", marginBottom: 1 }}/>
            <div style={{ width: 14, height: 8, background: "#e8e4d0", outline: "1px solid #c0bc9c" }}/>
          </div>
        </div>

        {/* Keyboard */}
        <div style={{
          marginTop: 3, width: 44, height: 6,
          background: "#222636",
          outline: "1px solid #30364a",
          position: "relative",
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: "absolute", top: 1, left: 3 + i * 13, width: 11, height: 4,
              background: "#282c40", outline: "1px solid #383e56",
            }}/>
          ))}
        </div>

        {/* Character (top-down, sits below keyboard) */}
        <div style={{ marginTop: 3, position: "relative", display: "inline-block" }}>
          <TopDownChar status={status}/>
          {/* ZZZ for sleeping */}
          {status === "offline" && (
            <div style={{ position: "absolute", top: -4, right: -10 }}>
              {["Z", "Z", "Z"].map((z, i) => (
                <span key={i} style={{
                  position: "absolute",
                  fontSize: 8 + i * 2,
                  fontWeight: 700,
                  color: "#6e7681",
                  fontFamily: "'Courier New', monospace",
                  animation: `ao-zzz ${2.2}s ease-out ${i * 0.7}s infinite`,
                  left: i * 4,
                  top: 0,
                }}>{z}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nameplate bar */}
      <div style={{
        height: 18,
        background: status !== "offline" ? cfg.border : "#21262d",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 6px",
        outline: `2px solid ${cfg.border}`,
        outlineOffset: -2,
      }}>
        <span style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          color: status !== "offline" ? "#0d1117" : "#6e7681",
          textTransform: "uppercase",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 90,
        }}>{agent.name}</span>
        <span style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 7,
          letterSpacing: 1,
          color: status !== "offline" ? "rgba(0,0,0,0.6)" : "#484f58",
          textTransform: "uppercase",
        }}>{cfg.label}</span>
      </div>
    </div>
  );
}

// ─── Vacant Desk ─────────────────────────────────────────────────────────────

function VacantDesk({ x, y }: { x: number; y: number }) {
  return (
    <div className="ao-desk" style={{ left: x, top: y, opacity: 0.35 }}>
      <div style={{
        width: "100%",
        height: DESK_H - 18,
        background: "#1e1a14",
        outline: "2px solid #2a2418",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Dusty monitor outline */}
        <div style={{
          width: 40, height: 26,
          background: "#111318",
          outline: "2px solid #1e2228",
          position: "absolute",
          top: 5, left: 6,
        }}/>
        {/* Chair silhouette */}
        <div style={{
          width: 27, height: 21,
          background: "#161412",
          outline: "1px solid #2a2420",
          position: "absolute",
          bottom: 6, left: "50%",
          transform: "translateX(-50%)",
        }}/>
      </div>
      <div style={{
        height: 18,
        background: "#161410",
        outline: "2px solid #1e1a14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 3,
          color: "#3a3630",
          textTransform: "uppercase",
        }}>VACANT</span>
      </div>
    </div>
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
          {connected ? "NANOCLAW ONLINE" : "NANOCLAW OFFLINE"}
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
        POLL {POLL_MS / 1000}s · NANOCLAW OPS CENTER v0.1
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
            ? `NANOCLAW UNREACHABLE — ${error}`
            : "WAITING FOR NANOCLAW ON localhost:3456"}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentOffice() {
  const { isSSAdmin, loading } = useAuth();
  const [state, setState] = useState<OfficeState>({
    agents: [], connected: false, lastUpdated: null, error: null,
  });
  const prevAgentsRef = useRef<AgentData[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canvasTransform, setCanvasTransform] = useState({ scale: 1, x: 0, y: 0 });

  // Scale canvas to fill available viewport, maintaining aspect ratio
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
          prevAgentsRef.current = state.agents;
          setState({
            agents: Array.isArray(data.agents) ? data.agents : [],
            connected: true,
            lastUpdated: new Date(),
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState(prev => ({
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
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) return null;
  if (!isSSAdmin) return <Navigate to="/dashboard" replace />;

  const { agents, connected, lastUpdated, error } = state;

  // Build desk assignments: agents fill first N slots, rest are vacant
  const maxDesks = DESK_SLOTS.length;
  const agentDesks = agents.slice(0, maxDesks);
  const vacantStart = agentDesks.length;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#080a14",
      fontFamily: "'Courier New', Courier, monospace",
    }}>
      <style>{OFFICE_CSS}</style>

      {/* Header bar */}
      <div style={{
        padding: "12px 20px 10px",
        borderBottom: "2px solid #1e2236",
        flexShrink: 0,
        display: "flex",
        alignItems: "baseline",
        gap: 16,
      }}>
        <span style={{
          fontSize: 16, fontWeight: 700, letterSpacing: 4,
          color: "#f97316", textTransform: "uppercase",
        }}>
          ▓▓ AGENT OFFICE
        </span>
        <span style={{ fontSize: 9, color: "#30363d", letterSpacing: 2, textTransform: "uppercase" }}>
          NANOCLAW OPS · FLOOR 1
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
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

      {/* Full-screen scaled canvas */}
      <div ref={viewportRef} className="ao-viewport">
        <div
          className="ao-canvas"
          style={{
            position: "absolute",
            transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`,
          }}
        >
          {/* Static room background */}
          <OfficeBg />

          {/* Agent desks (absolutely positioned over SVG) */}
          {agentDesks.map((agent, i) => {
            const slot = DESK_SLOTS[i];
            const prevAgent = prevAgentsRef.current.find(a => a.id === agent.id);
            return (
              <AgentDesk
                key={agent.id}
                agent={agent}
                x={slot.x}
                y={slot.y}
                prevStatus={prevAgent?.status}
              />
            );
          })}

          {/* Vacant desk placeholders */}
          {DESK_SLOTS.slice(vacantStart, Math.min(vacantStart + 6, maxDesks)).map((slot, i) => (
            <VacantDesk key={`vacant-${i}`} x={slot.x} y={slot.y} />
          ))}

          {/* No-signal overlay */}
          {!connected && agents.length === 0 && <EmptyState error={error} />}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar agents={agents} connected={connected} lastUpdated={lastUpdated} />
    </div>
  );
}
