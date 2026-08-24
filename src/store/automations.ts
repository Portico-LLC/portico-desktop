import { create } from 'zustand';
import { api, getErrorMessage } from '@/lib/api';
import type { Workflow, WorkflowNodeConfig, WorkflowEdgeConfig, WorkflowTriggerConfig } from '@/lib/types';

interface AutomationsState {
  workflow: Workflow | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;

  loadWorkflow: (id: string) => Promise<void>;
  setMeta: (fields: { name?: string; description?: string }) => void;
  setTrigger: (trigger: WorkflowTriggerConfig) => void;
  setNodes: (nodes: WorkflowNodeConfig[]) => void;
  setEdges: (edges: WorkflowEdgeConfig[]) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeConfig['data']>) => void;
  deleteNode: (nodeId: string) => void;
  save: () => Promise<boolean>;
  setActive: (isActive: boolean) => Promise<boolean>;
  runNow: () => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

export const useAutomationsStore = create<AutomationsState>((set, get) => ({
  workflow: null,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  error: null,

  loadWorkflow: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<Workflow>(`/automations/${id}`);
      set({ workflow: data, isDirty: false });
    } catch (err) {
      set({ error: getErrorMessage(err) });
    } finally {
      set({ isLoading: false });
    }
  },

  setMeta: (fields) => {
    const workflow = get().workflow;
    if (!workflow) return;
    set({ workflow: { ...workflow, ...fields }, isDirty: true });
  },

  setTrigger: (trigger) => {
    const workflow = get().workflow;
    if (!workflow) return;
    set({ workflow: { ...workflow, trigger }, isDirty: true });
  },

  setNodes: (nodes) => {
    const workflow = get().workflow;
    if (!workflow) return;
    set({ workflow: { ...workflow, nodes }, isDirty: true });
  },

  setEdges: (edges) => {
    const workflow = get().workflow;
    if (!workflow) return;
    set({ workflow: { ...workflow, edges }, isDirty: true });
  },

  updateNodeData: (nodeId, data) => {
    const workflow = get().workflow;
    if (!workflow) return;
    set({
      workflow: {
        ...workflow,
        nodes: workflow.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      },
      isDirty: true,
    });
  },

  deleteNode: (nodeId) => {
    const workflow = get().workflow;
    if (!workflow) return;
    set({
      workflow: {
        ...workflow,
        nodes: workflow.nodes.filter((n) => n.id !== nodeId),
        edges: workflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      },
      isDirty: true,
    });
  },

  save: async () => {
    const workflow = get().workflow;
    if (!workflow) return false;
    set({ isSaving: true, error: null });
    try {
      const { data } = await api.patch<Workflow>(`/automations/${workflow.id}`, {
        name: workflow.name,
        description: workflow.description,
        trigger: workflow.trigger,
        nodes: workflow.nodes,
        edges: workflow.edges,
      });
      set({ workflow: data, isDirty: false });
      return true;
    } catch (err) {
      set({ error: getErrorMessage(err) });
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  setActive: async (isActive) => {
    const workflow = get().workflow;
    if (!workflow) return false;
    // Activating (or re-activating after an edit) always persists the latest graph first,
    // so the server validates the graph it's about to run, not a stale one.
    if (isActive) {
      const saved = await get().save();
      if (!saved) return false;
    }
    set({ isSaving: true, error: null });
    try {
      const { data } = await api.patch<Workflow>(`/automations/${workflow.id}/active`, { isActive });
      set({ workflow: data });
      return true;
    } catch (err) {
      set({ error: getErrorMessage(err) });
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  runNow: async () => {
    const workflow = get().workflow;
    if (!workflow) return false;
    set({ error: null });
    try {
      await api.post(`/automations/${workflow.id}/run`);
      return true;
    } catch (err) {
      set({ error: getErrorMessage(err) });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({ workflow: null, isLoading: false, isSaving: false, isDirty: false, error: null }),
}));
