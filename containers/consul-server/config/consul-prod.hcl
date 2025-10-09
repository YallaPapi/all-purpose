# Consul Production Configuration
# Secure, high-availability configuration for production deployment

datacenter = "uep-prod"
data_dir = "/consul/data"
log_level = "WARN"
node_name = "consul-prod-server"
server = true

# Production cluster configuration
bootstrap_expect = 3
retry_join = [
  "consul-server-0.consul-server.consul.svc.cluster.local",
  "consul-server-1.consul-server.consul.svc.cluster.local",
  "consul-server-2.consul-server.consul.svc.cluster.local"
]

# Network configuration for production
bind_addr = "{{ GetInterfaceIP \"eth0\" }}"
client_addr = "0.0.0.0"

# UI configuration with security
ui_config {
  enabled = true
  content_path = "/ui/"
}

# DNS configuration
dns_config {
  enable_truncate = true
  only_passing = true
  max_stale = "5s"
  node_ttl = "30s"
  service_ttl = "10s"
}

# Production security settings
enable_local_script_checks = false
disable_remote_exec = true
disable_update_check = true

# Connect (service mesh) configuration for production
connect {
  enabled = true
  ca_provider = "consul"
  
  ca_config {
    leaf_cert_ttl = "1h"
    root_cert_ttl = "8760h"  # 1 year
    rotation_period = "2160h"  # 90 days
  }
}

ports {
  grpc = 8502
  grpc_tls = 8503
}

# Production service configuration
services {
  name = "consul"
  port = 8500
  tags = ["consul", "service-registry", "production", "ha"]
  
  meta {
    version = "1.18.0"
    environment = "production"
    uep_enabled = "true"
    uep_version = "2.0"
    cluster_size = "3"
  }
  
  check {
    name = "Consul HTTPS API"
    https = "https://localhost:8501/v1/status/leader"
    tls_skip_verify = false
    interval = "30s"
    timeout = "10s"
  }
  
  check {
    name = "Consul Leader Check"
    script = "/usr/local/bin/check-consul-leader.sh"
    interval = "60s"
    timeout = "30s"
  }
}

# Production logging configuration
log_file = "/consul/logs/consul.log"
log_rotate_duration = "24h"
log_rotate_max_files = 7
log_json = true

# Production performance configuration
performance {
  raft_multiplier = 3
  rpc_hold_timeout = "7s"
}

# Production ACL configuration (secure)
acl = {
  enabled = true
  default_policy = "deny"
  enable_token_persistence = true
  
  tokens {
    initial_management = "${CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN}"
    agent = "${CONSUL_ACL_AGENT_TOKEN}"
  }
}

# Production TLS configuration
tls {
  defaults {
    verify_incoming = true
    verify_outgoing = true
    
    ca_file = "/consul/tls/ca.pem"
    cert_file = "/consul/tls/consul.pem"
    key_file = "/consul/tls/consul-key.pem"
  }
  
  internal_rpc {
    verify_server_hostname = true
  }
  
  https {
    ca_file = "/consul/tls/ca.pem"
    cert_file = "/consul/tls/consul.pem"
    key_file = "/consul/tls/consul-key.pem"
  }
  
  grpc {
    ca_file = "/consul/tls/ca.pem"
    cert_file = "/consul/tls/consul.pem"
    key_file = "/consul/tls/consul-key.pem"
  }
}

# Encryption configuration
encrypt = "${CONSUL_ENCRYPT_KEY}"
encrypt_verify_incoming = true
encrypt_verify_outgoing = true

# Production monitoring configuration
telemetry {
  prometheus_retention_time = "300s"
  disable_hostname = false
  
  metrics_prefix = "consul_prod"
  
  dogstatsd_addr = "datadog-agent.observability.svc.cluster.local:8125"
  dogstatsd_tags = ["datacenter:uep-prod", "environment:production"]
  
  statsd_address = "statsd-exporter.observability.svc.cluster.local:9125"
}

# Consul Connect CA configuration for production
ca_config {
  provider = "consul"
  
  config {
    private_key_type = "ec"
    private_key_bits = 256
    leaf_cert_ttl = "1h"
    root_cert_ttl = "8760h"  # 1 year
    intermediate_cert_ttl = "2160h"  # 90 days
  }
}

# Production limits and timeouts
limits {
  http_max_conns_per_client = 200
  https_handshake_timeout = "5s"
  rpc_handshake_timeout = "5s"
  rpc_max_conns_per_client = 100
  
  kv_max_value_size = 1048576  # 1MB
  txn_max_req_len = 524288     # 512KB
}

# Production autopilot configuration
autopilot {
  cleanup_dead_servers = true
  last_contact_threshold = "200ms"
  max_trailing_logs = 250
  server_stabilization_time = "10s"
  redundancy_zone_tag = "zone"
  disable_upgrade_migration = false
  upgrade_version_tag = "version"
}

# Production snapshot configuration
snapshot_agent {
  http_addr = "127.0.0.1:8500"
  token = "${CONSUL_SNAPSHOT_TOKEN}"
  
  snapshot {
    interval = "1h"
    retain = 72  # 3 days
    
    local_storage {
      path = "/consul/snapshots"
    }
    
    # Optional: Configure cloud storage
    # s3_storage {
    #   s3_bucket = "consul-snapshots-uep-prod"
    #   s3_key_prefix = "consul-snapshots/"
    # }
  }
}

# Segment configuration for network partitioning (if needed)
segments = []

# Enterprise features (if using Consul Enterprise)
# audit {
#   enabled = true
#   sink "file" {
#     path = "/consul/logs/audit.log"
#     delivery_guarantee = "best-effort"
#     rotate_duration = "24h"
#     rotate_max_files = 7
#     rotate_bytes = 104857600  # 100MB
#   }
# }

# Production configuration validation
verify_incoming_rpc = true
verify_incoming_https = true
verify_server_hostname = true