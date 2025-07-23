/**
 * Observability API Route
 * 
 * Provides real-time meta-agent coordination data for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'metrics';
  const eventType = searchParams.get('eventType');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    switch (action) {
      case 'metrics':
        const metricsData = await redis.get('observability:metrics:current');
        const metrics = metricsData ? JSON.parse(metricsData) : null;
        
        return NextResponse.json({
          success: true,
          data: metrics || {
            totalEvents: 0,
            activeAgents: 0,
            completedTasks: 0,
            sharedKnowledge: 0,
            averageCoordinationTime: 0,
            systemHealth: 'unknown',
            eventsByType: {},
            agentPerformance: {}
          }
        });

      case 'events':
        const key = eventType ? `observability:events:${eventType}` : 'observability:events';
        const events = await redis.lrange(key, 0, limit - 1);
        const parsedEvents = events.map(event => JSON.parse(event)).reverse();
        
        return NextResponse.json({
          success: true,
          data: parsedEvents
        });

      case 'flow':
        // Get recent events to build flow visualization
        const allEvents = await redis.lrange('observability:events', 0, 199);
        const flowData = buildFlowVisualization(allEvents.map(e => JSON.parse(e)));
        
        return NextResponse.json({
          success: true,
          data: flowData
        });

      case 'health':
        const healthData = await getSystemHealth();
        
        return NextResponse.json({
          success: true,
          data: healthData
        });

      case 'history':
        const historyData = await redis.lrange('observability:metrics:history', 0, 19);
        const parsedHistory = historyData.map(h => JSON.parse(h)).reverse();
        
        return NextResponse.json({
          success: true,
          data: parsedHistory
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Observability API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function buildFlowVisualization(events: any[]) {
  const nodes = new Map();
  const connections = new Map();
  
  // Process events to build agent flow
  for (const event of events) {
    if (event.agentId) {
      const nodeId = event.agentId;
      
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          label: event.data.agentName || nodeId,
          type: 'agent',
          status: event.data.status || 'unknown',
          lastActivity: event.timestamp,
          events: 0,
          tasksCompleted: 0,
          knowledgeShared: 0,
          errorRate: 0
        });
      }
      
      const node = nodes.get(nodeId);
      node.events++;
      node.lastActivity = event.timestamp;
      
      // Update node metrics
      if (event.eventName === 'task_updated' && event.data.status === 'completed') {
        node.tasksCompleted++;
      }
      if (event.eventName === 'knowledge_shared') {
        node.knowledgeShared++;
      }
      if (event.eventName.includes('error') || event.data.error) {
        node.errorRate++;
      }
      
      // Track connections between agents
      if (event.metadata?.relevantAgents) {
        for (const relevantAgent of event.metadata.relevantAgents) {
          if (relevantAgent !== nodeId) {
            const connectionKey = [nodeId, relevantAgent].sort().join('-');
            connections.set(connectionKey, {
              source: nodeId,
              target: relevantAgent,
              strength: (connections.get(connectionKey)?.strength || 0) + 1,
              lastInteraction: event.timestamp
            });
          }
        }
      }
    }
  }
  
  // Add task and knowledge nodes
  const taskEvents = events.filter(e => e.eventType === 'task');
  const knowledgeEvents = events.filter(e => e.eventType === 'knowledge');
  
  return {
    agents: Array.from(nodes.values()),
    connections: Array.from(connections.values()),
    taskFlow: groupEventsByTimeWindow(taskEvents, 5 * 60 * 1000), // 5-minute windows
    knowledgeFlow: groupEventsByTimeWindow(knowledgeEvents, 5 * 60 * 1000),
    totalEvents: events.length,
    timeRange: events.length > 0 ? {
      start: events[events.length - 1].timestamp,
      end: events[0].timestamp
    } : null
  };
}

function groupEventsByTimeWindow(events: any[], windowMs: number) {
  const windows = new Map();
  
  for (const event of events) {
    const timestamp = new Date(event.timestamp).getTime();
    const windowStart = Math.floor(timestamp / windowMs) * windowMs;
    
    if (!windows.has(windowStart)) {
      windows.set(windowStart, {
        timestamp: new Date(windowStart),
        events: []
      });
    }
    
    windows.get(windowStart).events.push(event);
  }
  
  return Array.from(windows.values()).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

async function getSystemHealth() {
  try {
    const metricsData = await redis.get('observability:metrics:current');
    const metrics = metricsData ? JSON.parse(metricsData) : null;
    
    if (!metrics) {
      return {
        status: 'unknown',
        message: 'No observability data available',
        checks: {}
      };
    }
    
    const checks = {
      agentConnectivity: {
        status: metrics.activeAgents > 0 ? 'healthy' : 'critical',
        value: metrics.activeAgents,
        message: `${metrics.activeAgents} agents online`
      },
      taskProcessing: {
        status: metrics.completedTasks > 0 ? 'healthy' : 'warning',
        value: metrics.completedTasks,
        message: `${metrics.completedTasks} tasks completed`
      },
      knowledgeSharing: {
        status: metrics.sharedKnowledge > 0 ? 'healthy' : 'warning',
        value: metrics.sharedKnowledge,
        message: `${metrics.sharedKnowledge} knowledge entries`
      },
      responseTime: {
        status: metrics.averageCoordinationTime < 5000 ? 'healthy' : 
               metrics.averageCoordinationTime < 10000 ? 'warning' : 'critical',
        value: metrics.averageCoordinationTime,
        message: `${metrics.averageCoordinationTime}ms average response time`
      },
      systemHealth: {
        status: metrics.systemHealth,
        message: `System is ${metrics.systemHealth}`
      }
    };
    
    const overallStatus = Object.values(checks).some(c => c.status === 'critical') ? 'critical' :
                         Object.values(checks).some(c => c.status === 'warning') ? 'warning' : 'healthy';
    
    return {
      status: overallStatus,
      message: `System is ${overallStatus}`,
      checks,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to check system health',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}