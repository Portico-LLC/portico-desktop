import { create } from 'zustand';
import { api, getErrorMessage } from '@/lib/api';
import type { StewardProposal, StewardProposedStep } from '@/lib/types';

interface StewardState {
  proposals: StewardProposal[];
  isLoading: boolean;
  error: string | null;

  fetchProposals: () => Promise<void>;
  approve: (id: string, editedSteps?: StewardProposedStep[]) => Promise<boolean>;
  dismiss: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useStewardStore = create<StewardState>((set, get) => ({
  proposals: [],
  isLoading: false,
  error: null,

  fetchProposals: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<StewardProposal[]>('/steward/proposals');
      set({ proposals: data });
    } catch (err) {
      set({ error: getErrorMessage(err) });
    } finally {
      set({ isLoading: false });
    }
  },

  approve: async (id, editedSteps) => {
    try {
      const { data } = await api.post<StewardProposal>(`/steward/proposals/${id}/approve`, { editedSteps });
      set({ proposals: get().proposals.map((p) => (p.id === id ? data : p)) });
      return true;
    } catch (err) {
      set({ error: getErrorMessage(err) });
      return false;
    }
  },

  dismiss: async (id) => {
    try {
      const { data } = await api.post<StewardProposal>(`/steward/proposals/${id}/dismiss`);
      set({ proposals: get().proposals.map((p) => (p.id === id ? data : p)) });
      return true;
    } catch (err) {
      set({ error: getErrorMessage(err) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
