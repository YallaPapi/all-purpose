# 🚀 DigitalOcean Deployment Guide - Meta-Agent Factory

> **ZAD Mandate Phase 4 Step 2: Cloud-Based Staging Environment**  
> **Target Cost**: ~$310/month for complete staging environment  
> **Deployment Time**: 15-30 minutes  

## 📋 Pre-Deployment Checklist

### Requirements
- [ ] DigitalOcean account with API token
- [ ] SSH key pair generated (`ssh-keygen -t rsa -b 4096`)
- [ ] Terraform installed (`v1.0+`)
- [ ] `doctl` CLI installed (optional but recommended)
- [ ] Domain name (optional for custom DNS)

### Environment Variables
Create `.env` file with production values:
```bash
# Copy from local .env and update for production
cp .env deploy/digitalocean/.env.production

# Required variables for production:
ANTHROPIC_API_KEY=your_production_key
OPENAI_API_KEY=your_production_key
PERPLEXITY_API_KEY=your_production_key
UPSTASH_VECTOR_REST_URL=your_production_vector_url
UPSTASH_VECTOR_REST_TOKEN=your_production_vector_token
KV_REST_API_URL=your_production_redis_url
KV_REST_API_TOKEN=your_production_redis_token
```

## 🏗️ Infrastructure Deployment

### Step 1: Initialize Terraform
```bash
cd deploy/digitalocean/terraform
terraform init
```

### Step 2: Configure Variables
Create `terraform.tfvars`:
```hcl
# DigitalOcean Configuration
do_token = "your_digitalocean_api_token"
ssh_public_key_path = "~/.ssh/id_rsa.pub"
region = "nyc3"  # Choose closest region

# Infrastructure Sizing
droplet_size = "s-2vcpu-4gb"    # $50/month
storage_size = 100              # $10/month
enable_load_balancer = true     # $12/month

# Security
allowed_ssh_ips = ["your.ip.address/32"]  # Restrict SSH access

# Optional Domain Configuration
domain_name = "factory.yourdomain.com"  # Leave empty to skip
environment = "staging"
```

### Step 3: Plan and Deploy
```bash
# Review the deployment plan
terraform plan

# Deploy infrastructure (takes 5-10 minutes)
terraform apply
```

### Step 4: Verify Infrastructure
```bash
# Get connection details
terraform output ssh_connection
terraform output factory_core_url

# Test SSH connection
ssh factory-deploy@$(terraform output -raw droplet_ip)
```

## 📦 Application Deployment

### Step 1: Prepare Repository
```bash
# Ensure your repository has the production docker-compose
git add docker-compose.prod.yml deploy/
git commit -m "Add production deployment configuration"
git push origin main
```

### Step 2: Deploy Application
SSH to the droplet and run:
```bash
# Clone repository
cd /opt
sudo git clone https://github.com/yourusername/all-purpose.git meta-agent-factory
sudo chown -R factory-deploy:factory-deploy meta-agent-factory
cd meta-agent-factory

# Configure environment
cp deploy/digitalocean/.env.production .env
nano .env  # Verify all production values

# Run deployment script
./deploy/digitalocean/deploy.sh
```

### Step 3: Verify Deployment
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:3007/health

# Test RAG functionality
curl -X POST http://localhost:3007/api/factory/context \
  -H "Content-Type: application/json" \
  -d '{"query": "TaskMaster", "maxResults": 1}'
```

## 🔧 Production Configuration

### SSL Certificate Setup (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate (if using domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Monitoring Setup
```bash
# Install monitoring tools
sudo apt install prometheus-node-exporter

# Configure Docker logging
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

## 📊 Post-Deployment Verification

### Health Checks
```bash
# Infrastructure health
curl http://$(terraform output -raw droplet_ip):3000/health
curl http://$(terraform output -raw droplet_ip):3007/health

# Load balancer health
curl http://$(terraform output -raw load_balancer_ip)/health

# NATS monitoring
curl http://$(terraform output -raw droplet_ip):8222/varz
```

