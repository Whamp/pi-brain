/**
 * HTML generator for session visualization
 * Creates a self-contained HTML file with embedded CSS and JS
 */

import type {
  SessionInfo,
  SessionEntry,
  ForkRelationship,
  TreeNode,
  SessionMessageEntry,
  AssistantMessage,
  CompactionEntry,
  BranchSummaryEntry,
  ModelChangeEntry,
  ThinkingLevelChangeEntry,
} from "../types.js";

import { groupByProject } from "../parser/analyzer.js";

/**
 * Compact session info for embedding (removes full content)
 */
interface CompactSessionInfo {
  path: string;
  id: string;
  timestamp: string;
  cwd: string;
  parentSession?: string;
  name?: string;
  firstMessage?: string;
  stats: SessionInfo["stats"];
  tree: CompactTreeNode | null;
  leafId: string | null;
}

interface CompactTreeNode {
  id: string;
  parentId: string | null;
  type: string;
  role?: string;
  label: string;
  timestamp: string;
  children: CompactTreeNode[];
  isLeaf: boolean;
  isBranchPoint: boolean;
  labels: string[];
  // For message entries, store truncated content
  content?: string;
  // For assistant messages
  model?: string;
  usage?: { input: number; output: number; cost?: number };
}

interface CompactVisualizationData {
  sessions: CompactSessionInfo[];
  forks: ForkRelationship[];
  projects: { cwd: string; sessionCount: number; totalEntries: number }[];
  generatedAt: string;
  version: string;
}

/**
 * Compress session data for embedding
 */
function compressSession(session: SessionInfo): CompactSessionInfo {
  return {
    cwd: session.header.cwd,
    firstMessage: session.firstMessage,
    id: session.header.id,
    leafId: session.leafId,
    name: session.name,
    parentSession: session.header.parentSession,
    path: session.path,
    stats: session.stats,
    timestamp: session.header.timestamp,
    tree: session.tree ? compressTree(session.tree) : null,
  };
}

/** Result of extracting entry metadata */
interface EntryMetadata {
  role?: string;
  label: string;
  content?: string;
  model?: string;
  usage?: { input: number; output: number; cost?: number };
}

/** Extract metadata from a message entry */
function extractMessageMetadata(entry: SessionMessageEntry): EntryMetadata {
  const msg = entry.message;
  const result: EntryMetadata = { role: msg.role, label: "" };

  if (msg.role === "user") {
    result.label = truncateContent(msg.content);
    result.content = truncateContent(msg.content, 500);
  } else if (msg.role === "assistant") {
    const assistantMsg = msg as AssistantMessage;
    result.label = truncateContent(assistantMsg.content);
    result.content = truncateContent(assistantMsg.content, 500);
    result.model = `${assistantMsg.provider}/${assistantMsg.model}`;
    if (assistantMsg.usage) {
      result.usage = {
        cost: assistantMsg.usage.cost?.total,
        input: assistantMsg.usage.input || 0,
        output: assistantMsg.usage.output || 0,
      };
    }
  } else if (msg.role === "toolResult") {
    result.label = `[${msg.toolName}]`;
    result.content = truncateContent(msg.content, 200);
  }

  return result;
}

/** Entry type to label/content extractors */
const ENTRY_TYPE_HANDLERS: Record<
  string,
  (entry: SessionEntry) => { label: string; content?: string }
> = {
  compaction: (entry) => ({
    label: "[Compaction]",
    content: (entry as CompactionEntry).summary?.slice(0, 300),
  }),
  branch_summary: (entry) => ({
    label: "[Branch Summary]",
    content: (entry as BranchSummaryEntry).summary?.slice(0, 300),
  }),
  model_change: (entry) => {
    const mc = entry as ModelChangeEntry;
    return { label: `Model → ${mc.provider}/${mc.modelId}` };
  },
  thinking_level_change: (entry) => ({
    label: `Thinking → ${(entry as ThinkingLevelChangeEntry).thinkingLevel}`,
  }),
};

/**
 * Compress tree node
 */
function compressTree(node: TreeNode): CompactTreeNode {
  const { entry } = node;
  let metadata: EntryMetadata;

  if (entry.type === "message") {
    metadata = extractMessageMetadata(entry as SessionMessageEntry);
  } else {
    const handler = ENTRY_TYPE_HANDLERS[entry.type];
    metadata = handler ? { ...handler(entry) } : { label: entry.type };
  }

  return {
    children: node.children.map(compressTree),
    content: metadata.content,
    id: entry.id,
    isBranchPoint: node.isBranchPoint,
    isLeaf: node.isLeaf,
    label: metadata.label.slice(0, 100),
    labels: node.labels,
    model: metadata.model,
    parentId: entry.parentId,
    role: metadata.role,
    timestamp: entry.timestamp,
    type: entry.type,
    usage: metadata.usage,
  };
}

