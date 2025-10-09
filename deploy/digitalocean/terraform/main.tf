# DigitalOcean Infrastructure for Meta-Agent Factory
# ZAD Mandate Phase 4 Step 2: Production Staging Environment

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = var.do_token
}

# SSH Key for droplet access
resource "digitalocean_ssh_key" "factory_deploy" {
  name       = "meta-agent-factory-deploy"
  public_key = file(var.ssh_public_key_path)
}

# Droplet for Meta-Agent Factory
resource "digitalocean_droplet" "factory_staging" {
  image    = "ubuntu-22-04-x64"
  name     = "meta-agent-factory-staging"
  region   = var.region
  size     = "s-2vcpu-4gb"  # $50/month - sufficient for staging
  ssh_keys = [digitalocean_ssh_key.factory_deploy.fingerprint]
  
  user_data = file("${path.module}/../droplet-setup.sh")
  
  tags = [
    "meta-agent-factory",
    "staging",
    "production"
  ]
}

# Block Storage Volume for persistent data
resource "digitalocean_volume" "factory_storage" {
  region                  = var.region
  name                    = "factory-storage"
  size                    = 100
  initial_filesystem_type = "ext4"
  description             = "Persistent storage for Meta-Agent Factory data"
  
  tags = [
    "meta-agent-factory",
    "storage"
  ]
}

# Attach volume to droplet
resource "digitalocean_volume_attachment" "factory_storage_attachment" {
  droplet_id = digitalocean_droplet.factory_staging.id
  volume_id  = digitalocean_volume.factory_storage.id
}

# Load Balancer for production traffic
resource "digitalocean_loadbalancer" "factory_lb" {
  name   = "meta-agent-factory-lb"
  region = var.region
  
  forwarding_rule {
    entry_protocol  = "http"
    entry_port      = 80
    target_protocol = "http"
    target_port     = 3000
  }
  
  forwarding_rule {
    entry_protocol  = "https"
    entry_port      = 443
    target_protocol = "http"
    target_port     = 3000
    tls_passthrough = false
  }
  
  healthcheck {
    protocol               = "http"
    port                   = 3000
    path                   = "/health"
    check_interval_seconds = 10
    response_timeout_seconds = 5
    unhealthy_threshold    = 3
    healthy_threshold      = 2
  }
  
  droplet_ids = [digitalocean_droplet.factory_staging.id]
  
  tags = [
    "meta-agent-factory",
    "load-balancer"
  ]
}

# Firewall for security
resource "digitalocean_firewall" "factory_firewall" {
  name = "meta-agent-factory-firewall"
  
  droplet_ids = [digitalocean_droplet.factory_staging.id]
  
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.allowed_ssh_ips
  }
  
  inbound_rule {
    protocol                = "tcp"
    port_range             = "80"
    source_addresses       = ["0.0.0.0/0", "::/0"]
  }
  
  inbound_rule {
    protocol                = "tcp"
    port_range             = "443"
    source_addresses       = ["0.0.0.0/0", "::/0"]
  }
  
  inbound_rule {
    protocol                = "tcp"
    port_range             = "3000"
    source_load_balancer_uids = [digitalocean_loadbalancer.factory_lb.id]
  }
  
  outbound_rule {
    protocol              = "tcp"
    port_range           = "all"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  outbound_rule {
    protocol              = "udp"
    port_range           = "all"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  tags = [
    "meta-agent-factory",
    "firewall"
  ]
}

# Domain and DNS (optional)
resource "digitalocean_domain" "factory_domain" {
  count = var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}

resource "digitalocean_record" "factory_a_record" {
  count  = var.domain_name != "" ? 1 : 0
  domain = digitalocean_domain.factory_domain[0].name
  type   = "A"
  name   = "@"
  value  = digitalocean_loadbalancer.factory_lb.ip
  ttl    = 300
}

resource "digitalocean_record" "factory_www_record" {
  count  = var.domain_name != "" ? 1 : 0
  domain = digitalocean_domain.factory_domain[0].name
  type   = "CNAME"
  name   = "www"
  value  = "@"
  ttl    = 300
}