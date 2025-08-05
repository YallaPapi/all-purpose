# Variables for DigitalOcean Meta-Agent Factory Deployment

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key for droplet access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "region" {
  description = "DigitalOcean region for deployment"
  type        = string
  default     = "nyc3"
  
  validation {
    condition = contains([
      "nyc1", "nyc3", "ams2", "ams3", "sfo1", "sfo2", "sfo3", 
      "sgp1", "lon1", "fra1", "tor1", "blr1", "syd1"
    ], var.region)
    error_message = "Region must be a valid DigitalOcean region."
  }
}

variable "droplet_size" {
  description = "DigitalOcean droplet size"
  type        = string
  default     = "s-2vcpu-4gb"
  
  validation {
    condition = contains([
      "s-1vcpu-2gb", "s-2vcpu-2gb", "s-2vcpu-4gb", "s-4vcpu-8gb", "s-8vcpu-16gb"
    ], var.droplet_size)
    error_message = "Droplet size must be a valid DigitalOcean size."
  }
}

variable "storage_size" {
  description = "Block storage volume size in GB"
  type        = number
  default     = 100
  
  validation {
    condition     = var.storage_size >= 10 && var.storage_size <= 16384
    error_message = "Storage size must be between 10 and 16384 GB."
  }
}

variable "domain_name" {
  description = "Optional domain name for the factory (leave empty to skip DNS setup)"
  type        = string
  default     = ""
}

variable "allowed_ssh_ips" {
  description = "List of IP addresses/CIDR blocks allowed SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # WARNING: Restrict this in production
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "staging"
  
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

# Cost estimation variables
variable "enable_load_balancer" {
  description = "Whether to create a load balancer ($12/month)"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Whether to enable DigitalOcean monitoring"
  type        = bool
  default     = true
}

# Application configuration
variable "factory_version" {
  description = "Version tag for the factory deployment"
  type        = string
  default     = "latest"
}

variable "enable_ssl" {
  description = "Whether to configure SSL certificates"
  type        = bool
  default     = true
}