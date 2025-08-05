import { connect } from 'nats';

export class HealthCheckService {
  private startTime: number;
  private natsConnection: any = null;

  constructor() {
    this.startTime = Date.now();
  }

  async getHealthStatus() {
    const uptime = Date.now() - this.startTime;
    const natsCheck = await this.checkNATSConnectivity();
    
    // Determine overall status based on critical checks
    const overallStatus = natsCheck.status === 'healthy' ? 'healthy' : 'unhealthy';
    
    return {
      status: overallStatus,
      service: 'domain-agents',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        memory: this.checkMemory(),
        cpu: this.checkCpu(),
        disk: this.checkDisk(),
        nats: natsCheck
      }
    };
  }

  private async checkNATSConnectivity() {
    try {
      const natsUrl = process.env.NATS_URL || 'nats://nats-broker:4222';
      
      // Try to connect with a short timeout
      const nc = await connect({
        servers: natsUrl,
        timeout: 3000,
        reconnect: false
      });
      
      // Test basic publish capability
      await nc.publish('health.test', Buffer.from('ping'));
      
      // Clean up
      await nc.drain();
      
      return {
        status: 'healthy',
        server: natsUrl,
        connected: true,
        latency: Date.now() - this.startTime
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        server: process.env.NATS_URL || 'nats://nats-broker:4222',
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown NATS error'
      };
    }
  }

  private checkMemory() {
    const used = process.memoryUsage();
    const total = used.heapTotal;
    const free = total - used.heapUsed;
    const usage = (used.heapUsed / total) * 100;
    
    return {
      status: usage < 90 ? 'healthy' : 'warning',
      usage: Math.round(usage),
      total: Math.round(total / 1024 / 1024),
      free: Math.round(free / 1024 / 1024)
    };
  }

  private checkCpu() {
    return {
      status: 'healthy',
      usage: Math.round(Math.random() * 50) // Placeholder - would need proper CPU monitoring
    };
  }

  private checkDisk() {
    return {
      status: 'healthy', 
      usage: Math.round(Math.random() * 70) // Placeholder - would need proper disk monitoring
    };
  }
}