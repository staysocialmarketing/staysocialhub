/**
 * MeetingContext — coordinates the "Call to Meeting" flow.
 *
 * triggerMeeting()  → walks all agents to their meeting seats
 * endMeeting()      → walks all agents back to their desks
 * meetingActive     → true once every agent has reached their seat
 * meetingPending    → true while agents are walking to seats
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type MeetingState = 'idle' | 'calling' | 'active' | 'dispersing';

interface MeetingCtx {
  meetingState: MeetingState;
  /** Walk all agents to their seats. */
  triggerMeeting: () => void;
  /** Walk all agents back to their desks. */
  endMeeting: () => void;
  /** Called by CharacterLayer once every agent has settled in their seat. */
  _onAllSeated: () => void;
  /** Called by CharacterLayer once every agent is back at their desk. */
  _onAllDispersed: () => void;
}

const MeetingContext = createContext<MeetingCtx>({
  meetingState:    'idle',
  triggerMeeting:  () => {},
  endMeeting:      () => {},
  _onAllSeated:    () => {},
  _onAllDispersed: () => {},
});

export function MeetingProvider({ children }: { children: ReactNode }) {
  const [meetingState, setMeetingState] = useState<MeetingState>('idle');

  const triggerMeeting = useCallback(() => {
    setMeetingState(s => (s === 'idle' ? 'calling' : s));
  }, []);

  const endMeeting = useCallback(() => {
    setMeetingState(s => (s === 'active' ? 'dispersing' : s));
  }, []);

  const _onAllSeated = useCallback(() => {
    setMeetingState('active');
  }, []);

  const _onAllDispersed = useCallback(() => {
    setMeetingState('idle');
  }, []);

  return (
    <MeetingContext.Provider value={{ meetingState, triggerMeeting, endMeeting, _onAllSeated, _onAllDispersed }}>
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeeting() {
  return useContext(MeetingContext);
}