### Performance Tests
```bash
# Factory Core API test
curl -X POST http://$(terraform output -raw droplet_ip):3000/api/factory/generate \
  -H "Content-Type: application/json" \
  -d '{"type": "test-project", "requirements": "Simple test"}'

# RAG system test
curl -X POST http://$(terraform output -raw droplet_ip):3007/api/factory/context \
  -H "Content-Type: application/json" \
  -d '{"query": "production deployment", "maxResults": 3}'
```

## 💰 Cost Optimization

### Current Staging Cost Breakdown
- **Droplet** (s-2vcpu-4gb): $50/month
- **Block Storage** (100GB): $10/month  
- **Load Balancer**: $12/month
- **Bandwidth**: 1TB included
- **Total**: ~$72/month base + additional services

### Scaling for Production
- **Upgrade to**: s-4vcpu-8gb ($100/month) for higher load
- **Add monitoring**: $5-15/month for external monitoring
- **Add backups**: $5-10/month for automated snapshots
- **Total Production**: ~$130-150/month

## 🔒 Security Configuration

### Firewall Rules (Already Configured)
- SSH (22): Restricted to your IP
- HTTP (80): Public access
- HTTPS (443): Public access  
- Factory API (3000): Load balancer only
- RAG API (3007): Direct access (staging only)

### Additional Security Steps
```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh

# Configure fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Set up log monitoring
sudo apt install logwatch
```

## 🔄 Maintenance Operations

### Updates and Deployments
```bash
# Update application
cd /opt/meta-agent-factory
git pull origin main
./deploy/digitalocean/deploy.sh

# Update system packages
sudo apt update && sudo apt upgrade -y
sudo reboot  # If kernel updates
```

### Backup Operations
```bash
# Volume snapshot
doctl compute volume-snapshot create $(terraform output -raw volume_id) --snapshot-name "factory-backup-$(date +%Y%m%d)"

# Database backup (if applicable)
docker exec prod-redis redis-cli BGSAVE

# Log backup
rsync -av /opt/meta-agent-factory/logs/ ./backups/
```

### Monitoring Commands
```bash
# System resources
htop
iotop
df -h
docker stats

# Application logs
docker logs prod-meta-agent-factory-core --tail=100
docker logs prod-rag-factory-test --tail=100

# Service status
docker-compose -f docker-compose.prod.yml ps
systemctl status docker
```

## 🚨 Troubleshooting

### Common Issues

1. **Services won't start**
   ```bash
   # Check Docker daemon
   sudo systemctl status docker
   
   # Check disk space
   df -h
   
   # Check logs
   docker logs prod-meta-agent-factory-core
   ```

2. **Port conflicts**
   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :3000
   
   # Kill conflicting processes
   sudo fuser -k 3000/tcp
   ```

3. **Database connection issues**
   ```bash
   # Check Redis status
   docker exec prod-redis redis-cli ping
   
   # Check NATS status
   curl http://localhost:8222/varz
   ```

## ✅ Deployment Success Criteria

Your deployment is successful when:
- [ ] Infrastructure shows "healthy" in Terraform outputs
- [ ] All Docker containers are running and healthy
- [ ] Factory Core API responds at `/health`
- [ ] RAG Factory API responds at `/health`
- [ ] RAG context search returns relevant results
- [ ] Load balancer health checks pass
- [ ] SSL certificates are valid (if configured)
- [ ] All logs show normal operation

## 📞 Support and Next Steps

After successful deployment:

1. **Test the system** with a simple PRD
2. **Monitor performance** for 24-48 hours
3. **Configure alerts** for critical metrics
4. **Document any customizations** for your environment
5. **Proceed to ZAD Mandate Phase 4 Step 3**: Full-scale UAT

**Estimated Total Deployment Time**: 30-45 minutes  
**Monthly Cost**: $72-310 depending on configuration  
**Next Phase**: Comprehensive User Acceptance Testing