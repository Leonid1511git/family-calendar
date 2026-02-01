import { Participant } from '../types';

// Default participants with animal avatars
export const DEFAULT_PARTICIPANTS: Participant[] = [
  { 
    id: 'lenya', 
    name: 'Леня', 
    avatar: '🦁', // Lion
    color: '#ef4444' // Red
  },
  { 
    id: 'tanya', 
    name: 'Таня', 
    avatar: '🐴', // Horse
    color: '#10b981' // Green
  },
  { 
    id: 'yasia', 
    name: 'Яся', 
    avatar: '🐵', // Monkey
    color: '#f59e0b' // Orange
  }
];

// Helper to get participant by id
export const getParticipantById = (id: string): Participant | undefined => {
  return DEFAULT_PARTICIPANTS.find(p => p.id === id);
};

// Helper to get participant by name
export const getParticipantByName = (name: string): Participant | undefined => {
  return DEFAULT_PARTICIPANTS.find(p => p.name === name);
};