/**
 * Truncate content to a max length
 */
function truncateContent(content: unknown, maxLength = 100): string {
  if (typeof content === "string") {
    return content.slice(0, maxLength);
  }
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text") {
        return (block.text as string).slice(0, maxLength);
      }
      if (block.type === "toolCall") {
        return `[${block.name}]`;
      }
    }
  }
  return "";
}

/**
 * Generate complete visualization HTML
 */
export function generateHTML(
  sessions: SessionInfo[],
  forks: ForkRelationship[]
): string {
  const projects = groupByProject(sessions);

  // Compress data for embedding
  const compactSessions = sessions.map(compressSession);

  const data: CompactVisualizationData = {
    forks,
    generatedAt: new Date().toISOString(),
    projects: projects.map((p) => ({
      cwd: p.cwd,
      sessionCount: p.sessions.length,
      totalEntries: p.totalEntries,
    })),
    sessions: compactSessions,
    version: "0.1.0",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pi Session Visualization</title>
  <style>
${getStyles()}
  </style>
</head>
<body>
  <div id="app">
    <aside id="sidebar">
      <header>
        <h1>Pi Sessions</h1>
        <div class="stats" id="stats"></div>
      </header>
      <div class="search-box">
        <input type="text" id="search" placeholder="Search sessions...">
      </div>
      <nav id="session-list"></nav>
    </aside>
    <main id="main">
      <div id="tree-container">
        <div id="tree-header">
          <h2 id="session-title">Select a session</h2>
          <div id="session-stats"></div>
        </div>
        <div id="tree-view"></div>
      </div>
    </main>
    <aside id="details">
      <header>
        <h3>Entry Details</h3>
      </header>
      <div id="entry-details">
        <p class="placeholder">Click a node to view details</p>
      </div>
    </aside>
  </div>

  <script>
    const DATA = ${JSON.stringify(data)};
  </script>
  <script>
${getScript()}
  </script>
</body>
</html>`;
}

/**
 * CSS styles for the visualization
 */
function getStyles(): string {
  return `
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --text-primary: #eaeaea;
  --text-secondary: #a0a0a0;
  --text-muted: #666;
  --accent: #e94560;
  --accent-secondary: #0ea5e9;
  --border: #2a2a4a;
  --user-color: #3b82f6;
  --assistant-color: #22c55e;
  --tool-color: #f97316;
  --compaction-color: #a855f7;
  --branch-color: #eab308;
  --system-color: #6b7280;
  --node-size: 12px;
  --line-color: #444;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
}

#app {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
#sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#sidebar header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

#sidebar h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.stats {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.search-box {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.search-box input {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.search-box input:focus {
  outline: none;
  border-color: var(--accent-secondary);
}

#session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.project-group {
  margin-bottom: 16px;
}

.project-header {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.project-header:hover {
  color: var(--text-secondary);
}

.project-header .chevron {
  transition: transform 0.2s;
}

.project-header.collapsed .chevron {
  transform: rotate(-90deg);
}

.session-item {
  padding: 10px 12px;
  margin: 4px 0;
  background: var(--bg-tertiary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.session-item:hover {
  background: var(--bg-primary);
}

.session-item.active {
  border-left-color: var(--accent);
  background: var(--bg-primary);
}

.session-item .name {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item .meta {
  font-size: 0.7rem;
  color: var(--text-muted);
  display: flex;
  gap: 8px;
}

.session-item .fork-badge {
  background: var(--branch-color);
  color: #000;
  font-size: 0.6rem;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
}

/* Main tree view */
#main {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

#tree-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#tree-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#tree-header h2 {
  font-size: 1rem;
  font-weight: 500;
}

#session-stats {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  gap: 16px;
}

#tree-view {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

/* Tree visualization */
.tree-node {
  display: flex;
  flex-direction: column;
  margin-left: 20px;
  position: relative;
}

.tree-node::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 0;
  width: 1px;
  height: 100%;
  background: var(--line-color);
}

.tree-node:last-child::before {
  height: 10px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin: 2px 0;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s;
}

.node-content::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 50%;
  width: 10px;
  height: 1px;
  background: var(--line-color);
}

.node-content:hover {
  background: var(--bg-secondary);
}

.node-content.selected {
  background: var(--bg-tertiary);
}

.node-content.leaf {
  border: 1px solid var(--accent);
}

