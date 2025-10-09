# Outputs for DigitalOcean Meta-Agent Factory Deployment

output "droplet_ip" {
  description = "Public IP address of the factory droplet"
  value       = digitalocean_droplet.factory_staging.ipv4_address
}

output "droplet_private_ip" {
  description = "Private IP address of the factory droplet"
  value       = digitalocean_droplet.factory_staging.ipv4_address_private
}

output "load_balancer_ip" {
  description = "IP address of the load balancer"
  value       = digitalocean_loadbalancer.factory_lb.ip
}

output "volume_id" {
  description = "ID of the attached storage volume"
  value       = digitalocean_volume.factory_storage.id
}

output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh factory-deploy@${digitalocean_droplet.factory_staging.ipv4_address}"
}

output "factory_core_url" {
  description = "Factory Core API URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${digitalocean_loadbalancer.factory_lb.ip}"
}

output "rag_factory_url" {
  description = "RAG Factory API URL"
  value       = "http://${digitalocean_droplet.factory_staging.ipv4_address}:3007"
}

output "deployment_cost_estimate" {
  description = "Monthly cost estimate in USD"
  value = {
    droplet          = var.droplet_size == "s-2vcpu-4gb" ? 50 : 0
    storage          = var.storage_size * 0.10
    load_balancer    = var.enable_load_balancer ? 12 : 0
    bandwidth        = "1TB included, $0.01/GB overage"
    total_estimated  = (var.droplet_size == "s-2vcpu-4gb" ? 50 : 0) + (var.storage_size * 0.10) + (var.enable_load_balancer ? 12 : 0)
  }
}

output "next_steps" {
  description = "Next steps after infrastructure deployment"
  value = [
    "1. SSH to droplet: ssh factory-deploy@${digitalocean_droplet.factory_staging.ipv4_address}",
    "2. Clone repository: git clone <your-repo-url> /opt/meta-agent-factory",
    "3. Configure environment: cp .env.example .env && nano .env",
    "4. Deploy application: ./deploy.sh",
    "5. Verify deployment: curl http://${digitalocean_droplet.factory_staging.ipv4_address}:3000/health",
    "6. Configure DNS if using custom domain",
    "7. Set up SSL certificates with Let's Encrypt"
  ]
}

output "monitoring_urls" {
  description = "Monitoring and management URLs"
  value = {
    factory_core_health = "http://${digitalocean_droplet.factory_staging.ipv4_address}:3000/health"
    rag_factory_health  = "http://${digitalocean_droplet.factory_staging.ipv4_address}:3007/health"
    nats_monitoring     = "http://${digitalocean_droplet.factory_staging.ipv4_address}:8222"
    redis_info          = "redis-cli -h ${digitalocean_droplet.factory_staging.ipv4_address} -p 6380 info"
  }
}

output "firewall_rules" {
  description = "Configured firewall rules"
  value = {
    ssh_access    = "Port 22 - ${join(", ", var.allowed_ssh_ips)}"
    http_access   = "Port 80 - Public"
    https_access  = "Port 443 - Public"
    api_access    = "Port 3000 - Load Balancer only"
    rag_access    = "Port 3007 - Direct access (staging only)"
  }
}

output "backup_commands" {
  description = "Commands for backup and maintenance"
  value = {
    volume_snapshot = "doctl compute volume-snapshot ${digitalocean_volume.factory_storage.id}"
    droplet_snapshot = "doctl compute droplet-snapshot ${digitalocean_droplet.factory_staging.id}"
    logs_backup     = "rsync -av factory-deploy@${digitalocean_droplet.factory_staging.ipv4_address}:/opt/meta-agent-factory/logs/ ./backups/"
  }
}