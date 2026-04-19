export type MemberType = 'ai' | 'human';

export interface AgentConfig {
  key: string;
  name: string;
  role: string;
  memberType: MemberType;
  isPlaceholder: boolean;
  palette: string;       // primary colour, used for indicator badge in Phase 3
}

export const AGENTS: Record<string, AgentConfig> = {
  corey: {
    key: 'corey',
    name: 'Corey',
    role: 'Founder',
    memberType: 'human',
    isPlaceholder: false,
    palette: '#c48a12',
  },
  lev: {
    key: 'lev',
    name: 'Lev',
    role: 'Chief of Staff',
    memberType: 'ai',
    isPlaceholder: false,
    palette: '#d4822a',
  },
  scout: {
    key: 'scout',
    name: 'Scout',
    role: 'Research',
    memberType: 'ai',
    isPlaceholder: false,
    palette: '#3d8a52',
  },
  quill: {
    key: 'quill',
    name: 'Quill',
    role: 'Social Media Strategist',
    memberType: 'ai',
    isPlaceholder: false,
    palette: '#7a1a2e',
  },
  ember: {
    key: 'ember',
    name: 'Ember',
    role: 'Email Strategist',
    memberType: 'ai',
    isPlaceholder: false,
    palette: '#7a4808',
  },
  forge: {
    key: 'forge',
    name: 'Forge',
    role: 'Lead Developer',
    memberType: 'ai',
    isPlaceholder: true,
    palette: '#1e3a5a',
  },
  pixel: {
    key: 'pixel',
    name: 'Pixel',
    role: 'Ads Strategist',
    memberType: 'ai',
    isPlaceholder: true,
    palette: '#0a4a8c',
  },
  gavin: {
    key: 'gavin',
    name: 'Gavin',
    role: 'Creative Director',
    memberType: 'human',
    isPlaceholder: false,
    palette: '#5a3820',
  },
  tristan: {
    key: 'tristan',
    name: 'Tristan',
    role: 'Sales Director',
    memberType: 'human',
    isPlaceholder: false,
    palette: '#b84a18',
  },
};
