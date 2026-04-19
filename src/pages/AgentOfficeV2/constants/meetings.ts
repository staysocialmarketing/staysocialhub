import type { WaypointKey } from './waypoints';

// ---------------------------------------------------------------------------
// Meeting types — six recurring meeting formats per Lev's roster.
// Seat convention: 0 = head of table (corey), 1–3 down left side,
// 4 = opposite head, 5–7 down right side.
// ---------------------------------------------------------------------------

export interface MeetingType {
  id: string;
  name: string;
  taskTagTriggers: string[];
  attendees: string[];                        // agent keys, in join order
  seatAssignments: Record<string, WaypointKey>; // agent key → seat waypoint
  headOfTable?: string;                       // agent key who presents
}

export const MEETING_TYPES: Record<string, MeetingType> = {
  all_hands: {
    id: 'all_hands',
    name: 'All Hands',
    taskTagTriggers: ['all_hands', 'team_sync'],
    attendees: ['corey', 'lev', 'scout', 'quill', 'ember', 'gavin', 'tristan'],
    seatAssignments: {
      corey:   'seat_0',
      lev:     'seat_1',
      scout:   'seat_2',
      quill:   'seat_3',
      ember:   'seat_5',
      gavin:   'seat_6',
      tristan: 'seat_7',
    },
    headOfTable: 'corey',
  },

  strategy: {
    id: 'strategy',
    name: 'Strategy',
    taskTagTriggers: ['strategy', 'planning', 'roadmap'],
    attendees: ['corey', 'lev', 'gavin', 'tristan'],
    seatAssignments: {
      corey:   'seat_0',
      lev:     'seat_1',
      gavin:   'seat_5',
      tristan: 'seat_7',
    },
    headOfTable: 'corey',
  },

  content: {
    id: 'content',
    name: 'Content Review',
    taskTagTriggers: ['content', 'content_review', 'creative_brief'],
    attendees: ['lev', 'gavin', 'quill', 'ember'],
    seatAssignments: {
      lev:   'seat_0',
      gavin: 'seat_1',
      quill: 'seat_5',
      ember: 'seat_6',
    },
    headOfTable: 'lev',
  },

  research_brief: {
    id: 'research_brief',
    name: 'Research Brief',
    taskTagTriggers: ['research', 'brief', 'discovery'],
    attendees: ['lev', 'scout', 'quill'],
    seatAssignments: {
      lev:   'seat_0',
      scout: 'seat_1',
      quill: 'seat_5',
    },
    headOfTable: 'lev',
  },

  client_review: {
    id: 'client_review',
    name: 'Client Review',
    taskTagTriggers: ['client_review', 'client', 'approval'],
    attendees: ['corey', 'lev', 'tristan', 'gavin'],
    seatAssignments: {
      corey:   'meeting_presenter',
      lev:     'seat_1',
      tristan: 'seat_2',
      gavin:   'seat_5',
    },
    headOfTable: 'corey',
  },

  dev_session: {
    id: 'dev_session',
    name: 'Dev Session',
    taskTagTriggers: ['dev', 'build', 'deploy', 'debug'],
    attendees: ['corey', 'lev', 'scout', 'ember'],
    seatAssignments: {
      corey: 'seat_0',
      lev:   'seat_1',
      scout: 'seat_2',
      ember: 'seat_5',
    },
    headOfTable: 'corey',
  },
};

// Returns the first meeting type whose taskTagTriggers include the given tag.
export function getMeetingForTaskTag(tag: string): MeetingType | null {
  for (const meeting of Object.values(MEETING_TYPES)) {
    if (meeting.taskTagTriggers.includes(tag)) return meeting;
  }
  return null;
}

// Filters attendees to those present in the active agent set.
export function resolveAttendees(
  meeting: MeetingType,
  activeAgents: ReadonlySet<string>,
): string[] {
  return meeting.attendees.filter(a => activeAgents.has(a));
}
