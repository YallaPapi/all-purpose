/**
 * etcd Health Indicator
 * 
 * Health check indicator for etcd cluster connectivity and performance.
 * Integrates with NestJS Terminus health check system.
 */

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { EtcdService } from './etcd.service';

@Injectable()
export class EtcdHealthIndicator extends HealthIndicator {
  constructor(private readonly etcdService: EtcdService) {
    super();
  }

  /**
   * Check etcd cluster health
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const isConnected = await this.etcdService.getClusterHealth();
      
      if (!isConnected) {
        throw new Error('etcd cluster is not accessible');
      }

      // Get cluster member information
      const members = await this.etcdService.getClusterMembers();
      const activeMembers = members.members?.filter((member: any) => member.clientURLs?.length > 0) || [];
      
      // Test read/write operations
      const testKey = `health-check-${Date.now()}`;
      const testValue = 'health-test';
      
      await this.etcdService.put(testKey, testValue);
      const retrievedValue = await this.etcdService.get(testKey);
      await this.etcdService.delete(testKey);
      
      if (retrievedValue !== testValue) {
        throw new Error('etcd read/write test failed');
      }

      const responseTime = Date.now() - startTime;
      
      const result = this.getStatus(key, true, {
        cluster: {
          totalMembers: members.members?.length || 0,
          activeMembers: activeMembers.length,
          leader: members.header?.memberId || 'unknown',
        },
        performance: {
          responseTime: `${responseTime}ms`,
          lastCheck: new Date().toISOString(),
        },
        connectivity: 'healthy',
      });

      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result = this.getStatus(key, false, {
        error: error.message,
        performance: {
          responseTime: `${responseTime}ms`,
          lastCheck: new Date().toISOString(),
        },
        connectivity: 'unhealthy',
      });

      throw new HealthCheckError('etcd health check failed', result);
    }
  }

  /**
   * Check etcd cluster performance
   */
  async checkPerformance(key: string, maxResponseTime: number = 1000): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    
    try {
      // Perform multiple operations to test performance
      const operations = [
        () => this.etcdService.get('performance-test'),
        () => this.etcdService.put('performance-test', `test-${Date.now()}`),
        () => this.etcdService.getPrefix('performance'),
      ];

      const results = await Promise.all(operations.map(async (op, index) => {
        const opStart = Date.now();
        try {
          await op();
          return Date.now() - opStart;
        } catch {
          return maxResponseTime + 1; // Treat errors as slow
        }
      }));

      const avgResponseTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxOpTime = Math.max(...results);
      const totalTime = Date.now() - startTime;

      const isPerformant = avgResponseTime <= maxResponseTime && maxOpTime <= maxResponseTime * 2;

      const result = this.getStatus(key, isPerformant, {
        performance: {
          averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          maxOperationTime: `${maxOpTime}ms`,
          totalTestTime: `${totalTime}ms`,
          threshold: `${maxResponseTime}ms`,
          operations: results.length,
        },
        status: isPerformant ? 'performant' : 'slow',
        lastCheck: new Date().toISOString(),
      });

      if (!isPerformant) {
        throw new HealthCheckError('etcd performance check failed', result);
      }

      return result;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      const result = this.getStatus(key, false, {
        error: error.message,
        performance: {
          totalTestTime: `${totalTime}ms`,
          threshold: `${maxResponseTime}ms`,
          status: 'failed',
        },
        lastCheck: new Date().toISOString(),
      });

      throw new HealthCheckError('etcd performance check failed', result);
    }
  }

  /**
   * Check etcd cluster consistency
   */
  async checkConsistency(key: string): Promise<HealthIndicatorResult> {
    try {
      const members = await this.etcdService.getClusterMembers();
      const testKey = `consistency-test-${Date.now()}`;
      const testValue = `consistency-${Date.now()}`;

      // Write a value
      await this.etcdService.put(testKey, testValue);

      // Wait a bit for replication
      await new Promise(resolve => setTimeout(resolve, 100));

      // Read from cluster (this should read from any member)
      const readValue = await this.etcdService.get(testKey);

      // Clean up
      await this.etcdService.delete(testKey);

      const isConsistent = readValue === testValue;

      const result = this.getStatus(key, isConsistent, {
        cluster: {
          members: members.members?.length || 0,
          leader: members.header?.memberId || 'unknown',
        },
        consistency: {
          test: isConsistent ? 'passed' : 'failed',
          writeValue: testValue,
          readValue: readValue,
        },
        lastCheck: new Date().toISOString(),
      });

      if (!isConsistent) {
        throw new HealthCheckError('etcd consistency check failed', result);
      }

      return result;
      
    } catch (error) {
      const result = this.getStatus(key, false, {
        error: error.message,
        consistency: 'failed',
        lastCheck: new Date().toISOString(),
      });

      throw new HealthCheckError('etcd consistency check failed', result);
    }
  }
}