interface DeskLampProps {
  x: number;
  y: number;
  deskW: number;
  deskH: number;
  lampW: number;
  opacity: number;
  topStop?: string;  // hex color for bright center
}

export function DeskLamp({ x, y, deskW, deskH, lampW, opacity, topStop = '#ffd88a' }: DeskLampProps) {
  if (opacity === 0) return null;

  const lampH = Math.round(lampW * 0.45);
  const lampX = x + Math.floor((deskW - lampW) / 2);
  // Center vertically on desk surface, bleeds slightly above
  const lampY = y + Math.floor((deskH - lampH) / 2) - Math.round(lampH * 0.15);

  // Parse hex to rgb for gradient stop
  const hex = topStop.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return (
    <div
      style={{
        position: 'absolute',
        left: lampX,
        top: lampY,
        width: lampW,
        height: lampH,
        background: `radial-gradient(ellipse at 50% 40%, rgba(${r},${g},${b},0.88) 0%, rgba(${r},${g},${b},0) 72%)`,
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
}
