# Consul ACL Policies for UEP Meta-Agent Factory
# Production security policies for service discovery and coordination

# UEP Registry Service Policy
policy "uep-registry-policy" {
  description = "Policy for UEP Registry service to manage agent registrations"
  
  # Service registration and discovery
  service_prefix "uep-" {
    policy = "write"
  }
  
  service_prefix "meta-agent-" {
    policy = "write"
  }
  
  service_prefix "domain-agent-" {
    policy = "write"
  }
  
  # Node and agent management
  node_prefix "" {
    policy = "read"
  }
  
  agent_prefix "" {
    policy = "read"
  }
  
  # Key-value store access for configuration
  key_prefix "uep/" {
    policy = "write"
  }
  
  key_prefix "agents/" {
    policy = "write"
  }
  
  # Health check management
  key_prefix "health/" {
    policy = "write"
  }
  
  # Session management for coordination
  session_prefix "" {
    policy = "write"
  }
  
  # Event management
  event_prefix "uep-" {
    policy = "write"
  }
  
  # Query management for service discovery
  query_prefix "uep-" {
    policy = "write"
  }
}

# Meta-Agent Policy
policy "meta-agent-policy" {
  description = "Policy for Meta-Agents to register and discover services"
  
  # Service registration for the agent itself
  service "${meta_agent_name}" {
    policy = "write"
  }
  
  # Service discovery for other agents
  service_prefix "uep-" {
    policy = "read"
  }
  
  service_prefix "meta-agent-" {
    policy = "read"
  }
  
  service_prefix "domain-agent-" {
    policy = "read"
  }
  
  # Health check reporting
  node "${node_name}" {
    policy = "write"
  }
  
  # Configuration access
  key_prefix "uep/config/" {
    policy = "read"
  }
  
  key_prefix "agents/${meta_agent_name}/" {
    policy = "write"
  }
  
  # Health status reporting
  key_prefix "health/${meta_agent_name}/" {
    policy = "write"
  }
  
  # Session for coordination
  session_prefix "${meta_agent_name}-" {
    policy = "write"
  }
  
  # Events for coordination
  event_prefix "coord-" {
    policy = "write"
  }
  
  # Query access for service discovery
  query_prefix "discover-" {
    policy = "read"
  }
}

# Domain Agent Policy
policy "domain-agent-policy" {
  description = "Policy for Domain Agents (Backend, Frontend, DevOps, QA, Documentation)"
  
  # Service registration for the agent itself
  service "${domain_agent_name}" {
    policy = "write"
  }
  
  # Service discovery (read-only for domain agents)
  service_prefix "uep-" {
    policy = "read"
  }
  
  service_prefix "meta-agent-" {
    policy = "read"
  }
  
  service_prefix "domain-agent-" {
    policy = "read"
  }
  
  # Limited node access
  node "${node_name}" {
    policy = "write"
  }
  
  # Configuration access (read-only)
  key_prefix "uep/config/" {
    policy = "read"
  }
  
  # Own configuration management
  key_prefix "agents/${domain_agent_name}/" {
    policy = "write"
  }
  
  # Health status reporting
  key_prefix "health/${domain_agent_name}/" {
    policy = "write"
  }
  
  # Limited session access
  session_prefix "${domain_agent_name}-" {
    policy = "write"
  }
  
  # Task-specific events
  event_prefix "task-" {
    policy = "write"
  }
  
  # Basic query access
  query_prefix "discover-" {
    policy = "read"
  }
}

# UEP Infrastructure Services Policy
policy "uep-infrastructure-policy" {
  description = "Policy for UEP infrastructure services (API Gateway, NATS, etc.)"
  
  # Service registration
  service_prefix "uep-" {
    policy = "write"
  }
  
  service_prefix "infrastructure-" {
    policy = "write"
  }
  
  # Full service discovery access
  service_prefix "" {
    policy = "read"
  }
  
  # Node management
  node_prefix "" {
    policy = "read"
  }
  
  # Configuration management
  key_prefix "uep/" {
    policy = "write"
  }
  
  key_prefix "infrastructure/" {
    policy = "write"
  }
  
  # Health monitoring
  key_prefix "health/" {
    policy = "read"
  }
  
  # Session management
  session_prefix "infrastructure-" {
    policy = "write"
  }
  
  # Event management
  event_prefix "" {
    policy = "write"
  }
  
  # Query management
  query_prefix "" {
    policy = "write"
  }
}

# Observability Services Policy
policy "observability-policy" {
  description = "Policy for monitoring and observability services"
  
  # Service discovery (read-only)
  service_prefix "" {
    policy = "read"
  }
  
  # Node monitoring
  node_prefix "" {
    policy = "read"
  }
  
  # Configuration monitoring
  key_prefix "" {
    policy = "read"
  }
  
  # Health monitoring
  key_prefix "health/" {
    policy = "read"
  }
  
  # Session monitoring
  session_prefix "" {
    policy = "read"
  }
  
  # Event monitoring
  event_prefix "" {
    policy = "read"
  }
  
  # Query monitoring
  query_prefix "" {
    policy = "read"
  }
  
  # Metrics collection
  key_prefix "metrics/" {
    policy = "write"
  }
}

# Development Policy (Permissive)
policy "development-policy" {
  description = "Permissive policy for development environment"
  
  # Full access for development
  service_prefix "" {
    policy = "write"
  }
  
  node_prefix "" {
    policy = "write"
  }
  
  key_prefix "" {
    policy = "write"
  }
  
  session_prefix "" {
    policy = "write"
  }
  
  event_prefix "" {
    policy = "write"
  }
  
  query_prefix "" {
    policy = "write"
  }
  
  # Allow operator commands in development
  operator = "write"
  
  # Allow ACL management in development
  acl = "write"
}