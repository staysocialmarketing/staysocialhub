import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AgentState = 'idle' | 'active' | 'processing' | 'offline' | 'placeholder';

// Per-state lamp opacities (used by DeskLamp)
export const STATE_OPACITY: Record<AgentState, number> = {
  idle:        0.3,
  active:      0.7,
  processing:  0.9,
  offline:     0,
  placeholder: 0,
};

// Hardlocked regardless of DB — enforced here so all consumers get correct state
const PLACEHOLDER_KEYS = new Set(['forge', 'pixel']);

function resolveState(rawStatus: string, key: string): AgentState {
  if (PLACEHOLDER_KEYS.has(key)) return 'placeholder';
  const s = (rawStatus ?? '').toLowerCase();
  if (s === 'active')     return 'active';
  if (s === 'processing') return 'processing';
  if (s === 'offline')    return 'offline';
  return 'idle';
}

export type AgentStatusMap = Record<string, AgentState>;

export const AgentStatusContext = createContext<AgentStatusMap>({});

export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<AgentStatusMap>({});

  useEffect(() => {
    // Initial fetch
    supabase
      .from('agent_status')
      .select('id, status')
      .then(({ data, error }) => {
        if (import.meta.env.DEV) console.log('[AgentOffice] initial fetch →', data?.length ?? 0, 'rows', error ?? '');
        if (!data) return;
        const map: AgentStatusMap = {};
        for (const row of data) {
          map[row.id] = resolveState(row.status as string, row.id);
        }
        setStatuses(map);
      });

    // Unique name per mount prevents stale subscriptions from Vite HMR
    // colliding with the new subscription on the same channel name.
    const channelName = `agent_status_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_status' },
        (payload) => {
          const row = payload.new as { id: string; status: string };
          if (!row?.id) return;
          const resolved = resolveState(row.status, row.id);
          if (import.meta.env.DEV) console.log('[AgentOffice] realtime →', row.id, row.status, '→', resolved);
          setStatuses(prev => ({
            ...prev,
            [row.id]: resolved,
          }));
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log('[AgentOffice] channel status →', channelName, status);
      });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AgentStatusContext.Provider value={statuses}>
      {children}
    </AgentStatusContext.Provider>
  );
}

export function useAgentStatuses(): AgentStatusMap {
  return useContext(AgentStatusContext);
}