.node-dot {
  width: var(--node-size);
  height: var(--node-size);
  border-radius: 50%;
  flex-shrink: 0;
}

.node-dot.user { background: var(--user-color); }
.node-dot.assistant { background: var(--assistant-color); }
.node-dot.toolResult { background: var(--tool-color); }
.node-dot.compaction { background: var(--compaction-color); }
.node-dot.branch_summary { background: var(--branch-color); }
.node-dot.model_change,
.node-dot.thinking_level_change { background: var(--system-color); }

.node-label {
  font-size: 0.8rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 600px;
}

.node-type {
  font-size: 0.65rem;
  color: var(--text-muted);
  padding: 2px 6px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.branch-marker {
  font-size: 0.65rem;
  color: var(--branch-color);
  padding: 2px 6px;
  background: rgba(234, 179, 8, 0.2);
  border-radius: 4px;
}

.leaf-marker {
  font-size: 0.65rem;
  color: var(--accent);
}

.tree-children {
  display: flex;
  flex-direction: column;
}

.tree-children.collapsed {
  display: none;
}

.root-node {
  margin-left: 0;
}

.root-node::before {
  display: none;
}

.root-node > .node-content::before {
  display: none;
}

/* Details panel */
#details {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#details header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

#details h3 {
  font-size: 0.875rem;
  font-weight: 600;
}

#entry-details {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

#entry-details .placeholder {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.detail-content {
  font-size: 0.85rem;
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.8rem;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  color: var(--text-secondary);
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
  padding: 40px;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.125rem;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 0.875rem;
}
`;
}

/**
 * JavaScript for interactivity
 */
function getScript(): string {
  return `
