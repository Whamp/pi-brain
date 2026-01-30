<script lang="ts">
  /**
   * Graph component - D3.js graph visualization with multiple layouts
   * Task 6.3: Minimap, search, and layout options
   */
  import { onMount, onDestroy } from "svelte";
  import * as d3 from "d3";
  import { Network, ArrowRight, Settings, Search } from "lucide-svelte";
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
  let minimapElement: HTMLButtonElement | undefined = $state();
  let minimapSvg: SVGSVGElement | undefined = $state();
  let tooltipElement: HTMLDivElement | undefined = $state();

  // Tooltip state
  let tooltipVisible = $state(false);
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let tooltipNode: Node | null = $state(null);

  // Search state
  let searchQuery = $state("");
  let searchResults: Node[] = $state([]);
  let selectedSearchIndex = $state(0);
  let showSearchDropdown = $state(false);

  // Layout state
  type LayoutType = "force" | "hierarchical" | "radial";
  let currentLayout = $state<LayoutType>("force");

  // D3 selections
  type NodeDatum = Node & d3.SimulationNodeDatum;
  type EdgeDatum = d3.SimulationLinkDatum<NodeDatum> & Edge;

  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let g: d3.Selection<SVGGElement, unknown, null, undefined>;
  let minimapSelection: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let minimapG: d3.Selection<SVGGElement, unknown, null, undefined>;
  let minimapViewport: d3.Selection<SVGRectElement, unknown, null, undefined>;
  let simulation: d3.Simulation<NodeDatum, EdgeDatum>;
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;

  // Track previous node positions to preserve layout on updates
  let nodePositions = new Map<string, { x: number; y: number }>();

  // Graph configuration
  const NODE_RADIUS = 12;
  const LABEL_OFFSET = 18;
  const MAX_LABEL_LENGTH = 30;
  const MINIMAP_SCALE = 0.15;

  // Node type to color mapping
  const nodeColors: Record<NodeType, string> = {
    coding: "var(--color-node-coding)",
    debugging: "var(--color-node-debugging)",
    refactoring: "var(--color-node-refactor)",
    sysadmin: "var(--color-node-sysadmin)",
    research: "var(--color-node-research)",
    planning: "var(--color-node-planning)",
    brainstorm: "var(--color-node-brainstorm)",
    documentation: "var(--color-node-documentation)",
    configuration: "var(--color-node-configuration)",
    qa: "var(--color-node-qa)",
    handoff: "var(--color-node-handoff)",
    other: "var(--color-node-other)",
    data: "var(--color-node-other)",
  };

  function getNodeColor(type: NodeType): string {
    return nodeColors[type] || "var(--color-node-other)";
  }

  function truncateLabel(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 1)}…`;
  }

  // Search functions
  function performSearch(): void {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      searchResults = [];
      showSearchDropdown = false;
      return;
    }

    searchResults = nodes.filter(
      (node) =>
        node.content?.summary?.toLowerCase().includes(query) ||
        node.classification?.project?.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query)
    );
    selectedSearchIndex = 0;
    showSearchDropdown = true;
  }

  function selectSearchResult(node: Node): void {
    onNodeClick?.(node.id, node);
    centerOnNode(node.id);
    searchQuery = "";
    searchResults = [];
    showSearchDropdown = false;
  }

  function centerOnNode(nodeId: string): void {
    const nodeDatum = nodes.find((n) => n.id === nodeId);
    if (!nodeDatum || !container || !svg) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const x = (nodeDatum as NodeDatum).x ?? 0;
    const y = (nodeDatum as NodeDatum).y ?? 0;

    // Get current transform
    if (!svgElement) {
      return;
    }
    const currentTransform = d3.zoomTransform(svgElement);
    const newScale = 1.5;

    const newTransform = d3.zoomIdentity
      .translate(width / 2 - x * newScale, height / 2 - y * newScale)
      .scale(newScale);

    svg.transition().duration(500).call(zoomBehavior.transform, newTransform);
  }

  function handleSearchKeydown(event: KeyboardEvent): void {
    if (!showSearchDropdown || searchResults.length === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        selectedSearchIndex = Math.min(selectedSearchIndex + 1, searchResults.length - 1);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
        break;
      }
      case "Enter": {
        event.preventDefault();
        selectSearchResult(searchResults[selectedSearchIndex]);
        break;
      }
      case "Escape": {
        event.preventDefault();
        showSearchDropdown = false;
        break;
      }
      default: {
        break;
      }
    }
  }

  // Layout functions
  function applyLayout(layoutType: LayoutType): void {
    currentLayout = layoutType;

    if (!simulation || nodes.length === 0) {
      return;
    }

    const simNodes: NodeDatum[] = nodes.map((n) => {
      const existingPos = nodePositions.get(n.id);
      return {
        ...n,
        x: existingPos?.x,
        y: existingPos?.y,
      };
    });

    const { width, height } = container
      ? { width: container.clientWidth, height: container.clientHeight }
      : { width: 800, height: 600 };

    // Clear all forces
    simulation.stop();

    switch (layoutType) {
      case "hierarchical": {
        applyHierarchicalLayout(simNodes, width, height);
        break;
      }
      case "radial": {
        applyRadialLayout(simNodes, width, height);
        break;
      }
      default: {
        applyForceLayout(simNodes, width, height);
        break;
      }
    }

    // Update simulation with new node positions
    simulation.nodes(simNodes);
    const linkForce = simulation.force<d3.ForceLink<NodeDatum, EdgeDatum>>("link");
    if (linkForce) {
      const simEdges = edges.map((e) => ({
        ...e,
        source: e.sourceNodeId,
        target: e.targetNodeId,
      }));
      linkForce.links(simEdges);
    }

    simulation.alpha(1).restart();
  }

  function applyForceLayout(simNodes: NodeDatum[], width: number, height: number): void {
    // Unfix nodes for force layout
    for (const node of simNodes) {
      node.fx = null;
      node.fy = null;
    }

    simulation
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(NODE_RADIUS + 5));
  }

  interface HierarchyData {
    nodeSet: Set<string>;
    adjacency: Map<string, string[]>;
    hasIncoming: Set<string>;
  }

  function buildHierarchyData(simNodes: NodeDatum[]): HierarchyData {
    const nodeSet = new Set(simNodes.map((n) => n.id));
    const adjacency = new Map<string, string[]>();

    for (const node of simNodes) {
      adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      if (nodeSet.has(edge.sourceNodeId) && nodeSet.has(edge.targetNodeId)) {
        adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId);
      }
    }

    const hasIncoming = new Set<string>();
    for (const edge of edges) {
      if (nodeSet.has(edge.targetNodeId)) {
        hasIncoming.add(edge.targetNodeId);
      }
    }

    return { nodeSet, adjacency, hasIncoming };
  }

  function assignNodeLevels(
    rootId: string,
    adjacency: Map<string, string[]>
  ): Map<string, number> {
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    function assignLevel(nodeId: string, level: number): void {
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);
      levels.set(nodeId, level);

      const children = adjacency.get(nodeId) || [];
      for (const childId of children) {
        assignLevel(childId, level + 1);
      }
    }

    assignLevel(rootId, 0);
    return levels;
  }

  function positionNodesInLevels(
    simNodes: NodeDatum[],
    levels: Map<string, number>,
    width: number,
    height: number
  ): void {
    const maxLevel = Math.max(...levels.values());
    const levelHeight = height / (maxLevel + 2);

    const levelGroups = new Map<number, NodeDatum[]>();
    for (const node of simNodes) {
      const level = levels.get(node.id) ?? 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)?.push(node);
    }

    for (const [level, nodesInLevel] of levelGroups.entries()) {
      const y = (level + 1) * levelHeight;
      const levelWidth = width / (nodesInLevel.length + 1);

      for (let index = 0; index < nodesInLevel.length; index++) {
        const node = nodesInLevel[index];
        node.x = (index + 1) * levelWidth;
        node.y = y;
        node.fx = node.x;
        node.fy = node.y;
      }
    }
  }

  function disablePhysicsForces(): void {
    simulation.force("charge", null);
    simulation.force("center", null);
    simulation.force("collision", null);
  }

  function applyHierarchicalLayout(simNodes: NodeDatum[], width: number, height: number): void {
    const { adjacency, hasIncoming } = buildHierarchyData(simNodes);
    const root = simNodes.find((n) => !hasIncoming.has(n.id)) ?? simNodes[0];
    const levels = assignNodeLevels(root.id, adjacency);
    positionNodesInLevels(simNodes, levels, width, height);
    disablePhysicsForces();
  }

  function applyRadialLayout(simNodes: NodeDatum[], width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 50;

    // Group nodes by type
    const typeGroups = new Map<NodeType, NodeDatum[]>();
    for (const node of simNodes) {
      const { type } = node.classification;
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)?.push(node);
    }

    const numTypes = typeGroups.size;
    const anglePerType = (2 * Math.PI) / numTypes;

    const typeKeys = [...typeGroups.keys()];
    for (const [type, nodesInType] of typeGroups.entries()) {
      const typeIndex = typeKeys.indexOf(type);
      const baseAngle = typeIndex * anglePerType;

      for (let index = 0; index < nodesInType.length; index++) {
        const node = nodesInType[index];
        const angleOffset = (index / nodesInType.length) * anglePerType;
        const angle = baseAngle + angleOffset;
        const radius = 50 + (index / nodesInType.length) * (maxRadius - 50);

        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
        node.fx = node.x;
        node.fy = node.y;
      }
    }

    // Disable physics forces for radial layout
    simulation.force("charge", null);
    simulation.force("center", null);
    simulation.force("collision", null);
  }

  // Minimap functions
  function initMinimap(): void {
    if (!minimapSvg || !container) {
      return;
    }

    minimapSelection = d3.select(minimapSvg);
    minimapSelection.selectAll("*").remove();

    const width = container.clientWidth * MINIMAP_SCALE;
    const height = container.clientHeight * MINIMAP_SCALE;

    minimapSelection.attr("width", width).attr("height", height);

    minimapG = minimapSelection.append("g").attr("class", "minimap-content");

    // Edges
    minimapG.append("g").attr("class", "minimap-edges");

    // Nodes
    minimapG.append("g").attr("class", "minimap-nodes");

    // Viewport indicator
    minimapViewport = minimapG
      .append("rect")
      .attr("class", "minimap-viewport")
      .attr("stroke", "var(--color-accent)")
      .attr("stroke-width", 1)
      .attr("fill", "rgba(0, 217, 255, 0.1)")
      .style("cursor", "move");
  }

  interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }

  function calculateNodeBounds(): BoundingBox {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of nodes) {
      const d = n as NodeDatum;
      minX = Math.min(minX, d.x ?? 0);
      maxX = Math.max(maxX, d.x ?? 0);
      minY = Math.min(minY, d.y ?? 0);
      maxY = Math.max(maxY, d.y ?? 0);
    }

    const padding = 100;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }

  function updateMinimapEdges(
    minimapEdgeGroup: d3.Selection<d3.BaseType, unknown, null, undefined>,
    contentWidth: number,
    minimapWidth: number
  ): void {
    const edgeSelection = minimapEdgeGroup
      .selectAll<SVGLineElement, EdgeDatum>("line")
      .data(edges);

    edgeSelection.exit().remove();

    edgeSelection
      .enter()
      .append("line")
      .attr("stroke", "var(--color-border)")
      .attr("opacity", 0.4)
      .merge(edgeSelection)
      .attr("stroke-width", (contentWidth / minimapWidth) * 1)
      .attr("x1", (d) => (nodes.find((n) => n.id === d.sourceNodeId) as NodeDatum)?.x ?? 0)
      .attr("y1", (d) => (nodes.find((n) => n.id === d.sourceNodeId) as NodeDatum)?.y ?? 0)
      .attr("x2", (d) => (nodes.find((n) => n.id === d.targetNodeId) as NodeDatum)?.x ?? 0)
      .attr("y2", (d) => (nodes.find((n) => n.id === d.targetNodeId) as NodeDatum)?.y ?? 0);
  }

  function updateMinimapNodes(
    minimapNodeGroup: d3.Selection<d3.BaseType, unknown, null, undefined>,
    contentWidth: number,
    minimapWidth: number
  ): void {
    const nodeSelection = minimapNodeGroup
      .selectAll<SVGCircleElement, Node>("circle")
      .data(nodes);

    nodeSelection.exit().remove();

    nodeSelection
      .enter()
      .append("circle")
      .attr("cursor", "pointer")
      .merge(nodeSelection)
      .attr("r", (contentWidth / minimapWidth) * 4)
      .attr("cx", (d) => (d as NodeDatum).x ?? 0)
      .attr("cy", (d) => (d as NodeDatum).y ?? 0)
      .attr("fill", (d) => getNodeColor(d.classification.type))
      .attr("stroke", (d) => (d.id === selectedNodeId ? "var(--color-accent)" : "none"))
      .attr("stroke-width", (contentWidth / minimapWidth) * 2)
      .on("click", (event: MouseEvent, d: Node) => {
        event.stopPropagation();
        onNodeClick?.(d.id, d);
      });
  }

  function updateMinimapViewport(contentWidth: number, minimapWidth: number): void {
    if (!svgElement || !minimapViewport || !container) {
      return;
    }
    const transform = d3.zoomTransform(svgElement);
    const worldX = -transform.x / transform.k;
    const worldY = -transform.y / transform.k;
    const worldWidth = container.clientWidth / transform.k;
    const worldHeight = container.clientHeight / transform.k;

    minimapViewport
      .attr("x", worldX)
      .attr("y", worldY)
      .attr("width", worldWidth)
      .attr("height", worldHeight)
      .attr("stroke-width", (contentWidth / minimapWidth) * 2);
  }

  function updateMinimap(): void {
    if (!minimapSelection || !minimapG || !container || nodes.length === 0) {
      return;
    }

    const minimapWidth = container.clientWidth * MINIMAP_SCALE;

    const bounds = calculateNodeBounds();
    const contentWidth = Math.max(bounds.maxX - bounds.minX, 100);
    const contentHeight = Math.max(bounds.maxY - bounds.minY, 100);

    minimapSvg.attr("viewBox", `${bounds.minX} ${bounds.minY} ${contentWidth} ${contentHeight}`);

    updateMinimapEdges(minimapG.select(".minimap-edges"), contentWidth, minimapWidth);
    updateMinimapNodes(minimapG.select(".minimap-nodes"), contentWidth, minimapWidth);
    updateMinimapViewport(contentWidth, minimapWidth);
  }

  function handleMinimapClick(event: MouseEvent): void {
    if (!svgElement || !container || !minimapElement) {
      return;
    }

    // Get click coordinates in the minimap SVG's coordinate system (viewBox)
    const [x, y] = d3.pointer(event, minimapElement);

    const width = container.clientWidth;
    const height = container.clientHeight;

    const currentTransform = d3.zoomTransform(svgElement);
    const newTransform = d3.zoomIdentity
      .translate(width / 2 - x * currentTransform.k, height / 2 - y * currentTransform.k)
      .scale(currentTransform.k);

    svg.transition().duration(300).call(zoomBehavior.transform, newTransform);
  }

  // Tooltip functions
  function showTooltip(event: MouseEvent, node: NodeDatum): void {
    tooltipNode = node;
    updateTooltipPosition(event);
    tooltipVisible = true;
  }

  function updateTooltipPosition(event: MouseEvent): void {
    if (!container) {return;}
    const rect = container.getBoundingClientRect();
    const TOOLTIP_OFFSET = 12;
    
    // Position tooltip to the right of cursor, but flip if near edge
    let x = event.clientX - rect.left + TOOLTIP_OFFSET;
    let y = event.clientY - rect.top + TOOLTIP_OFFSET;
    
    // Flip horizontally if too close to right edge
    if (x + 280 > rect.width) {
      x = event.clientX - rect.left - 280 - TOOLTIP_OFFSET;
    }
    
    // Flip vertically if too close to bottom edge
    if (y + 150 > rect.height) {
      y = event.clientY - rect.top - 150 - TOOLTIP_OFFSET;
    }
    
    tooltipX = x;
    tooltipY = y;
  }

  function hideTooltip(): void {
    tooltipVisible = false;
    tooltipNode = null;
  }

  function formatOutcome(outcome: string | undefined): string {
    if (!outcome) {return "Unknown";}
    // Capitalize first letter
    return outcome.charAt(0).toUpperCase() + outcome.slice(1);
  }

  interface EdgeStyleConfig {
    width: number;
    dasharray: string | null;
  }

  const EDGE_STYLE_MAP: Record<string, EdgeStyleConfig> = {
    fork: { width: 2, dasharray: null },
    branch: { width: 2, dasharray: null },
    continuation: { width: 2, dasharray: null },
    handoff: { width: 3, dasharray: null },
    tree_jump: { width: 1.5, dasharray: "5,5" },
    resume: { width: 1.5, dasharray: "8,4" },
    compaction: { width: 4, dasharray: "4,2" },
    reference: { width: 1.5, dasharray: "5,2" },
    lesson_application: { width: 2, dasharray: "2,2" },
    failure_pattern: { width: 2, dasharray: "1,1" },
    project_related: { width: 1.2, dasharray: "4,4" },
    technique_shared: { width: 1.2, dasharray: "2,4" },
  };

  const DEFAULT_EDGE_STYLE: EdgeStyleConfig = { width: 2, dasharray: null };

  function getSemanticEdgeStyle(edge: EdgeDatum): EdgeStyleConfig {
    const similarity = edge.metadata?.similarity ?? 0.5;
    return { width: 0.5 + similarity * 3, dasharray: "1,3" };
  }

  function getEdgeStyle(edge: EdgeDatum): { dasharray: string | null; width: number } {
    const { type } = edge;

    if (type === "semantic") {
      return getSemanticEdgeStyle(edge);
    }

    return EDGE_STYLE_MAP[type] ?? DEFAULT_EDGE_STYLE;
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
        updateMinimap(); // Update minimap viewport on zoom/pan
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

    // Initialize minimap
    initMinimap();

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

    // Apply current layout
    const { clientWidth, clientHeight } = container ?? { clientWidth: 800, clientHeight: 600 };
    switch (currentLayout) {
      case "hierarchical": {
        applyHierarchicalLayout(simNodes, clientWidth, clientHeight);
        break;
      }
      case "radial": {
        applyRadialLayout(simNodes, clientWidth, clientHeight);
        break;
      }
      default: {
        break;
      }
    }

    // Update edges
    const edgeGroup = g.select<SVGGElement>(".edges");
    const edgeSelection = edgeGroup
      .selectAll<SVGLineElement, EdgeDatum>("line")
      .data(simEdges, (d) => d.id);

    // Remove old edges
    edgeSelection.exit().remove();

    // Add new edges with draw animation
    const edgeEnter = edgeSelection
      .enter()
      .append("line")
      .attr("stroke", "var(--color-border)")
      .attr("stroke-width", (d) => getEdgeStyle(d).width)
      .attr("marker-end", "url(#arrowhead)")
      .attr("opacity", 0)
      .attr("stroke-dasharray", "0")
      .attr("stroke-dashoffset", 0);

    // Animate edges in with draw effect
    edgeEnter
      .transition()
      .duration(400)
      .delay((_, i) => i * 30) // Stagger edge animations
      .attr("opacity", 0.6)
      .on("start", function onEdgeAnimStart() {
        // Calculate length and animate stroke-dashoffset
        const line = d3.select(this);
        const length = 200; // Approximate initial length
        line
          .attr("stroke-dasharray", `${length} ${length}`)
          .attr("stroke-dashoffset", length);
      })
      .attrTween("stroke-dashoffset", function tweenDashoffset() {
        const length = 200;
        const interpolator = d3.interpolateNumber(length, 0);
        return (t: number) => interpolator(t).toString();
      })
      .on("end", function onEdgeAnimEnd(d) {
        // Apply final dash pattern after animation completes
        const style = getEdgeStyle(d);
        d3.select(this)
          .attr("stroke-dasharray", style.dasharray)
          .attr("stroke-width", style.width);
      });

    // Update existing edges
    edgeSelection
      .attr("stroke-width", (d) => getEdgeStyle(d).width)
      .attr("stroke-dasharray", (d) => getEdgeStyle(d).dasharray)
      .attr("opacity", 0.6);

    // Update nodes
    const nodeGroup = g.select<SVGGElement>(".nodes");
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, NodeDatum>("g.node")
      .data(simNodes, (d) => d.id);

    // Remove old nodes
    nodeSelection.exit().remove();

    // Add new nodes with entrance animation
    const nodeEnter = nodeSelection
      .enter()
      .append("g")
      .attr("class", "node node-entering")
      .style("--node-color", (d) => getNodeColor(d.classification.type))
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
      })
      .on("mouseenter", (event: MouseEvent, d: NodeDatum) => {
        showTooltip(event, d);
      })
      .on("mousemove", (event: MouseEvent, d: NodeDatum) => {
        updateTooltipPosition(event);
      })
      .on("mouseleave", () => {
        hideTooltip();
      });

    // Node circle - starts with radius 0 for entrance animation
    nodeEnter
      .append("circle")
      .attr("class", "node-circle")
      .attr("r", 0) // Start at 0 for scale animation
      .attr("fill", (d) => getNodeColor(d.classification.type))
      .attr("stroke", "transparent")
      .attr("stroke-width", 3)
      .attr("cursor", "pointer")
      .transition()
      .duration(300)
      .delay((_, i) => i * 20) // Stagger node animations
      .ease(d3.easeBackOut.overshoot(1.2)) // Spring-like bounce
      .attr("r", NODE_RADIUS)
      .on("end", function onNodeAnimEnd() {
        // Remove entering class after animation
        const node = d3.select(this.parentNode as SVGGElement);
        node.classed("node-entering", false);
      });

    // Outer selection ring (rotating dashed)
    nodeEnter
      .append("circle")
      .attr("class", "selection-ring-outer")
      .attr("r", NODE_RADIUS + 8)
      .attr("fill", "none")
      .attr("stroke", "var(--color-accent)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0);

    // Inner selection ring (solid pulsing)
    nodeEnter
      .append("circle")
      .attr("class", "selection-ring-inner")
      .attr("r", NODE_RADIUS + 4)
      .attr("fill", "none")
      .attr("stroke", "var(--color-accent)")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0);

    // Node label
    nodeEnter
      .append("text")
      .attr("dx", LABEL_OFFSET)
      .attr("dy", 4)
      .attr("class", "node-label")
      .text((d) => truncateLabel(d.content?.summary ?? `Node ${d.id}`, MAX_LABEL_LENGTH));

    // Update existing nodes - merge enter and update selections
    const allNodes = nodeEnter.merge(nodeSelection);

    // Update node color property and circle fills
    allNodes
      .style("--node-color", (d) => getNodeColor(d.classification?.type ?? "other"))
      .select(".node-circle")
      .attr("fill", (d) => getNodeColor(d.classification?.type ?? "other"));

    // Update labels
    allNodes
      .select("text")
      .text((d) => truncateLabel(d.content?.summary ?? `Node ${d.id}`, MAX_LABEL_LENGTH));

    // Update selection state
    allNodes.classed("selected", (d) => d.id === selectedNodeId);
    
    // Animate outer ring
    allNodes.select(".selection-ring-outer")
      .transition()
      .duration(300)
      .attr("opacity", (d) => d.id === selectedNodeId ? 0.8 : 0)
      .attr("r", (d) => d.id === selectedNodeId ? NODE_RADIUS + 8 : NODE_RADIUS + 14);

    // Animate inner ring
    allNodes.select(".selection-ring-inner")
      .transition()
      .duration(300)
      .attr("opacity", (d) => d.id === selectedNodeId ? 0.6 : 0)
      .attr("r", (d) => d.id === selectedNodeId ? NODE_RADIUS + 4 : NODE_RADIUS + 10);

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

    // Update minimap (throttle for performance)
    if (simulation.alpha() < 0.1) {
      updateMinimap();
    }
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

  // Handle clicks outside the search dropdown
  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const searchContainer = container?.querySelector(".graph-search-container");
    if (searchContainer && !searchContainer.contains(target)) {
      showSearchDropdown = false;
    }
  }

  // Lifecycle
  onMount(() => {
    initGraph();
    window.addEventListener("mousedown", handleClickOutside);
  });

  onDestroy(() => {
    if (simulation) {
      simulation.stop();
    }
    clearTimeout(resizeTimeout);
    window.removeEventListener("mousedown", handleClickOutside);
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
      const nodeSelection = g.select(".nodes").selectAll<SVGGElement, NodeDatum>("g.node");
      
      nodeSelection.classed("selected", (d) => d.id === selectedNodeId);
      
      // Update selection rings
      nodeSelection.select(".selection-ring-outer")
        .transition()
        .duration(300)
        .attr("opacity", (d) => d.id === selectedNodeId ? 0.8 : 0)
        .attr("r", (d) => d.id === selectedNodeId ? NODE_RADIUS + 8 : NODE_RADIUS + 14);
        
      nodeSelection.select(".selection-ring-inner")
        .transition()
        .duration(300)
        .attr("opacity", (d) => d.id === selectedNodeId ? 0.6 : 0)
        .attr("r", (d) => d.id === selectedNodeId ? NODE_RADIUS + 4 : NODE_RADIUS + 10);
    }
  });
</script>

<div class="graph-container" bind:this={container}>
  <svg bind:this={svgElement} role="img" aria-label="Knowledge graph">
    <title>Knowledge graph showing connected nodes</title>
  </svg>

  <!-- Node tooltip -->
  {#if tooltipVisible && tooltipNode}
    <div
      class="node-tooltip"
      bind:this={tooltipElement}
      style="left: {tooltipX}px; top: {tooltipY}px;"
      role="tooltip"
    >
      <div class="tooltip-header">
        <span
          class="tooltip-type-dot"
          style="background-color: {getNodeColor(tooltipNode.classification?.type ?? 'other')}"
        ></span>
        <span class="tooltip-type">{tooltipNode.classification?.type ?? 'other'}</span>
      </div>
      <div class="tooltip-summary">
        {tooltipNode.content?.summary ?? 'No summary'}
      </div>
      {#if tooltipNode.classification?.project}
        <div class="tooltip-meta">
          <span class="tooltip-label">Project:</span>
          <span class="tooltip-value">{tooltipNode.classification.project}</span>
        </div>
      {/if}
      {#if tooltipNode.content?.outcome}
        <div class="tooltip-meta">
          <span class="tooltip-label">Outcome:</span>
          <span class="tooltip-value tooltip-outcome" data-outcome={tooltipNode.content.outcome}>
            {formatOutcome(tooltipNode.content.outcome)}
          </span>
        </div>
      {/if}
      {#if tooltipNode.content?.toolsUsed && tooltipNode.content.toolsUsed.length > 0}
        <div class="tooltip-tags">
          {#each tooltipNode.content.toolsUsed.slice(0, 4) as tool}
            <span class="tooltip-tag">{tool}</span>
          {/each}
          {#if tooltipNode.content.toolsUsed.length > 4}
            <span class="tooltip-tag tooltip-tag-more">+{tooltipNode.content.toolsUsed.length - 4}</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

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

  <!-- Minimap -->
  <div class="minimap-container">
    <button
      type="button"
      class="minimap"
      onclick={handleMinimapClick}
      aria-label="Graph minimap"
    >
      <svg bind:this={minimapSvg} aria-hidden="true">
        <title>Minimap - click to navigate</title>
      </svg>
    </button>
  </div>

  <!-- Graph search -->
  <div class="graph-search-container">
    <div class="search-input-wrapper">
      <span class="search-icon-wrapper">
        <Search size={16} />
      </span>
      <input
        type="text"
        class="search-input"
        placeholder="Search nodes..."
        bind:value={searchQuery}
        oninput={performSearch}
        onkeydown={handleSearchKeydown}
        onfocus={() => { if (searchQuery) showSearchDropdown = true; }}
        aria-label="Search nodes in graph"
        aria-controls="search-results"
      />
      {#if searchQuery}
        <button
          type="button"
          class="search-clear"
          onclick={() => { searchQuery = ''; searchResults = []; showSearchDropdown = false; }}
          aria-label="Clear search"
        >
          ×
        </button>
      {/if}
    </div>

    {#if showSearchDropdown && searchResults.length > 0}
      <div class="search-dropdown" id="search-results" role="listbox">
        {#each searchResults as result, index}
          <div
            class="search-result-item"
            class:selected={index === selectedSearchIndex}
            role="option"
            aria-selected={index === selectedSearchIndex}
            onclick={() => selectSearchResult(result)}
            onmouseenter={() => selectedSearchIndex = index}
          >
            <span
              class="result-type-dot"
              style="background: {getNodeColor(result.classification.type)}"
            ></span>
            <span class="result-text">{truncateLabel(result.content.summary, 40)}</span>
            <span class="result-type">{result.classification.type}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Layout options -->
  <div class="layout-options">
    <select
      class="layout-select"
      bind:value={currentLayout}
      onchange={(e) => applyLayout(e.currentTarget.value as LayoutType)}
      aria-label="Graph layout"
    >
      <option value="force">Force-directed</option>
      <option value="hierarchical">Hierarchical</option>
      <option value="radial">Radial</option>
    </select>
  </div>

  {#if nodes.length === 0}
    <div class="empty-state" role="status">
      <div class="empty-illustration">
        <Network size={48} strokeWidth={1.5} />
        <div class="empty-orbits">
          <span class="orbit orbit-1"></span>
          <span class="orbit orbit-2"></span>
          <span class="orbit orbit-3"></span>
        </div>
      </div>
      <h3 class="empty-title">No nodes to display</h3>
      <p class="empty-description">
        The knowledge graph is empty. Run some pi sessions and let the daemon analyze them, or adjust your filters.
      </p>
      <div class="empty-actions">
        <a href="/settings" class="empty-btn empty-btn-primary">
          <Settings size={16} />
          <span>Check Settings</span>
        </a>
        <a href="/sessions" class="empty-btn empty-btn-secondary">
          <span>View Sessions</span>
          <ArrowRight size={16} />
        </a>
      </div>
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

  :global(.edges line) {
    transition: stroke-width var(--transition-slow), opacity var(--transition-slow);
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
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    text-align: center;
    padding: var(--space-8);
    max-width: 400px;
  }

  .empty-illustration {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      var(--color-accent-muted) 0%,
      transparent 60%
    );
    color: var(--color-accent);
  }

  .empty-orbits {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px solid var(--color-accent);
    opacity: 0.15;
    animation: orbit-pulse 3s ease-in-out infinite;
  }

  .orbit-1 {
    inset: -10px;
    animation-delay: 0s;
  }

  .orbit-2 {
    inset: -25px;
    animation-delay: 0.5s;
  }

  .orbit-3 {
    inset: -45px;
    animation-delay: 1s;
  }

  @keyframes orbit-pulse {
    0%, 100% {
      opacity: 0.1;
      transform: scale(1);
    }
    50% {
      opacity: 0.25;
      transform: scale(1.02);
    }
  }

  .empty-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .empty-description {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
    margin-top: var(--space-2);
  }

  .empty-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    text-decoration: none;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);
  }

  .empty-btn-primary {
    background: var(--color-accent);
    color: var(--color-bg);
  }

  .empty-btn-primary:hover {
    background: var(--color-accent-hover);
  }

  .empty-btn-secondary {
    background: var(--color-bg-hover);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .empty-btn-secondary:hover {
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  /* Node styles (applied via D3) */
  :global(.node) {
    cursor: pointer;
    transition: transform var(--transition-fast);
  }

  :global(.node circle) {
    filter: drop-shadow(0 0 4px var(--node-color));
    transition: filter var(--transition-fast);
  }

  :global(.node:hover circle) {
    filter: brightness(1.2) drop-shadow(0 0 8px var(--node-color));
  }

  :global(.node.selected .node-circle) {
    stroke: var(--color-accent);
    stroke-width: 2px;
    animation: node-selection-pulse 2s ease-in-out infinite;
  }

  :global(.selection-ring-outer) {
    animation: selection-ring-rotate 10s linear infinite;
    pointer-events: none;
    transform-origin: center;
    transform-box: fill-box;
  }

  :global(.selection-ring-inner) {
    animation: selection-ring-pulse 3s ease-in-out infinite;
    pointer-events: none;
    transform-origin: center;
    transform-box: fill-box;
  }

  @keyframes selection-ring-rotate {
    from {
      transform: rotate(0deg);
      stroke-dashoffset: 0;
    }
    to {
      transform: rotate(360deg);
      stroke-dashoffset: 32;
    }
  }

  @keyframes selection-ring-pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(1);
      stroke-width: 1.5px;
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1);
      stroke-width: 2.5px;
    }
  }

  @keyframes node-selection-pulse {
    0%, 100% {
      filter: drop-shadow(0 0 6px var(--node-color));
    }
    50% {
      filter: drop-shadow(0 0 14px var(--node-color));
    }
  }

  /* Node entrance animation state */
  :global(.node-entering) {
    opacity: 0.8;
  }

  :global(.node-entering circle) {
    filter: brightness(1.3);
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

  /* Node tooltip */
  .node-tooltip {
    position: absolute;
    z-index: 100;
    width: 280px;
    padding: var(--space-3);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg), var(--shadow-highlight);
    pointer-events: none;
    animation: tooltip-fade-in 150ms ease-out;
  }

  @keyframes tooltip-fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .tooltip-type-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .tooltip-type {
    font-size: var(--text-xs);
    font-weight: 500;
    text-transform: capitalize;
    color: var(--color-text-muted);
  }

  .tooltip-summary {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
    line-height: 1.4;
    margin-bottom: var(--space-2);
  }

  .tooltip-meta {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-xs);
    margin-bottom: var(--space-1);
  }

  .tooltip-label {
    color: var(--color-text-subtle);
  }

  .tooltip-value {
    color: var(--color-text-muted);
  }

  .tooltip-outcome[data-outcome="success"] {
    color: var(--color-success);
  }

  .tooltip-outcome[data-outcome="failure"] {
    color: var(--color-error);
  }

  .tooltip-outcome[data-outcome="partial"] {
    color: var(--color-warning);
  }

  .tooltip-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .tooltip-tag {
    font-size: var(--text-xs);
    padding: 2px 6px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
  }

  .tooltip-tag-more {
    color: var(--color-text-subtle);
  }

  /* Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    :global(.node.selected circle) {
      animation: none;
      filter: drop-shadow(0 0 8px var(--node-color));
    }

    :global(.node-entering) {
      opacity: 1;
    }

    :global(.node-entering circle) {
      filter: none;
    }

    .orbit {
      animation: none;
      opacity: 0.15;
    }
  }

  /* Minimap styles */
  .minimap-container {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 10;
  }

  .minimap {
    width: 150px;
    height: 100px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    display: block;
  }

  :global(.minimap-viewport) {
    transition: all 0.15s ease-out;
  }

  :global(.minimap-viewport:hover) {
    fill: rgba(0, 217, 255, 0.2);
    stroke-width: 2;
  }

  /* Graph search styles */
  .graph-search-container {
    position: absolute;
    top: var(--space-4);
    left: var(--space-4);
    width: 280px;
    z-index: 10;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .search-input-wrapper:focus-within {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.15);
  }

  /* Search icon wrapper */
  .search-icon-wrapper {
    position: absolute;
    left: var(--space-2);
    color: var(--color-text-subtle);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: var(--space-2) var(--space-6);
    padding-right: var(--space-8);
    border: none;
    background: transparent;
    color: var(--color-text);
    font-size: var(--text-sm);
    outline: none;
  }

  .search-input::placeholder {
    color: var(--color-text-subtle);
  }

  .search-clear {
    position: absolute;
    right: var(--space-2);
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-subtle);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-subtle);
    font-size: var(--text-lg);
    line-height: 1;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .search-clear:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .search-dropdown {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    animation: dropdown-fade-in 150ms ease-out;
  }

  @keyframes dropdown-fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .search-result-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .search-result-item:hover,
  .search-result-item.selected {
    background: var(--color-accent-muted);
  }

  .result-type-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .result-text {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-type {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    text-transform: capitalize;
  }

  /* Layout options styles */
  .layout-options {
    position: absolute;
    top: calc(var(--space-4) + 50px);
    right: var(--space-4);
    z-index: 10;
  }

  .layout-select {
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-xs);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .layout-select:hover {
    border-color: var(--color-accent);
  }

  .layout-select:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.15);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .minimap {
      width: 100px;
      height: 70px;
    }

    .graph-search-container {
      width: calc(100% - var(--space-8));
    }

    .layout-options {
      top: auto;
      bottom: calc(var(--space-4) + 44px + var(--space-1));
    }
  }
</style>
