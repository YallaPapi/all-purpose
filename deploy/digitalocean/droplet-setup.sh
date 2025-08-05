#!/bin/bash
# DigitalOcean Droplet Setup Script for Meta-Agent Factory
# ZAD Mandate Phase 4 Step 2: Cloud Staging Deployment

set -e

echo "🚀 Setting up Meta-Agent Factory on DigitalOcean Droplet..."

# Update system
apt-get update && apt-get upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install -y docker-compose-plugin

# Create deployment user
useradd -m -s /bin/bash -G docker factory-deploy
mkdir -p /home/factory-deploy/.ssh
cp /root/.ssh/authorized_keys /home/factory-deploy/.ssh/
chown -R factory-deploy:factory-deploy /home/factory-deploy/.ssh
chmod 700 /home/factory-deploy/.ssh
chmod 600 /home/factory-deploy/.ssh/authorized_keys

# Create application directories
mkdir -p /opt/meta-agent-factory/{data,logs,generated,rag-system}
chown -R factory-deploy:factory-deploy /opt/meta-agent-factory

# Install monitoring tools
apt-get install -y htop iotop curl wget jq

# Configure firewall
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 3000/tcp # Factory Core
ufw allow 3007/tcp # RAG Factory
ufw --force enable

# Mount block storage (will be created separately)
mkdir -p /mnt/factory-storage
echo "/dev/disk/by-id/scsi-0DO_Volume_factory-storage /mnt/factory-storage ext4 defaults,nofail,discard 0 2" >> /etc/fstab

# Set up log rotation
cat > /etc/logrotate.d/meta-agent-factory << EOF
/opt/meta-agent-factory/logs/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        /usr/bin/docker exec factory-core kill -USR1 1 2>/dev/null || true
    endscript
}
EOF

# Create deployment script
cat > /home/factory-deploy/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Deploying Meta-Agent Factory..."

# Pull latest changes
cd /opt/meta-agent-factory
git pull origin main

# Set environment variables
source /opt/meta-agent-factory/.env

# Build and deploy
docker-compose -f docker-compose.prod.yml --env-file .env down
docker-compose -f docker-compose.prod.yml --env-file .env pull
docker-compose -f docker-compose.prod.yml --env-file .env up -d

echo "✅ Deployment complete!"
echo "🌐 Factory Core: http://$(curl -s ipv4.icanhazip.com):3000"
echo "📚 RAG Factory: http://$(curl -s ipv4.icanhazip.com):3007"
EOF

chmod +x /home/factory-deploy/deploy.sh
chown factory-deploy:factory-deploy /home/factory-deploy/deploy.sh

echo "✅ Droplet setup complete!"
echo "📝 Next steps:"
echo "   1. Create and attach 100GB block storage volume"
echo "   2. Deploy application code"
echo "   3. Configure domain and SSL"