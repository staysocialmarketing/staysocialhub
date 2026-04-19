import { useRef, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CANVAS_W, CANVAS_H, UPPER_FLOOR_H } from './constants/desks';
import { UpperFloor } from './UpperFloor';
import { MainFloor } from './MainFloor';
import { Staircase } from './Staircase';
import { CharacterLayer } from './CharacterLayer';
import { AgentStatusProvider } from './hooks/useAgentStatus';
import { OfficeHeader } from './OfficeHeader';
import { OfficeFooter } from './OfficeFooter';

// Shared canvas — used by both the gated route and the dev-preview route.
export function AgentOfficeCanvas({ devPreview = false }: { devPreview?: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      const scale = Math.min(width / CANVAS_W, height / CANVAS_H);
      setTransform({
        scale,
        x: Math.floor((width  - CANVAS_W * scale) / 2),
        y: Math.floor((height - CANVAS_H * scale) / 2),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#060810' }}>
      {devPreview && (
        <div style={{
          background: '#7f1d1d',
          color: '#fca5a5',
          textAlign: 'center',
          padding: '6px 12px',
          fontSize: 11,
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
          flexShrink: 0,
        }}>
          ⚠ DEV PREVIEW — unauthenticated route, remove before launch
        </div>
      )}
      <div
        ref={viewportRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}
      >
        <div
          style={{
            position: 'absolute',
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'top left',
            fontFamily: "'Courier New', Courier, monospace",
            imageRendering: 'pixelated',
          }}
        >
          <AgentStatusProvider>
            <UpperFloor />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: UPPER_FLOOR_H,
                width: CANVAS_W,
                height: 6,
                background: '#080e1c',
                borderTop: '1px solid #1a2840',
                borderBottom: '1px solid #0e1830',
              }}
            />
            <MainFloor />
            <Staircase />
            <CharacterLayer />
            <OfficeHeader />
            <OfficeFooter />
          </AgentStatusProvider>
        </div>
      </div>
    </div>
  );
}

// Gated route — requires ss_team role.
export default function AgentOffice() {
  const { isSSRole, loading } = useAuth();
  if (loading) return null;
  if (!isSSRole) return <Navigate to="/dashboard" replace />;
  return <AgentOfficeCanvas />;
}
