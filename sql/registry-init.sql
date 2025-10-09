-- Agent Registry Database Initialization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('backend', 'frontend', 'devops', 'qa', 'documentation', 'integration', 'orchestration')),
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    endpoint VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'starting' CHECK (status IN ('starting', 'ready', 'busy', 'error', 'stopping')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_last_heartbeat ON agents(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_agents_registered_at ON agents(registered_at);

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_agents_capabilities ON agents USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_agents_metadata ON agents USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_agents_tags ON agents USING GIN (tags);

-- Agent capabilities table for normalized queries
CREATE TABLE IF NOT EXISTS agent_capabilities (
    agent_id VARCHAR(255) REFERENCES agents(id) ON DELETE CASCADE,
    capability VARCHAR(100) NOT NULL,
    PRIMARY KEY (agent_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_agent_capabilities_capability ON agent_capabilities(capability);

-- Agent heartbeat history for monitoring
CREATE TABLE IF NOT EXISTS agent_heartbeats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) REFERENCES agents(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    response_time_ms INTEGER,
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_agent_id ON agent_heartbeats(agent_id);
CREATE INDEX IF NOT EXISTS idx_heartbeats_timestamp ON agent_heartbeats(timestamp);

-- Agent service dependencies
CREATE TABLE IF NOT EXISTS agent_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) REFERENCES agents(id) ON DELETE CASCADE,
    depends_on_agent_id VARCHAR(255) REFERENCES agents(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'service',
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, depends_on_agent_id)
);

CREATE INDEX IF NOT EXISTS idx_dependencies_agent_id ON agent_dependencies(agent_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON agent_dependencies(depends_on_agent_id);

-- Agent service registry events
CREATE TABLE IF NOT EXISTS registry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('registered', 'deregistered', 'status_change', 'heartbeat_missed')),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registry_events_agent_id ON registry_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_registry_events_type ON registry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_registry_events_timestamp ON registry_events(timestamp);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old heartbeat records
CREATE OR REPLACE FUNCTION cleanup_old_heartbeats()
RETURNS void AS $$
BEGIN
    -- Keep only last 1000 heartbeats per agent and heartbeats from last 7 days
    DELETE FROM agent_heartbeats 
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY timestamp DESC) as rn
            FROM agent_heartbeats
            WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
        ) t WHERE rn <= 1000
    );
END;
$$ language 'plpgsql';

-- Function to get agent statistics
CREATE OR REPLACE FUNCTION get_registry_stats()
RETURNS TABLE (
    total_agents bigint,
    agents_by_type jsonb,
    agents_by_status jsonb,
    avg_response_time numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM agents) as total_agents,
        (SELECT jsonb_object_agg(type, count) 
         FROM (SELECT type, COUNT(*) as count FROM agents GROUP BY type) t) as agents_by_type,
        (SELECT jsonb_object_agg(status, count) 
         FROM (SELECT status, COUNT(*) as count FROM agents GROUP BY status) t) as agents_by_status,
        (SELECT COALESCE(AVG(response_time_ms), 0) 
         FROM agent_heartbeats 
         WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '5 minutes') as avg_response_time;
END;
$$ language 'plpgsql';

-- Insert default data
INSERT INTO agents (id, name, type, capabilities, endpoint, status, metadata, tags) VALUES
('system-coordinator', 'System Coordinator', 'orchestration', 
 '["workflow-management", "resource-allocation", "system-coordination"]'::jsonb,
 'http://agent-coordination-service:3011', 'ready',
 '{"description": "Core system coordination agent", "priority": "high"}'::jsonb,
 '["system", "coordinator", "core"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create indices for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_type_status ON agents(type, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_capabilities_gin ON agents USING GIN ((capabilities));

-- Add constraints
ALTER TABLE agents ADD CONSTRAINT chk_endpoint_format 
    CHECK (endpoint ~* '^https?://[^/]+');

-- Partitioning for agent_heartbeats (if supported)
-- This would typically be done with pg_partman in production

COMMIT;