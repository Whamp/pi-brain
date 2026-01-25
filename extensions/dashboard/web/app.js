/**
 * Pi Dashboard - Live Session Tree Visualization
 */

class Dashboard {
  ws = null;
  sessionData = null;
  selectedNode = null;
  reconnectAttempts = 0;
  maxReconnectAttempts = 10;
  reconnectDelay = 1e3;
constructor() {
    

    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
    this.connect();
  }

  bindElements() {
    this.elements = {
      agentStatus: document.getElementById("agent-status"),
      closeDetailsBtn: document.getElementById("close-details"),
      collapseAllBtn: document.getElementById("collapse-all-btn"),
      connectionStatus: document.getElementById("connection-status"),
      entryActions: document.getElementById("entry-actions"),
      entryDetails: document.getElementById("entry-details"),
      expandAllBtn: document.getElementById("expand-all-btn"),
      forkBtn: document.getElementById("fork-btn"),
      navigateBtn: document.getElementById("navigate-btn"),
      refreshBtn: document.getElementById("refresh-btn"),
      searchInput: document.getElementById("search"),
      sessionInfo: document.getElementById("session-info"),
      sessionList: document.getElementById("session-list"),
      sessionTitle: document.getElementById("session-title"),
      treeStats: document.getElementById("tree-stats"),
      treeView: document.getElementById("tree-view"),
      zoomToLeafBtn: document.getElementById("zoom-to-leaf-btn"),
    };
  }

