<script lang="ts">
  /**
   * Graph component - D3.js force-directed graph visualization
   * Task 5.3: Node rendering
   */
  import { onMount, onDestroy } from "svelte";
  import * as d3 from "d3";
  import type { Node, Edge, NodeType } from "$lib/types";

  // Props using Svelte 5 runes
  interface Props {
    nodes?: Node[];
    edges?: Edge[];
    selectedNodeId?: string | null;
    onNodeClick?: (nodeId: string, node: Node) => void;
    onNodeDoubleClick?: (nodeId: string, node: Node) => void;
  }

  let {
    nodes = [],
    edges = [],
    selectedNodeId = null,
    onNodeClick,
    onNodeDoubleClick,
  }: Props = $props();

  // DOM refs - using $state for bind:this
  let container: HTMLDivElement | undefined = $state();
  let svgElement: SVGSVGElement | undefined = $state();

  // D3 selections
  type NodeDatum = Node & d3.SimulationNodeDatum;
  type EdgeDatum = d3.SimulationLinkDatum<NodeDatum> & Edge;

  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let g: d3.Selection<SVGGElement, unknown, null, undefined>;
  let simulation: d3.Simulation<NodeDatum, EdgeDatum>;
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;

  // Track previous node positions to preserve layout on updates
  let nodePositions = new Map<string, { x: number; y: number }>();

  // Graph configuration
  const NODE_RADIUS = 12;
  const LABEL_OFFSET = 18;
  const MAX_LABEL_LENGTH = 30;

  // Node type to color mapping
  const nodeColors: Record<NodeType, string> = {
    coding: "var(--color-node-coding)",
    debugging: "var(--color-node-debugging)",
    refactor: "var(--color-node-refactor)",
    sysadmin: "var(--color-node-sysadmin)",
    research: "var(--color-node-research)",
    planning: "var(--color-node-planning)",
    brainstorm: "var(--color-node-brainstorm)",
    documentation: "var(--color-node-documentation)",
    configuration: "var(--color-node-configuration)",
    qa: "var(--color-node-qa)",
    handoff: "var(--color-node-handoff)",
    other: "var(--color-node-other)",
  };

  function getNodeColor(type: NodeType): string {
    return nodeColors[type] || "var(--color-node-other)";
  }

  function truncateLabel(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 1) + "…";
  }

  function initGraph(): void {
    if (!container || !svgElement) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create SVG
    svg = d3.select(svgElement).attr("width", width).attr("height", height);

    // Clear any existing content
    svg.selectAll("*").remove();

    // Add defs for markers (arrowheads)
    const defs = svg.append("defs");

    // Arrowhead marker
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", NODE_RADIUS + 10)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .append("path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")
      .attr("fill", "var(--color-border)");

    // Main group for zoom/pan
    g = svg.append("g").attr("class", "graph-content");

    // Edges group (rendered first, below nodes)
    g.append("g").attr("class", "edges");

    // Nodes group (rendered on top)
    g.append("g").attr("class", "nodes");

    // Setup zoom behavior
    zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);

    // Initialize force simulation
    simulation = d3
      .forceSimulation<NodeDatum, EdgeDatum>()
      .force(
        "link",
        d3
          .forceLink<NodeDatum, EdgeDatum>()
          .id((d) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(NODE_RADIUS + 5))
      .on("tick", ticked);

    // Initial render
    updateGraph();
  }

  function updateGraph(): void {
    if (!svg || !simulation) {
      return;
    }

    // Save current positions before updating
    g.select(".nodes")
      .selectAll<SVGGElement, NodeDatum>("g.node")
      .each((d) => {
        if (d.x !== undefined && d.y !== undefined) {
          nodePositions.set(d.id, { x: d.x, y: d.y });
        }
      });

    // Convert nodes to simulation data, preserving positions
    const simNodes: NodeDatum[] = nodes.map((n) => {
      const existingPos = nodePositions.get(n.id);
      return {
        ...n,
        x: existingPos?.x,
        y: existingPos?.y,
      };
    });

    // Convert edges to simulation links
    const simEdges: EdgeDatum[] = edges.map((e) => ({
      ...e,
      source: e.sourceNodeId,
      target: e.targetNodeId,
    }));

    // Update edges
    const edgeGroup = g.select<SVGGElement>(".edges");
    const edgeSelection = edgeGroup
      .selectAll<SVGLineElement, EdgeDatum>("line")
      .data(simEdges, (d) => d.id);

    // Remove old edges
    edgeSelection.exit().remove();

    // Add new edges
    edgeSelection
      .enter()
      .append("line")
      .attr("stroke", "var(--color-border)")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)")
      .attr("opacity", 0.6);

    // Update nodes
    const nodeGroup = g.select<SVGGElement>(".nodes");
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, NodeDatum>("g.node")
      .data(simNodes, (d) => d.id);

    // Remove old nodes
    nodeSelection.exit().remove();

    // Add new nodes
    const nodeEnter = nodeSelection
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag<SVGGElement, NodeDatum>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event: MouseEvent, d: NodeDatum) => {
        event.stopPropagation();
        onNodeClick?.(d.id, d);
      })
      .on("dblclick", (event: MouseEvent, d: NodeDatum) => {
        event.stopPropagation();
        onNodeDoubleClick?.(d.id, d);
      });

    // Node circle
    nodeEnter
      .append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", (d) => getNodeColor(d.classification.type))
      .attr("stroke", "transparent")
      .attr("stroke-width", 3)
      .attr("cursor", "pointer");

    // Node label
    nodeEnter
      .append("text")
      .attr("dx", LABEL_OFFSET)
      .attr("dy", 4)
      .attr("class", "node-label")
      .text((d) => truncateLabel(d.content.summary, MAX_LABEL_LENGTH));

    // Update existing nodes - merge enter and update selections
    const allNodes = nodeEnter.merge(nodeSelection);

    // Update circle fills (for when data changes)
    allNodes
      .select("circle")
      .attr("fill", (d) => getNodeColor(d.classification.type));

    // Update labels
    allNodes
      .select("text")
      .text((d) => truncateLabel(d.content.summary, MAX_LABEL_LENGTH));

    // Update selection state
    allNodes.classed("selected", (d) => d.id === selectedNodeId);

    // Update simulation
    simulation.nodes(simNodes);

    const linkForce = simulation.force<d3.ForceLink<NodeDatum, EdgeDatum>>(
      "link"
    );
    if (linkForce) {
      linkForce.links(simEdges);
    }

    // Restart simulation with some alpha
    simulation.alpha(0.3).restart();
  }

  function ticked(): void {
    // Update edge positions
    g.select(".edges")
      .selectAll<SVGLineElement, EdgeDatum>("line")
      .attr("x1", (d) => {
        const source = d.source as NodeDatum;
        return source.x ?? 0;
      })
      .attr("y1", (d) => {
        const source = d.source as NodeDatum;
        return source.y ?? 0;
      })
      .attr("x2", (d) => {
        const target = d.target as NodeDatum;
        return target.x ?? 0;
      })
      .attr("y2", (d) => {
        const target = d.target as NodeDatum;
        return target.y ?? 0;
      });

    // Update node positions
    g.select(".nodes")
      .selectAll<SVGGElement, NodeDatum>("g.node")
      .attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
  }

  // Drag handlers
  function dragstarted(
    event: d3.D3DragEvent<SVGGElement, NodeDatum, NodeDatum>,
    d: NodeDatum
  ): void {
    if (!event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(
    event: d3.D3DragEvent<SVGGElement, NodeDatum, NodeDatum>,
    d: NodeDatum
  ): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(
    event: d3.D3DragEvent<SVGGElement, NodeDatum, NodeDatum>,
    d: NodeDatum
  ): void {
    if (!event.active) {
      simulation.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }

  // Zoom controls
  export function zoomIn(): void {
    svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
  }

  export function zoomOut(): void {
    svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
  }

  export function resetZoom(): void {
    svg
      .transition()
      .duration(300)
      .call(zoomBehavior.transform, d3.zoomIdentity);
  }

  export function fitToContent(): void {
    if (nodes.length === 0 || !container) {
      return;
    }

    const nodesElement = g.select(".nodes").node() as SVGGElement | null;
    if (!nodesElement) {
      return;
    }

    const nodeBounds = nodesElement.getBBox();
    if (!nodeBounds) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const padding = 50;

    const scale = Math.min(
      (width - padding * 2) / nodeBounds.width,
      (height - padding * 2) / nodeBounds.height,
      1
    );

    const translateX =
      width / 2 - scale * (nodeBounds.x + nodeBounds.width / 2);
    const translateY =
      height / 2 - scale * (nodeBounds.y + nodeBounds.height / 2);

    svg
      .transition()
      .duration(300)
      .call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(scale)
      );
  }

  // Handle resize with debouncing
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

  function handleResize(): void {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (!container || !svg) {
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;

      svg.attr("width", width).attr("height", height);

      // Update center force
      const centerForce = simulation.force<d3.ForceCenter<NodeDatum>>("center");
      if (centerForce) {
        centerForce.x(width / 2).y(height / 2);
      }

      simulation.alpha(0.1).restart();
    }, 100);
  }

  // Lifecycle
  onMount(() => {
    initGraph();
  });

  onDestroy(() => {
    if (simulation) {
      simulation.stop();
    }
    clearTimeout(resizeTimeout);
  });

  // ResizeObserver for precise container tracking with cleanup
  $effect(() => {
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(() => handleResize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(resizeTimeout);
    };
  });

  // Reactivity using $effect - trigger update when nodes or edges change
  $effect(() => {
    // Access nodes and edges to create dependency on the props
    // Using join of IDs ensures we detect both length and content changes
    const _nodeSignature = nodes.map((n) => n.id).join(",");
    const _edgeSignature = edges.map((e) => e.id).join(",");
    if (svg && (_nodeSignature !== undefined || _edgeSignature !== undefined)) {
      updateGraph();
    }
  });

  $effect(() => {
    if (svg && selectedNodeId !== undefined) {
      g.select(".nodes")
        .selectAll<SVGGElement, NodeDatum>("g.node")
        .classed("selected", (d) => d.id === selectedNodeId);
    }
  });
</script>

<div class="graph-container" bind:this={container}>
  <svg bind:this={svgElement} role="img" aria-label="Knowledge graph">
    <title>Knowledge graph showing connected nodes</title>
  </svg>

  <div class="controls" role="group" aria-label="Graph controls">
    <button
      type="button"
      class="btn-icon btn-secondary"
      onclick={zoomIn}
      aria-label="Zoom in"
      title="Zoom in"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
    <button
      type="button"
      class="btn-icon btn-secondary"
      onclick={zoomOut}
      aria-label="Zoom out"
      title="Zoom out"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
    <button
      type="button"
      class="btn-icon btn-secondary"
      onclick={resetZoom}
      aria-label="Reset zoom"
      title="Reset zoom"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </button>
    <button
      type="button"
      class="btn-icon btn-secondary"
      onclick={fitToContent}
      aria-label="Fit to content"
      title="Fit to content"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
    </button>
  </div>

  {#if nodes.length === 0}
    <div class="empty-state" role="status">
      <p>No nodes to display</p>
      <p class="hint">Load data or adjust filters to see the graph</p>
    </div>
  {/if}
</div>

<style>
  .graph-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .controls {
    position: absolute;
    bottom: var(--space-4);
    left: var(--space-4);
    display: flex;
    gap: var(--space-1);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-1);
  }

  .controls button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--color-text-muted);
  }

  .empty-state .hint {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
    margin-top: var(--space-2);
  }

  /* Node styles (applied via D3) */
  :global(.node) {
    cursor: pointer;
    transition: transform var(--transition-fast);
  }

  :global(.node:hover circle) {
    filter: brightness(1.2);
  }

  :global(.node.selected circle) {
    stroke: var(--color-accent);
    stroke-width: 3px;
  }

  :global(.node-label) {
    font-size: var(--text-xs);
    fill: var(--color-text-muted);
    pointer-events: none;
    user-select: none;
  }

  :global(.node.selected .node-label) {
    fill: var(--color-text);
    font-weight: 500;
  }
</style>