(function() {
  const { sessions, forks, projects, generatedAt } = DATA;
  
  // Group sessions by cwd for sidebar
  const sessionsByProject = {};
  for (const session of sessions) {
    const cwd = session.cwd;
    if (!sessionsByProject[cwd]) {
      sessionsByProject[cwd] = [];
    }
    sessionsByProject[cwd].push(session);
  }
  
  let selectedSession = null;
  let selectedNode = null;
  
  // Initialize
  renderStats();
  renderSessionList();
  setupSearch();
  
  function renderStats() {
    const stats = document.getElementById('stats');
    const totalEntries = sessions.reduce((sum, s) => sum + s.stats.entryCount, 0);
    stats.innerHTML = \`
      \${sessions.length} sessions · \${projects.length} projects · \${totalEntries.toLocaleString()} entries
    \`;
  }
  
  function renderSessionList() {
    const list = document.getElementById('session-list');
    list.innerHTML = '';
    
    for (const project of projects) {
      const group = document.createElement('div');
      group.className = 'project-group';
      
      const projectName = project.cwd.split('/').pop() || project.cwd;
      const projectSessions = sessionsByProject[project.cwd] || [];
      
      group.innerHTML = \`
        <div class="project-header">
          <span class="chevron">▼</span>
          \${escapeHtml(projectName)} (\${projectSessions.length})
        </div>
      \`;
      
      const header = group.querySelector('.project-header');
      const sessionsDiv = document.createElement('div');
      sessionsDiv.className = 'sessions';
      
      for (const session of projectSessions) {
        const item = createSessionItem(session);
        sessionsDiv.appendChild(item);
      }
      
      header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        sessionsDiv.classList.toggle('collapsed');
      });
      
      group.appendChild(sessionsDiv);
      list.appendChild(group);
    }
  }
  
  function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.path = session.path;
    
    const name = session.name || session.firstMessage || 'Untitled session';
    const date = new Date(session.timestamp).toLocaleString();
    const isFork = !!session.parentSession;
    
    item.innerHTML = \`
      <div class="name">\${escapeHtml(name)}</div>
      <div class="meta">
        <span>\${date}</span>
        <span>\${session.stats.entryCount} entries</span>
        \${isFork ? '<span class="fork-badge">Fork</span>' : ''}
      </div>
    \`;
    
    item.addEventListener('click', () => selectSession(session));
    return item;
  }
  
  function selectSession(session) {
    // Update active state
    document.querySelectorAll('.session-item').forEach(el => {
      el.classList.toggle('active', el.dataset.path === session.path);
    });
    
    selectedSession = session;
    renderTree(session);
    renderSessionStats(session);
    clearEntryDetails();
  }
  
  function renderSessionStats(session) {
    const title = document.getElementById('session-title');
    const stats = document.getElementById('session-stats');
    
    title.textContent = session.name || session.firstMessage || 'Untitled session';
    
    const s = session.stats;
    stats.innerHTML = \`
      <span>\${s.messageCount} messages</span>
      <span>\${s.branchPointCount} branches</span>
      <span>\${s.compactionCount} compactions</span>
      <span>\${s.totalTokens.toLocaleString()} tokens</span>
    \`;
  }
  
  function renderTree(session) {
    const container = document.getElementById('tree-view');
    
    if (!session.tree) {
      container.innerHTML = '<div class="empty-state"><h3>Empty session</h3><p>No entries in this session</p></div>';
      return;
    }
    
    container.innerHTML = '';
    const rootEl = createTreeNode(session.tree, true);
    container.appendChild(rootEl);
  }
  
  function createTreeNode(node, isRoot = false) {
    const el = document.createElement('div');
    el.className = 'tree-node' + (isRoot ? ' root-node' : '');
    
    const content = document.createElement('div');
    content.className = 'node-content' + (node.isLeaf ? ' leaf' : '');
    content.dataset.id = node.id;
    
    const nodeType = node.role || node.type;
    const label = node.label || node.type;
    
    content.innerHTML = \`
      <div class="node-dot \${nodeType}"></div>
      <span class="node-label">\${escapeHtml(label)}</span>
      <span class="node-type">\${nodeType}</span>
      \${node.isBranchPoint ? '<span class="branch-marker">⑂ branch</span>' : ''}
      \${node.isLeaf ? '<span class="leaf-marker">← current</span>' : ''}
    \`;
    
    content.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNode(node);
    });
    
    el.appendChild(content);
    
    if (node.children && node.children.length > 0) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      
      for (const child of node.children) {
        children.appendChild(createTreeNode(child));
      }
      
      el.appendChild(children);
    }
    
    return el;
  }
  
  function selectNode(node) {
    // Update selected state
    document.querySelectorAll('.node-content').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === node.id);
    });
    
    selectedNode = node;
    renderEntryDetails(node);
  }
  
  function renderEntryDetails(node) {
    const container = document.getElementById('entry-details');
    
    let html = '';
    
    // Basic info
    html += \`
      <div class="detail-section">
        <h4>Entry Info</h4>
        <div class="detail-row"><span class="label">ID</span><span>\${node.id}</span></div>
        <div class="detail-row"><span class="label">Type</span><span>\${node.type}</span></div>
        \${node.role ? \`<div class="detail-row"><span class="label">Role</span><span>\${node.role}</span></div>\` : ''}
        <div class="detail-row"><span class="label">Time</span><span>\${new Date(node.timestamp).toLocaleString()}</span></div>
        <div class="detail-row"><span class="label">Parent</span><span>\${node.parentId || 'none'}</span></div>
      </div>
    \`;
    
    // Content
    if (node.content) {
      const roleLabel = node.role ? node.role.charAt(0).toUpperCase() + node.role.slice(1) : 'Content';
      html += \`
        <div class="detail-section">
          <h4>\${roleLabel}</h4>
          <div class="detail-content">\${escapeHtml(node.content)}</div>
        </div>
      \`;
    }
    
    // Model and usage for assistant messages
    if (node.model) {
      html += \`
        <div class="detail-section">
          <h4>Model</h4>
          <div class="detail-row"><span class="label">Model</span><span>\${node.model}</span></div>
        </div>
      \`;
    }
    
    if (node.usage) {
      html += \`
        <div class="detail-section">
          <h4>Usage</h4>
          <div class="detail-row"><span class="label">Input</span><span>\${node.usage.input?.toLocaleString() || 0} tokens</span></div>
          <div class="detail-row"><span class="label">Output</span><span>\${node.usage.output?.toLocaleString() || 0} tokens</span></div>
          \${node.usage.cost ? \`<div class="detail-row"><span class="label">Cost</span><span>$\${node.usage.cost.toFixed(4)}</span></div>\` : ''}
        </div>
      \`;
    }
    
    // Labels
    if (node.labels && node.labels.length > 0) {
      html += \`
        <div class="detail-section">
          <h4>Labels</h4>
          <div class="detail-content">\${node.labels.join(', ')}</div>
        </div>
      \`;
    }
    
    container.innerHTML = html;
  }
  
  function clearEntryDetails() {
    const container = document.getElementById('entry-details');
    container.innerHTML = '<p class="placeholder">Click a node to view details</p>';
    selectedNode = null;
  }
  
  function setupSearch() {
    const input = document.getElementById('search');
    input.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      
      document.querySelectorAll('.session-item').forEach(item => {
        const name = item.querySelector('.name').textContent.toLowerCase();
        const visible = !query || name.includes(query);
        item.style.display = visible ? '' : 'none';
      });
    });
  }
  
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
`;
}
