-- Migration 010: Clusters for facet discovery
-- Stores cluster results from embedding + clustering pipeline

-- Node embeddings (cached for efficient re-clustering)
CREATE TABLE IF NOT EXISTS node_embeddings (
    node_id TEXT PRIMARY KEY,
    embedding BLOB NOT NULL,  -- Float32 array as binary
    embedding_model TEXT NOT NULL,  -- Model used (e.g., "nomic-embed-text")
    input_text TEXT NOT NULL,  -- Source text that was embedded
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

-- Discovered clusters
CREATE TABLE IF NOT EXISTS clusters (
    id TEXT PRIMARY KEY,
    name TEXT,  -- LLM-generated name (NULL until analyzed)
    description TEXT,  -- LLM-generated description
    node_count INTEGER NOT NULL DEFAULT 0,
    -- Cluster metadata
    centroid BLOB,  -- Average embedding for cluster
    algorithm TEXT NOT NULL,  -- Algorithm used (e.g., "hdbscan", "kmeans")
    min_cluster_size INTEGER,  -- HDBSCAN parameter if applicable
    -- User feedback
    status TEXT DEFAULT 'pending',  -- pending, confirmed, dismissed
    confirmed_at TEXT,
    dismissed_at TEXT,
    -- Model association (if this cluster relates to specific models)
    related_model TEXT,  -- e.g., "google/gemini-3-pro"
    -- Signal association (friction/delight focus)
    signal_type TEXT,  -- 'friction', 'delight', or NULL for general
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Cluster membership (which nodes belong to which cluster)
CREATE TABLE IF NOT EXISTS cluster_nodes (
    cluster_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    -- Distance/score from cluster center (lower = closer)
    distance REAL,
    -- Whether this node is a representative example
    is_representative BOOLEAN DEFAULT FALSE,
    
    PRIMARY KEY (cluster_id, node_id),
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_node_embeddings_model ON node_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_clusters_status ON clusters(status);
CREATE INDEX IF NOT EXISTS idx_clusters_signal ON clusters(signal_type);
CREATE INDEX IF NOT EXISTS idx_clusters_model ON clusters(related_model);
CREATE INDEX IF NOT EXISTS idx_cluster_nodes_representative ON cluster_nodes(is_representative) WHERE is_representative = TRUE;

-- Clustering job tracking
CREATE TABLE IF NOT EXISTS clustering_runs (
    id TEXT PRIMARY KEY,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    nodes_embedded INTEGER DEFAULT 0,
    nodes_clustered INTEGER DEFAULT 0,
    clusters_created INTEGER DEFAULT 0,
    clusters_analyzed INTEGER DEFAULT 0,  -- Named by LLM
    embedding_model TEXT,
    algorithm TEXT,
    parameters TEXT,  -- JSON of algorithm parameters
    status TEXT DEFAULT 'running',  -- running, completed, failed
    error TEXT
);
