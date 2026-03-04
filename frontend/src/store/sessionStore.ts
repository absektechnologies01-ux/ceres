import { create } from 'zustand';
import type { ScanSession } from '../types';

interface SessionState {
  sessions: ScanSession[];
  activeSession: ScanSession | null;
  setSessions: (sessions: ScanSession[]) => void;
  setActiveSession: (session: ScanSession | null) => void;
  updateSession: (updated: ScanSession) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSession: null,

  setSessions: (sessions) => set({ sessions }),

  setActiveSession: (session) => set({ activeSession: session }),

  updateSession: (updated) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === updated.id ? updated : sess)),
      activeSession: s.activeSession?.id === updated.id ? updated : s.activeSession,
    })),
}));
