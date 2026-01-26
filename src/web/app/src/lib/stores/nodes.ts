/**
 * Nodes store - manages node data and selection state
 */

import type { Node, Edge, NodeFilters } from "$lib/types";

import { api } from "$lib/api/client";
import { writable, derived } from "svelte/store";

interface NodesState {
  nodes: Node[];
  edges: Edge[];
  loading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  filters: NodeFilters;
  total: number;
  limit: number;
  offset: number;
}

const initialState: NodesState = {
  nodes: [],
  edges: [],
  loading: false,
  error: null,
  selectedNodeId: null,
  filters: {},
  total: 0,
  limit: 50,
  offset: 0,
};

function createNodesStore() {
  const { subscribe, set, update } = writable<NodesState>(initialState);

  return {
    subscribe,

    async loadNodes(
      filters?: NodeFilters,
      options?: { limit?: number; offset?: number }
    ) {
      update((s) => ({ ...s, loading: true, error: null }));

      try {
        const response = await api.listNodes(filters, options);
        update((s) => ({
          ...s,
          nodes: response.nodes,
          total: response.total,
          limit: response.limit,
          offset: response.offset,
          loading: false,
          filters: filters ?? {},
        }));
      } catch (error) {
        update((s) => ({
          ...s,
          loading: false,
          error:
            error instanceof Error ? error.message : "Failed to load nodes",
        }));
      }
    },

    async loadConnected(nodeId: string, depth = 1) {
      update((s) => ({ ...s, loading: true, error: null }));

      try {
        const response = await api.getConnectedNodes(nodeId, depth);
        update((s) => ({
          ...s,
          nodes: response.nodes,
          edges: response.edges,
          loading: false,
        }));
      } catch (error) {
        update((s) => ({
          ...s,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load connected nodes",
        }));
      }
    },

    selectNode(nodeId: string | null) {
      update((s) => ({ ...s, selectedNodeId: nodeId }));
    },

    setFilters(filters: NodeFilters) {
      update((s) => ({ ...s, filters }));
    },

    reset() {
      set(initialState);
    },
  };
}

export const nodesStore = createNodesStore();

// Derived store for the currently selected node
export const selectedNode = derived(
  nodesStore,
  ($store) => $store.nodes.find((n) => n.id === $store.selectedNodeId) ?? null
);
