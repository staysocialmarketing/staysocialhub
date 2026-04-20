import { createContext, useContext, useState, type ReactNode } from 'react';

type LightingMode = 'day' | 'night';

const LS_KEY = 'agent-office-lighting-mode';

interface LightingCtx {
  mode: LightingMode;
  toggleMode: () => void;
}

const LightingContext = createContext<LightingCtx>({ mode: 'day', toggleMode: () => {} });

export function LightingProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LightingMode>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved === 'night' ? 'night' : 'day';
    } catch {
      return 'day';
    }
  });

  const toggleMode = () =>
    setMode(m => {
      const next: LightingMode = m === 'day' ? 'night' : 'day';
      try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
      return next;
    });

  return (
    <LightingContext.Provider value={{ mode, toggleMode }}>
      {children}
    </LightingContext.Provider>
  );
}

export function useLighting() {
  return useContext(LightingContext);
}