  bindEvents() {
    this.elements.refreshBtn.addEventListener("click", () =>
      this.fetchSessions()
    );
    this.elements.expandAllBtn.addEventListener("click", () =>
      this.expandAll()
    );
    this.elements.collapseAllBtn.addEventListener("click", () =>
      this.collapseAll()
    );
    this.elements.zoomToLeafBtn.addEventListener("click", () =>
      this.zoomToLeaf()
    );
    this.elements.navigateBtn.addEventListener("click", () =>
      this.navigateToSelected()
    );
    this.elements.forkBtn.addEventListener("click", () =>
      this.forkFromSelected()
    );
    this.elements.closeDetailsBtn.addEventListener("click", () =>
      this.clearSelection()
    );
    this.elements.searchInput.addEventListener("input", (e) =>
      this.onSearch(e.target.value)
    );

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.clearSelection();
      }
      if (e.key === "Home") {
        this.zoomToLeaf();
      }
    });
  }

  // WebSocket connection
  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    this.updateConnectionStatus("connecting");

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateConnectionStatus("connected");
      this.fetchSessions();
    };

    this.ws.onclose = () => {
      this.updateConnectionStatus("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.updateConnectionStatus("error");
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionStatus("failed");
      return;
    }

    this.reconnectAttempts += 1;
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);

    setTimeout(() => this.connect(), delay);
  }

  updateConnectionStatus(status) {
    const el = this.elements.connectionStatus;
    el.className = `status ${status}`;

    const texts = {
      connected: "Connected",
      connecting: "Connecting...",
      disconnected: "Disconnected",
      error: "Connection Error",
      failed: "Connection Failed",
    };

    el.querySelector(".status-text").textContent = texts[status] || status;
  }

  fetchSessions() {
    this.sendCommand({ type: "list_sessions" });
    this.elements.sessionList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Scanning sessions...</p>
      </div>
    `;
  }

  // Message handlers
  handleMessage(message) {
    switch (message.type) {
      case "session_state": {
        this.onSessionState(message.data);
        break;
      }
      case "entry_added": {
        this.onEntryAdded(message.data);
        break;
      }
      case "leaf_changed": {
        this.onLeafChanged(message.data);
        break;
      }
      case "agent_status": {
        this.onAgentStatus(message.data);
        break;
      }
      case "response": {
        if (message.data && message.data.projects) {
          this.renderSessionList(message.data.projects, message.data.forks);
        }
        break;
      }
      case "error": {
        console.error("Server error:", message.data?.message);
        break;
      }
      default: {
        // Unknown message type - ignore
        break;
      }
    }
  }

  renderSessionList(projects, forks) {
    const el = this.elements.sessionList;
    if (!projects || projects.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <p>No sessions found</p>
        </div>
      `;
      return;
    }

    let html = "";

    // Group forks by parent for quick lookup
    const forksByParent = new Map();
    if (forks) {
      for (const fork of forks) {
        if (!forksByParent.has(fork.parentPath)) {
          forksByParent.set(fork.parentPath, []);
        }
        forksByParent.get(fork.parentPath).push(fork);
      }
    }

    for (const project of projects) {
      const projectName = project.cwd.split("/").pop() || project.cwd;

      html += `
        <div class="project-group">
          <div class="project-header" title="${this.escapeHtml(project.cwd)}">
            <span class="project-icon">📁</span>
            <span class="project-name">${this.escapeHtml(projectName)}</span>
            <span class="project-count">${project.sessions.length}</span>
          </div>
          <div class="project-sessions">
      `;

      for (const session of project.sessions) {
        const isCurrent =
          this.sessionData && this.sessionData.sessionFile === session.path;
        const date = new Date(session.header.timestamp);
        const timeStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        const name = session.name || session.path.split("/").pop();

        // Check if this session is a parent of others (has forks)
        const childForks = forksByParent.get(session.path);
        const forkBadge = childForks
          ? `<span class="fork-badge" title="${childForks.length} forks">⑂ ${childForks.length}</span>`
          : "";

        // Check if this session is a fork itself
        const parentBadge = session.header.parentSession
          ? `<span class="fork-source" title="Forked from another session">↳</span>`
          : "";

        // Topics
        const topicsHtml =
          session.topics && session.topics.length > 0
            ? `<div class="session-topics">${session.topics.map((t) => `<span class="topic-tag">${this.escapeHtml(t)}</span>`).join("")}</div>`
            : "";

        html += `
          <div class="session-item ${isCurrent ? "active" : ""}" data-path="${this.escapeHtml(session.path)}">
            <div class="session-main">
              ${parentBadge}
              <span class="session-name">${this.escapeHtml(name)}</span>
              ${forkBadge}
            </div>
            <div class="session-meta">
              <span class="session-time">${timeStr}</span>
              <span class="session-entries">${session.stats.entryCount} entries</span>
            </div>
            ${topicsHtml}
            ${session.firstMessage ? `<div class="session-preview">${this.escapeHtml(session.firstMessage)}</div>` : ""}
          </div>
        `;
      }

      html += `</div></div>`;
    }

    el.innerHTML = html;

    // Bind click events
    el.querySelectorAll(".session-item").forEach((item) => {
      item.addEventListener("click", () => {
        const { path } = item.dataset;
        if (
          path &&
          (!this.sessionData || this.sessionData.sessionFile !== path)
        ) {
          this.switchSession(path);
        }
      });
    });
  }

  switchSession(path) {
    if (confirm("Switch to this session?")) {
      this.sendCommand({
        sessionPath: path,
        type: "switch_session",
      });
    }
  }

  onSessionState(data) {
    this.sessionData = data;
    this.renderTree();
    this.updateSessionInfo();
    this.updateAgentStatus(data.isStreaming);
  }

  onEntryAdded(entry) {
    if (!this.sessionData) {
      return;
    }

    // Add to entries array
    this.sessionData.entries.push(entry);

    // Re-render tree
    this.renderTree();
  }

  onLeafChanged(data) {
    if (!this.sessionData) {
      return;
    }

    this.sessionData.leafId = data.newLeafId;
    this.renderTree();
    this.zoomToLeaf();
  }

  onAgentStatus(data) {
    this.updateAgentStatus(data.isStreaming, data.isCompacting);
  }

  updateAgentStatus(isStreaming, isCompacting = false) {
    const el = this.elements.agentStatus;

    if (isCompacting) {
      el.className = "agent-status compacting";
      el.querySelector(".agent-text").textContent = "Compacting...";
    } else if (isStreaming) {
      el.className = "agent-status streaming";
      el.querySelector(".agent-text").textContent = "Streaming...";
    } else {
      el.className = "agent-status idle";
      el.querySelector(".agent-text").textContent = "Idle";
    }
  }

  updateSessionInfo() {
    const el = this.elements.sessionInfo;
    if (!this.sessionData) {
      el.textContent = "";
      return;
    }

    const file = this.sessionData.sessionFile || "Ephemeral";
    const name = file.split("/").pop() || file;
    el.textContent = name;
  }

  // Tree rendering
  renderTree() {
    if (!this.sessionData || !this.sessionData.entries.length) {
      this.elements.treeView.innerHTML = `
        <div class="empty-state">
          <p>No entries in session</p>
        </div>
      `;
      return;
    }

    const tree = this.buildTree(this.sessionData.entries);
    const html = this.renderNode(tree);
    this.elements.treeView.innerHTML = html;

    // Bind node click events
    this.elements.treeView.querySelectorAll(".node-content").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const { id } = el.dataset;
        this.selectNode(id);
      });

      // Double-click to toggle expand
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const children = el.parentElement.querySelector(".tree-children");
        if (children) {
          children.classList.toggle("collapsed");
        }
      });
    });

    // Bind toggle buttons
    this.elements.treeView.querySelectorAll(".toggle-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const children = el
          .closest(".tree-node")
          .querySelector(".tree-children");
        if (children) {
          children.classList.toggle("collapsed");
          el.textContent = children.classList.contains("collapsed") ? "▶" : "▼";
        }
      });
    });

    this.updateTreeStats();
  }

  buildTree(entries) {
    if (entries.length === 0) {
      return null;
    }

    const byId = new Map();
    const childrenMap = new Map();

    // Index entries
    for (const entry of entries) {
      byId.set(entry.id, entry);
      if (!childrenMap.has(entry.parentId)) {
        childrenMap.set(entry.parentId, []);
      }
      childrenMap.get(entry.parentId).push(entry);
    }

    // Sort children by timestamp
    for (const children of childrenMap.values()) {
      children.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    // Build tree
    const buildNode = (entry, depth = 0) => {
      const children = (childrenMap.get(entry.id) || [])
        .filter((e) => e.type !== "label")
        .map((e) => buildNode(e, depth + 1));

      return {
        children,
        depth,
        entry,
        isBranchPoint: children.length > 1,
        isLeaf: entry.id === this.sessionData.leafId,
      };
    };

    const roots = childrenMap.get(null) || [];
    if (roots.length === 0) {
      return null;
    }

    return buildNode(roots[0]);
  }

  renderNode(node, isRoot = true) {
    if (!node) {
      return "";
    }

    const { entry } = node;
    const nodeType = this.getNodeType(entry);
    const nodeClass = this.getNodeClass(entry);
    const label = this.getNodeLabel(entry);
    const hasChildren = node.children.length > 0;

    let html = `<div class="tree-node ${isRoot ? "root-node" : ""}">`;

    // Node content
    html += `<div class="node-content ${node.isLeaf ? "leaf" : ""}" data-id="${entry.id}">`;

    if (hasChildren) {
      html += `<button class="toggle-btn">▼</button>`;
    } else {
      html += `<span class="toggle-spacer"></span>`;
    }

    html += `<span class="node-dot ${nodeClass}"></span>`;
    html += `<span class="node-label">${this.escapeHtml(label)}</span>`;
    html += `<span class="node-type">${nodeType}</span>`;

    if (node.isBranchPoint) {
      html += `<span class="branch-marker">⑂ ${node.children.length}</span>`;
    }

    if (node.isLeaf) {
      html += `<span class="leaf-marker">← current</span>`;
    }

    html += `</div>`;

    // Children
    if (hasChildren) {
      html += `<div class="tree-children">`;
      for (const child of node.children) {
        html += this.renderNode(child, false);
      }
      html += `</div>`;
    }

    html += `</div>`;

    return html;
  }

  getNodeType(entry) {
    if (entry.type === "message") {
      return entry.message?.role || "message";
    }
    return entry.type;
  }

  getNodeClass(entry) {
    if (entry.type === "message") {
      return entry.message?.role || "";
    }
    return entry.type;
  }

  getNodeLabel(entry) {
    if (entry.type === "message") {
      const msg = entry.message;
      if (!msg) {
        return "message";
      }

      if (msg.role === "user") {
        return this.extractText(msg.content);
      } else if (msg.role === "assistant") {
        return this.extractText(msg.content);
      } else if (msg.role === "toolResult") {
        return `[${msg.toolName}]`;
      }
    } else if (entry.type === "compaction") {
      return "[Compaction]";
    } else if (entry.type === "branch_summary") {
      return "[Branch Summary]";
    } else if (entry.type === "model_change") {
      return `Model → ${entry.provider}/${entry.modelId}`;
    } else if (entry.type === "thinking_level_change") {
      return `Thinking → ${entry.thinkingLevel}`;
    }

    return entry.type;
  }

  extractText(content, maxLength = 100) {
    if (typeof content === "string") {
      return this.truncate(content, maxLength);
    }
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text") {
          return this.truncate(block.text, maxLength);
        }
        if (block.type === "toolCall") {
          return `[${block.name}]`;
        }
      }
    }
    return "";
  }

  truncate(str, maxLength) {
    if (!str) {
      return "";
    }
    const cleaned = str.replaceAll(/\s+/g, " ").trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return `${cleaned.slice(0, maxLength - 3)}...`;
  }

  updateTreeStats() {
    const el = this.elements.treeStats;
    if (!this.sessionData) {
      el.textContent = "";
      return;
    }

    const { entries } = this.sessionData;
    const messages = entries.filter((e) => e.type === "message").length;
    const branchPoints = this.countBranchPoints(entries);

    el.textContent = `${entries.length} entries · ${messages} messages · ${branchPoints} branches`;
  }

  countBranchPoints(entries) {
    const childCount = new Map();
    for (const entry of entries) {
      if (entry.parentId) {
        childCount.set(
          entry.parentId,
          (childCount.get(entry.parentId) || 0) + 1
        );
      }
    }
    return [...childCount.values()].filter((c) => c > 1).length;
  }

  // Node selection
  selectNode(id) {
    // Update visual state
    this.elements.treeView.querySelectorAll(".node-content").forEach((el) => {
      el.classList.toggle("selected", el.dataset.id === id);
    });

    // Find entry
    const entry = this.sessionData?.entries.find((e) => e.id === id);
    if (!entry) {
      return;
    }

    this.selectedNode = entry;
    this.renderEntryDetails(entry);
    this.elements.entryActions.classList.remove("hidden");

    // Only show navigate for user messages
    const isUserMessage =
      entry.type === "message" && entry.message?.role === "user";
    this.elements.navigateBtn.disabled = !isUserMessage;
    this.elements.forkBtn.disabled = !isUserMessage;
  }

  clearSelection() {
    this.elements.treeView
      .querySelectorAll(".node-content.selected")
      .forEach((el) => {
        el.classList.remove("selected");
      });

    this.selectedNode = null;
    this.elements.entryDetails.innerHTML = `
      <div class="empty-state">
        <p>Select a node to view details</p>
      </div>
    `;
    this.elements.entryActions.classList.add("hidden");
  }

  renderEntryDetails(entry) {
    const el = this.elements.entryDetails;
    let html = "";

    // Basic info
    html += `
      <div class="detail-section">
        <h4>Entry Info</h4>
        <div class="detail-row"><span class="label">ID</span><span class="value">${entry.id}</span></div>
        <div class="detail-row"><span class="label">Type</span><span class="value">${entry.type}</span></div>
        <div class="detail-row"><span class="label">Time</span><span class="value">${new Date(entry.timestamp).toLocaleString()}</span></div>
        <div class="detail-row"><span class="label">Parent</span><span class="value">${entry.parentId || "none"}</span></div>
      </div>
    `;

    // Message content
    if (entry.type === "message") {
      const msg = entry.message;
      if (msg) {
        html += `
          <div class="detail-section">
            <h4>${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}</h4>
        `;

        if (msg.role === "user" || msg.role === "assistant") {
          const content = this.extractFullContent(msg.content);
          html += `<div class="detail-content">${this.escapeHtml(content)}</div>`;
        } else if (msg.role === "toolResult") {
          html += `<div class="detail-row"><span class="label">Tool</span><span class="value">${msg.toolName}</span></div>`;
          const content = this.extractFullContent(msg.content);
          html += `<div class="detail-content">${this.escapeHtml(content)}</div>`;
        }

        // Model and usage for assistant
        if (msg.role === "assistant") {
          html += `
            <div class="detail-row"><span class="label">Model</span><span class="value">${msg.provider}/${msg.model}</span></div>
          `;

          if (msg.usage) {
            html += `
              <div class="detail-row"><span class="label">Tokens</span><span class="value">${msg.usage.input?.toLocaleString() || 0} in / ${msg.usage.output?.toLocaleString() || 0} out</span></div>
            `;
            if (msg.usage.cost?.total) {
              html += `
                <div class="detail-row"><span class="label">Cost</span><span class="value">$${msg.usage.cost.total.toFixed(4)}</span></div>
              `;
            }
          }
        }

        html += `</div>`;
      }
    } else if (entry.type === "compaction") {
      html += `
        <div class="detail-section">
          <h4>Compaction Summary</h4>
          <div class="detail-content">${this.escapeHtml(entry.summary || "")}</div>
          <div class="detail-row"><span class="label">Tokens Before</span><span class="value">${entry.tokensBefore?.toLocaleString() || 0}</span></div>
        </div>
      `;
    } else if (entry.type === "branch_summary") {
      html += `
        <div class="detail-section">
          <h4>Branch Summary</h4>
          <div class="detail-content">${this.escapeHtml(entry.summary || "")}</div>
        </div>
      `;
    }

    el.innerHTML = html;
  }

  extractFullContent(content, maxLength = 2000) {
    if (typeof content === "string") {
      return content.slice(0, maxLength);
    }
    if (Array.isArray(content)) {
      const parts = [];
      for (const block of content) {
        if (block.type === "text") {
          parts.push(block.text);
        } else if (block.type === "toolCall") {
          parts.push(`[Tool: ${block.name}]`);
        } else if (block.type === "thinking") {
          parts.push(`<thinking>${block.thinking}</thinking>`);
        }
      }
      return parts.join("\n\n").slice(0, maxLength);
    }
    return "";
  }

  // Actions
  expandAll() {
    this.elements.treeView.querySelectorAll(".tree-children").forEach((el) => {
      el.classList.remove("collapsed");
    });
    this.elements.treeView.querySelectorAll(".toggle-btn").forEach((el) => {
      el.textContent = "▼";
    });
  }

  collapseAll() {
    this.elements.treeView.querySelectorAll(".tree-children").forEach((el) => {
      el.classList.add("collapsed");
    });
    this.elements.treeView.querySelectorAll(".toggle-btn").forEach((el) => {
      el.textContent = "▶";
    });
  }

  zoomToLeaf() {
    if (!this.sessionData?.leafId) {
      return;
    }

    const leafEl = this.elements.treeView.querySelector(
      `[data-id="${this.sessionData.leafId}"]`
    );
    if (leafEl) {
      // Expand all ancestors
      let parent = leafEl.closest(".tree-children");
      while (parent) {
        parent.classList.remove("collapsed");
        const toggle =
          parent.previousElementSibling?.querySelector(".toggle-btn");
        if (toggle) {
          toggle.textContent = "▼";
        }
        parent = parent.parentElement?.closest(".tree-children");
      }

      // Scroll into view
      leafEl.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight briefly
      leafEl.classList.add("highlight");
      setTimeout(() => leafEl.classList.remove("highlight"), 1000);
    }
  }

  navigateToSelected() {
    if (!this.selectedNode) {
      return;
    }

    const shouldSummarize = confirm("Generate summary of abandoned branch?");

    this.sendCommand({
      entryId: this.selectedNode.id,
      summarize: shouldSummarize,
      type: "navigate",
    });
  }

  forkFromSelected() {
    if (!this.selectedNode) {
      return;
    }

    this.sendCommand({
      entryId: this.selectedNode.id,
      type: "fork",
    });
  }

  sendCommand(command) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
    }
  }

  onSearch(query) {
    const lowerQuery = query.toLowerCase();

    this.elements.treeView.querySelectorAll(".node-content").forEach((el) => {
      const label =
        el.querySelector(".node-label")?.textContent?.toLowerCase() || "";
      const matches = !query || label.includes(lowerQuery);

      el.classList.toggle("search-hidden", !matches);

      // If matches, expand to show
      if (matches && query) {
        let parent = el.closest(".tree-children");
        while (parent) {
          parent.classList.remove("collapsed");
          parent = parent.parentElement?.closest(".tree-children");
        }
      }
    });
  }

  escapeHtml(str) {
    if (!str) {
      return "";
    }
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  window.dashboard = new Dashboard();
});
