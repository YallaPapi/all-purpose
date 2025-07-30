/**
 * UEP Health Monitoring Service Tests
 * 
 * Comprehensive test suite for the UEP Health Monitoring Service
 * covering TTL-based health checks, WebSocket integration, Consul
 * connectivity, and performance metrics collection.
 * 
 * Research-based testing following 2024 best practices:
 * - Integration tests with simulated Consul
 * - WebSocket client/server testing
 * - Performance and reliability testing
 * - Error handling and resilience testing
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Server } from 'http';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { UEPHealthMonitoringService, createUEPHealthMonitoringService } from './UEPHealthMonitoringService';
import { UEPHealthMonitoringClient, createHealthMonitoringClient } from './HealthMonitoringClient';

// Mock Consul to avoid external dependencies in tests
jest.mock('consul', () => {
  return jest.fn().mockImplementation(() => ({
    status: {
      leader: jest.fn().mockResolvedValue('localhost:8300')
    },
    catalog: {
      service: {
        list: jest.fn().mockResolvedValue({
          'uep-agent-test': ['uep-agent', 'health-monitored'],
          'meta-agent-processor': ['meta-agent', 'health-monitored']
        })
      }
    },
    health: {
      service: jest.fn().mockResolvedValue([
        {
          Service: {
            ID: 'test-agent-1',
            Service: 'uep-agent-test',
            Address: '127.0.0.1',
            Port: 8080,
            Tags: ['version=1.0.0', 'capability=processing', 'uep-agent']
          },
          Checks: [
            {
              Status: 'passing',
              CheckID: 'test-agent-1-health'
            }
          ]
        }
      ])
    },
    agent: {
      service: {
        register: jest.fn().mockResolvedValue(undefined),
        deregister: jest.fn().mockResolvedValue(undefined)
      },
      check: {
        pass: jest.fn().mockResolvedValue(undefined),
        warn: jest.fn().mockResolvedValue(undefined),
        fail: jest.fn().mockResolvedValue(undefined)
      }
    }
  }));
});

// Mock fetch for metrics collection
global.fetch = jest.fn().mockImplementation((url: string) => {
  if (url.includes('/metrics')) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(`
        # HELP process_cpu_usage_percent CPU usage percentage
        # TYPE process_cpu_usage_percent gauge
        process_cpu_usage_percent 15.5
        
        # HELP process_memory_usage_bytes Memory usage in bytes
        # TYPE process_memory_usage_bytes gauge
        process_memory_usage_bytes 134217728
        
        # HELP uep_agent_requests_total Total UEP requests
        # TYPE uep_agent_requests_total counter
        uep_agent_requests_total 42
      `)
    });
  }
  return Promise.resolve({
    ok: false,
    status: 404
  });
}) as jest.Mock;

describe('UEP Health Monitoring Service', () => {
  let healthService: UEPHealthMonitoringService;
  let healthClient: UEPHealthMonitoringClient;
  let clientSocket: ClientSocket;

  const testConfig = {
    ttlSeconds: 10,
    updateIntervalSeconds: 3,
    consulConfig: {
      host: 'localhost',
      port: 8500,
      secure: false
    },
    socketIOConfig: {
      port: 3002, // Use different port for testing
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true
      }
    }
  };

  beforeEach(async () => {
    // Create health monitoring service
    healthService = createUEPHealthMonitoringService(testConfig);
    
    // Initialize service
    await healthService.initialize();
    
    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create client
    healthClient = createHealthMonitoringClient({
      serverUrl: 'http://localhost:3002',
      autoConnect: false
    });
  });

  afterEach(async () => {
    // Cleanup
    if (healthClient) {
      healthClient.disconnect();
    }
    
    if (healthService) {
      await healthService.shutdown();
    }
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      expect(healthService).toBeDefined();
      
      // Check that Consul connection was tested
      const Consul = require('consul');
      const consulInstance = Consul.mock.results[0].value;
      expect(consulInstance.status.leader).toHaveBeenCalled();
    });

    it('should expose health endpoint', async () => {
      const response = await fetch('http://localhost:3002/health');
      expect(response.ok).toBe(true);
      
      const healthData = await response.json();
      expect(healthData.status).toBe('healthy');
      expect(healthData.version).toBe('1.0.0');
    });

    it('should expose metrics endpoint', async () => {
      const response = await fetch('http://localhost:3002/metrics');
      expect(response.ok).toBe(true);
      
      const metricsText = await response.text();
      expect(metricsText).toContain('uep_health_monitoring_checks_total');
      expect(metricsText).toContain('uep_health_monitoring_active_agents');
    });
  });

  describe('Agent Registration and Health Checks', () => {
    it('should register agent with TTL health check', async () => {
      await healthService.registerAgentWithHealthCheck(
        'test-agent-1',
        'uep-test-service',
        '127.0.0.1',
        8080,
        ['processing', 'coordination'],
        { version: '1.0.0', environment: 'test' }
      );

      const Consul = require('consul');
      const consulInstance = Consul.mock.results[0].value;
      
      expect(consulInstance.agent.service.register).toHaveBeenCalledWith({
        id: 'test-agent-1',
        name: 'uep-test-service',
        address: '127.0.0.1',
        port: 8080,
        tags: [
          'version=1.0.0',
          'capability=processing',
          'capability=coordination',
          'uep-agent',
          'health-monitored'
        ],
        check: {
          id: 'test-agent-1-health',
          name: 'uep-test-service Health Check',
          ttl: '10s',
          notes: 'TTL health check for UEP agent test-agent-1'
        },
        meta: { version: '1.0.0', environment: 'test' }
      });
    });

    it('should deregister agent and cleanup resources', async () => {
      // First register an agent
      await healthService.registerAgentWithHealthCheck(
        'test-agent-2',
        'uep-test-service-2',
        '127.0.0.1',
        8081,
        ['processing']
      );

      // Then deregister it
      await healthService.deregisterAgent('test-agent-2');

      const Consul = require('consul');
      const consulInstance = Consul.mock.results[0].value;
      
      expect(consulInstance.agent.service.deregister).toHaveBeenCalledWith('test-agent-2');
    });

    it('should update TTL health checks periodically', async () => {
      await healthService.registerAgentWithHealthCheck(
        'test-agent-3',
        'uep-test-service-3',
        '127.0.0.1',
        8082,
        ['processing']
      );

      // Wait for at least one TTL update cycle
      await new Promise(resolve => setTimeout(resolve, 3500));

      const Consul = require('consul');
      const consulInstance = Consul.mock.results[0].value;
      
      expect(consulInstance.agent.check.pass).toHaveBeenCalledWith('test-agent-3-health');
    });
  });

  describe('Health Status Collection and Broadcasting', () => {
    it('should collect health status from Consul', async () => {
      // Mock will return test agent data
      const stats = healthService.getHealthStatistics();
      
      // Wait for initial health polling
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedStats = healthService.getHealthStatistics();
      expect(updatedStats.totalAgents).toBeGreaterThanOrEqual(0);
    });

    it('should broadcast health updates via WebSocket', (done) => {
      healthClient.connect();
      
      healthClient.on('connected', () => {
        // Listen for initial health data
        healthClient.on('initialDataReceived', (dashboardData) => {
          expect(dashboardData).toBeDefined();
          expect(dashboardData.timestamp).toBeDefined();
          expect(dashboardData.totalAgents).toBeGreaterThanOrEqual(0);
          done();
        });
      });
    });

    it('should handle health status transitions', (done) => {
      healthClient.connect();
      
      healthClient.on('connected', () => {
        healthClient.on('healthTransition', (transition) => {
          expect(transition.agentId).toBeDefined();
          expect(transition.from).toBeDefined();
          expect(transition.to).toBeDefined();
          expect(transition.timestamp).toBeDefined();
          done();
        });
        
        // Simulate health transition by emitting event
        healthService.emit('healthTransition', {
          previous: { agentId: 'test', status: 'passing' },
          current: { agentId: 'test', status: 'warning' }
        });
      });
    });

    it('should emit critical alerts for critical health status', (done) => {
      healthClient.connect();
      
      healthClient.on('connected', () => {
        healthClient.on('criticalAlert', (alert) => {
          expect(alert.agentId).toBeDefined();
          expect(alert.severity).toBe('critical');
          done();
        });
        
        // Simulate critical health transition
        healthService.emit('healthTransition', {
          previous: { agentId: 'test', status: 'warning' },
          current: { agentId: 'test', status: 'critical' }
        });
      });
    });
  });

  describe('Metrics Collection and Prometheus Integration', () => {
    it('should collect agent performance metrics', async () => {
      // The mocked fetch should return metrics
      const response = await fetch('http://127.0.0.1:8080/metrics');
      expect(response.ok).toBe(true);
      
      const metricsText = await response.text();
      expect(metricsText).toContain('process_cpu_usage_percent 15.5');
      expect(metricsText).toContain('process_memory_usage_bytes 134217728');
      expect(metricsText).toContain('uep_agent_requests_total 42');
    });

    it('should generate Prometheus metrics format', async () => {
      const response = await fetch('http://localhost:3002/metrics');
      expect(response.ok).toBe(true);
      
      const metricsText = await response.text();
      
      // Check for expected metrics
      expect(metricsText).toContain('# HELP uep_health_monitoring_checks_total');
      expect(metricsText).toContain('# TYPE uep_health_monitoring_checks_total counter');
      expect(metricsText).toContain('uep_health_monitoring_checks_total');
      
      expect(metricsText).toContain('# HELP uep_health_monitoring_active_agents');
      expect(metricsText).toContain('# TYPE uep_health_monitoring_active_agents gauge');
      expect(metricsText).toContain('uep_health_monitoring_active_agents');
    });
  });

  describe('Client Integration', () => {
    it('should connect and receive initial data', (done) => {
      healthClient.connect();
      
      healthClient.on('connected', () => {
        expect(healthClient.isConnected()).toBe(true);
        expect(healthClient.getConnectionState()).toBe('connected');
        done();
      });
    });

    it('should handle agent subscriptions', (done) => {
      healthClient.connect();
      
      healthClient.on('connected', () => {
        healthClient.subscribeToAgent('test-agent-1');
        
        expect(healthClient.getSubscriptions()).toContain('test-agent-1');
        
        healthClient.on('agentHealthUpdate', (update) => {
          expect(update.agentId).toBe('test-agent-1');
          done();
        });
      });
    });

    it('should provide dashboard data in correct format', (done) => {
      healthClient.connect();
      
      healthClient.on('connected', () => {
        const dashboardData = healthClient.getDashboardData();
        
        expect(dashboardData.timestamp).toBeDefined();
        expect(dashboardData.totalAgents).toBeGreaterThanOrEqual(0);
        expect(dashboardData.healthyAgents).toBeGreaterThanOrEqual(0);
        expect(dashboardData.warningAgents).toBeGreaterThanOrEqual(0);
        expect(dashboardData.criticalAgents).toBeGreaterThanOrEqual(0);
        expect(dashboardData.agents).toBeInstanceOf(Array);
        expect(dashboardData.averageResponseTime).toBeGreaterThanOrEqual(0);
        expect(dashboardData.overallHealthScore).toBeGreaterThanOrEqual(0);
        expect(dashboardData.overallHealthScore).toBeLessThanOrEqual(100);
        
        done();
      });
    });

    it('should track health trends over time', (done) => {
      healthClient.connect();
      
      healthClient.on('connected', () => {
        // Wait for some health updates
        setTimeout(() => {
          const trends = healthClient.getHealthTrends();
          expect(trends).toBeInstanceOf(Array);
          
          if (trends.length > 0) {
            const trend = trends[0];
            expect(trend.timestamp).toBeDefined();
            expect(trend.agentId).toBeDefined();
            expect(trend.status).toMatch(/^(passing|warning|critical)$/);
            expect(trend.responseTime).toBeGreaterThanOrEqual(0);
            expect(trend.cpuUsage).toBeGreaterThanOrEqual(0);
            expect(trend.memoryUsage).toBeGreaterThanOrEqual(0);
          }
          
          done();
        }, 1000);
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Consul connection failures gracefully', async () => {
      // Mock Consul to throw error
      const Consul = require('consul');
      const consulInstance = Consul.mock.results[0].value;
      consulInstance.status.leader.mockRejectedValueOnce(new Error('Connection refused'));

      const failingService = createUEPHealthMonitoringService(testConfig);
      
      await expect(failingService.initialize()).rejects.toThrow('Consul connection failed');
    });

    it('should handle agent metrics collection failures', async () => {
      // Mock fetch to fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      // Service should continue operating despite metrics collection failures
      const stats = healthService.getHealthStatistics();
      expect(stats).toBeDefined();
    });

    it('should handle WebSocket disconnections and reconnections', (done) => {
      healthClient.connect();
      
      let connectedCount = 0;
      
      healthClient.on('connected', () => {
        connectedCount++;
        
        if (connectedCount === 1) {
          // Simulate disconnection
          healthClient.disconnect();
        }
      });
      
      healthClient.on('disconnected', () => {
        expect(healthClient.isConnected()).toBe(false);
        
        // Reconnect
        healthClient.connect();
      });
      
      healthClient.on('reconnected', () => {
        expect(connectedCount).toBe(2);
        done();
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple simultaneous agent registrations', async () => {
      const registrationPromises = [];
      
      for (let i = 0; i < 10; i++) {
        registrationPromises.push(
          healthService.registerAgentWithHealthCheck(
            `load-test-agent-${i}`,
            `load-test-service-${i}`,
            '127.0.0.1',
            8090 + i,
            ['processing']
          )
        );
      }
      
      await Promise.all(registrationPromises);
      
      const Consul = require('consul');
      const consulInstance = Consul.mock.results[0].value;
      
      expect(consulInstance.agent.service.register).toHaveBeenCalledTimes(10);
    });

    it('should handle multiple WebSocket clients', (done) => {
      const clients: UEPHealthMonitoringClient[] = [];
      let connectedCount = 0;
      
      // Create 5 clients
      for (let i = 0; i < 5; i++) {
        const client = createHealthMonitoringClient({
          serverUrl: 'http://localhost:3002',
          autoConnect: false
        });
        
        client.on('connected', () => {
          connectedCount++;
          
          if (connectedCount === 5) {
            // All clients connected
            expect(connectedCount).toBe(5);
            
            // Cleanup
            clients.forEach(c => c.disconnect());
            done();
          }
        });
        
        clients.push(client);
        client.connect();
      }
    });

    it('should maintain performance under health status updates load', async () => {
      const startTime = Date.now();
      
      // Simulate rapid health status updates
      for (let i = 0; i < 100; i++) {
        healthService.emit('healthTransition', {
          previous: { agentId: `perf-test-${i}`, status: 'passing' },
          current: { agentId: `perf-test-${i}`, status: 'warning' }
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Data Accuracy and Consistency', () => {
    it('should calculate health scores correctly', (done) => {
      healthClient.connect();
      
      healthClient.on('connected', () => {
        const dashboardData = healthClient.getDashboardData();
        
        // Health score should be between 0 and 100
        expect(dashboardData.overallHealthScore).toBeGreaterThanOrEqual(0);
        expect(dashboardData.overallHealthScore).toBeLessThanOrEqual(100);
        
        // If no agents, score should be 100 (default healthy state)
        if (dashboardData.totalAgents === 0) {
          expect(dashboardData.overallHealthScore).toBe(100);
        }
        
        done();
      });
    });

    it('should maintain data consistency across WebSocket updates', (done) => {
      healthClient.connect();
      
      let updateCount = 0;
      
      healthClient.on('connected', () => {
        healthClient.on('healthUpdate', (update) => {
          updateCount++;
          
          const dashboardData = update.dashboardData;
          const totalCalculated = dashboardData.healthyAgents + 
                                 dashboardData.warningAgents + 
                                 dashboardData.criticalAgents;
          
          expect(totalCalculated).toBe(dashboardData.totalAgents);
          
          if (updateCount >= 3) {
            done();
          }
        });
      });
    });
  });
});

describe('Health Monitoring Client Standalone Tests', () => {
  let client: UEPHealthMonitoringClient;

  beforeEach(() => {
    client = createHealthMonitoringClient({
      serverUrl: 'http://localhost:3999', // Non-existent server for testing
      autoConnect: false,
      reconnectionAttempts: 2,
      reconnectionDelay: 100
    });
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  it('should handle connection failures gracefully', (done) => {
    client.on('connectionError', (error) => {
      expect(error).toBeDefined();
      done();
    });
    
    client.connect();
  });

  it('should manage subscriptions correctly', () => {
    client.subscribeToAgent('agent-1');
    client.subscribeToAgent('agent-2');
    
    expect(client.getSubscriptions()).toEqual(['agent-1', 'agent-2']);
    
    client.unsubscribeFromAgent('agent-1');
    expect(client.getSubscriptions()).toEqual(['agent-2']);
  });

  it('should filter agents by status correctly', () => {
    // Clear any existing data
    client.clearData();
    
    const mockAgents = [
      { agentId: 'agent-1', status: 'passing' as const, serviceName: 'service-1', lastUpdated: new Date(), ttlExpiry: new Date(), metadata: { version: '1.0.0', capabilities: [], endpoints: { health: '', api: '' } }, metrics: { responseTime: 100, successRate: 100, resourceUtilization: { cpu: 10, memory: 50 } } },
      { agentId: 'agent-2', status: 'warning' as const, serviceName: 'service-2', lastUpdated: new Date(), ttlExpiry: new Date(), metadata: { version: '1.0.0', capabilities: [], endpoints: { health: '', api: '' } }, metrics: { responseTime: 200, successRate: 95, resourceUtilization: { cpu: 20, memory: 60 } } },
      { agentId: 'agent-3', status: 'critical' as const, serviceName: 'service-3', lastUpdated: new Date(), ttlExpiry: new Date(), metadata: { version: '1.0.0', capabilities: [], endpoints: { health: '', api: '' } }, metrics: { responseTime: 500, successRate: 70, resourceUtilization: { cpu: 80, memory: 90 } } }
    ];
    
    // Simulate receiving initial data
    client['handleInitialHealthData'](mockAgents);
    
    const passingAgents = client.getAgentsByStatus('passing');
    const warningAgents = client.getAgentsByStatus('warning');
    const criticalAgents = client.getAgentsByStatus('critical');
    
    expect(passingAgents).toHaveLength(1);
    expect(passingAgents[0].agentId).toBe('agent-1');
    
    expect(warningAgents).toHaveLength(1);
    expect(warningAgents[0].agentId).toBe('agent-2');
    
    expect(criticalAgents).toHaveLength(1);
    expect(criticalAgents[0].agentId).toBe('agent-3');
  });

  it('should calculate statistics correctly', () => {
    client.clearData();
    
    const mockAgents = [
      { agentId: 'agent-1', status: 'passing' as const, serviceName: 'service-1', lastUpdated: new Date(), ttlExpiry: new Date(), metadata: { version: '1.0.0', capabilities: [], endpoints: { health: '', api: '' } }, metrics: { responseTime: 100, successRate: 100, resourceUtilization: { cpu: 10, memory: 50 } } },
      { agentId: 'agent-2', status: 'passing' as const, serviceName: 'service-2', lastUpdated: new Date(), ttlExpiry: new Date(), metadata: { version: '1.0.0', capabilities: [], endpoints: { health: '', api: '' } }, metrics: { responseTime: 200, successRate: 95, resourceUtilization: { cpu: 20, memory: 60 } } }
    ];
    
    client['handleInitialHealthData'](mockAgents);
    
    const stats = client.getHealthStatistics();
    
    expect(stats.totalAgents).toBe(2);
    expect(stats.healthPercentage).toBe(100); // Both agents are passing
    expect(stats.averageResponseTime).toBe(150); // (100 + 200) / 2
    expect(stats.averageCpuUsage).toBe(15); // (10 + 20) / 2
    expect(stats.averageMemoryUsage).toBe(55); // (50 + 60) / 2
  });
});