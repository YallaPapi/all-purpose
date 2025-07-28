# Consul Development Configuration
# Optimized for local development and testing

datacenter = "uep-dev"
data_dir = "/consul/data"
log_level = "INFO"
node_name = "consul-dev-server"
server = true

# Development mode - single node cluster
bootstrap_expect = 1

# Network configuration for development
bind_addr = "0.0.0.0"
client_addr = "0.0.0.0"

# UI configuration
ui_config {
  enabled = true
}

# DNS configuration
dns_config {
  enable_truncate = true
  only_passing = true
}

# Development-friendly settings
enable_local_script_checks = true
disable_remote_exec = false

# Connect (service mesh) configuration for development
connect {
  enabled = true
}

ports {
  grpc = 8502
  grpc_tls = 8503
}

# Development service discovery configuration
services {
  name = "consul"
  port = 8500
  tags = ["consul", "service-registry", "development"]
  
  meta {
    version = "1.18.0"
    environment = "development"
    uep_enabled = "true"
    uep_version = "2.0"
  }
  
  check {
    name = "Consul HTTP API"
    http = "http://localhost:8500/v1/status/leader"
    interval = "30s"
    timeout = "10s"
  }
}

# UEP Agent registration template
services {
  name = "uep-registry"
  port = 3000
  tags = ["uep", "registry", "meta-agent"]
  
  meta {
    uep_protocol_version = "2.0"
    uep_capabilities = "agent-discovery,service-registration,health-monitoring"
    load_balancing = "round-robin"
    environment = "development"
  }
  
  check {
    name = "UEP Registry Health"
    http = "http://localhost:3000/health"
    interval = "15s"
    timeout = "5s"
  }
}

# Development logging configuration
log_file = "/consul/logs/consul.log"
log_rotate_duration = "24h"
log_rotate_max_files = 3

# Performance configuration for development
performance {
  raft_multiplier = 1
}

# Development ACL configuration (permissive)
acl = {
  enabled = false
  default_policy = "allow"
  enable_token_persistence = true
}

# Development security (minimal TLS)
tls {
  defaults {
    verify_incoming = false
    verify_outgoing = false
  }
  
  internal_rpc {
    verify_server_hostname = false
  }
}

# Consul Connect CA configuration for development
ca_config {
  provider = "consul"
  
  config {
    leaf_cert_ttl = "1h"
    root_cert_ttl = "24h"
  }
}

# Development monitoring configuration
telemetry {
  prometheus_retention_time = "60s"
  disable_hostname = true
  
  metrics_prefix = "consul_dev"
}