import type { IndicatorType } from '../DeskIndicator';

export type MemberType = 'ai' | 'human';

export interface AgentConfig {
  key: string;
  name: string;
  role: string;
  memberType: MemberType;
  isPlaceholder: boolean;
  palette: string;       // primary colour — badge border + icon tint
  indicator: IndicatorType;
}

export const AGENTS: Record<string, AgentConfig> = {
  corey: {
    key: 'corey',
    name: 'Corey',
    role: 'Founder',
    memberType: 'human',
    isPlaceholder: false,
    palette: '#c48a12',
    indicator: 'crown',
  },
  lev: {
    key: 'lev',
    name: 'Lev',
    role: 'Chief of Staff',
    memberType: 'ai',
    isPlaceholder: false,
    palette: '#d4822a',
    indicator: 'briefcase',
  },
  scout: {
    key: 'scout',
    name: 'Scout',
    role: 'Research',
    memberType: 'ai',
    isPlaceholder: false,
    palette: '#3d8a52',
    indicator: 'magnifying_glass',
  },
  quill: {
    key: 'quill',
    name: 'Quill',
    role: 'Social Media Strategist',
    memberType: 'ai',
    isPlaceholder: false,
    palette: '#7a1a2e',
    indicator: 'social_stack',
  },
  ember: {
    key: 'ember',
    name: 'Ember',
    role: 'Email Strategist',
    memberType: 'ai',
    isPlaceholder: false,
    palette: '#9a6018',
    indicator: 'envelope',
  },
  forge: {
    key: 'forge',
    name: 'Forge',
    role: 'Lead Developer',
    memberType: 'ai',
    isPlaceholder: true,
    palette: '#1e3a5a',
    indicator: 'code_brackets',
  },
  pixel: {
    key: 'pixel',
    name: 'Pixel',
    role: 'Ads Strategist',
    memberType: 'ai',
    isPlaceholder: true,
    palette: '#0a4a8c',
    indicator: 'bullseye',
  },
  gavin: {
    key: 'gavin',
    name: 'Gavin',
    role: 'Creative Director',
    memberType: 'human',
    isPlaceholder: false,
    palette: '#7a4e30',
    indicator: 'video_camera',
  },
  tristan: {
    key: 'tristan',
    name: 'Tristan',
    role: 'Sales Director',
    memberType: 'human',
    isPlaceholder: false,
    palette: '#2a8a48',
    indicator: 'handshake',
  },
};
