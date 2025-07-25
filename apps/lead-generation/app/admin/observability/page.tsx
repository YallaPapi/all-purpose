'use client';

import { useState, useEffect } from 'react';

interface ObservabilityEvent {
  id: string;
  timestamp: string;
  eventType: 'agent' | 'task' | 'knowledge' | 'coordination' | 'system';
  eventName: string;
  agentId?: string;
  taskId?: string;
  knowledgeId?: string;
  data: any;
  metadata: {
    duration?: number;
    previousState?: string;
    newState?: string;
    relevantAgents?: string[];
    priority?: string;
    tags?: string[];
  };
}

interface CoordinationMetrics {
  totalEvents: number;
  activeAgents: number;
  completedTasks: number;
  sharedKnowledge: number;
  averageCoordinationTime: number;
  systemHealth: 'healthy' | 'degraded' | 'critical' | 'unknown';
  eventsByType: Record<string, number>;
  agentPerformance: Record<string, {
    tasksCompleted: number;
    averageTime: number;
    successRate: number;
    lastSeen: string;
  }>;
}

interface AgentFlowNode {
  id: string;
  label: string;
  type: 'agent';
  status: string;
  lastActivity: string;
  events: number;
  tasksCompleted: number;
  knowledgeShared: number;
  errorRate: number;
}

export default function ObservabilityDashboard() {
  const [metrics, setMetrics] = useState<CoordinationMetrics | null>(null);
  const [events, setEvents] = useState<ObservabilityEvent[]>([]);
  const [agents, setAgents] = useState<AgentFlowNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'agents' | 'health'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setError(null); // Clear previous errors
      console.log('Starting observability data fetch...');
      
      const [metricsRes, eventsRes, flowRes] = await Promise.all([
        fetch('/api/observability?action=metrics'),
        fetch('/api/observability?action=events&limit=100'),
        fetch('/api/observability?action=flow')
      ]);

      console.log('Fetch responses received:', {
        metricsStatus: metricsRes.status,
        eventsStatus: eventsRes.status,
        flowStatus: flowRes.status
      });

      const metricsData = await metricsRes.json();
      const eventsData = await eventsRes.json();
      const flowData = await flowRes.json();

      console.log('API responses parsed:', {
        metricsSuccess: metricsData.success,
        eventsSuccess: eventsData.success,
        flowSuccess: flowData.success,
        metricsDataType: typeof metricsData.data,
        hasMetricsData: !!metricsData.data
      });

      // Check for API errors and log them
      if (!metricsData.success) {
        console.error('Metrics API error:', metricsData.error, metricsData.details);
        setError(`API Error: ${metricsData.error}`);
      } else {
        console.log('Setting metrics data:', metricsData.data);
        setMetrics(metricsData.data);
      }
      
      if (!eventsData.success) {
        console.error('Events API error:', eventsData.error, eventsData.details);
        if (!error) setError(`Events API Error: ${eventsData.error}`);
      } else {
        setEvents(eventsData.data);
      }
      
      if (!flowData.success) {
        console.error('Flow API error:', flowData.error, flowData.details);
        if (!error) setError(`Flow API Error: ${flowData.error}`);
      } else {
        setAgents(flowData.data.agents || []);
      }
      
      setLastUpdated(new Date());
      console.log('Fetch completed successfully');
    } catch (error) {
      console.error('Failed to fetch observability data:', error);
      setError(`Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch data on component mount
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-green-500';
      case 'working': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading observability data...</p>
        </div>
      </div>
    );
  }


  if (error && !metrics) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Observability Dashboard Error</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-red-700 font-medium mb-2">Error Details:</p>
            <p className="text-red-600 text-sm font-mono bg-red-100 p-3 rounded">{error}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-blue-700 font-medium mb-2">To fix this issue:</p>
            <ol className="text-blue-600 text-sm text-left list-decimal list-inside space-y-1">
              <li>Ensure Redis (Upstash KV) environment variables are set in your .env.local file</li>
              <li>Check that KV_REST_API_URL and KV_REST_API_TOKEN are valid</li>
              <li>Verify your Upstash Redis instance is running and accessible</li>
            </ol>
          </div>
          <button
            onClick={fetchData}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Meta-Agent Observability</h1>
            <p className="text-gray-600 mt-1">Real-time coordination monitoring for 9 meta-agents</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded text-sm ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* System Health Banner */}
        {metrics && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            metrics.systemHealth === 'healthy' ? 'border-green-200 bg-green-50' :
            metrics.systemHealth === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
            metrics.systemHealth === 'critical' ? 'border-red-200 bg-red-50' :
            'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  metrics.systemHealth === 'healthy' ? 'bg-green-500' :
                  metrics.systemHealth === 'degraded' ? 'bg-yellow-500' :
                  metrics.systemHealth === 'critical' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="font-semibold text-lg">
                  System Status: {metrics.systemHealth.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {metrics.activeAgents} agents online • {metrics.totalEvents} total events
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'events', label: 'Event Stream', icon: '📋' },
                { id: 'agents', label: 'Agent Flow', icon: '🤖' },
                { id: 'health', label: 'System Health', icon: '🏥' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Active Agents"
                value={metrics.activeAgents}
                subtitle="Currently online"
                color="blue"
                icon="🤖"
              />
              <MetricCard
                title="Completed Tasks"
                value={metrics.completedTasks}
                subtitle="Total processed"
                color="green"
                icon="✅"
              />
              <MetricCard
                title="Knowledge Shared"
                value={metrics.sharedKnowledge}
                subtitle="Total entries"
                color="purple"
                icon="🧠"
              />
              <MetricCard
                title="Avg Response Time"
                value={`${metrics.averageCoordinationTime}ms`}
                subtitle="Coordination speed"
                color="orange"
                icon="⚡"
              />
            </div>

            {/* Event Type Distribution */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Event Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(metrics.eventsByType).map(([type, count]) => (
                  <div key={type} className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Performance Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Agent Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Agent ID</th>
                      <th className="text-left py-2">Tasks</th>
                      <th className="text-left py-2">Avg Time</th>
                      <th className="text-left py-2">Success Rate</th>
                      <th className="text-left py-2">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metrics.agentPerformance).map(([agentId, perf]) => (
                      <tr key={agentId} className="border-b">
                        <td className="py-2 font-mono text-sm">{agentId}</td>
                        <td className="py-2">{perf.tasksCompleted}</td>
                        <td className="py-2">{perf.averageTime}ms</td>
                        <td className="py-2">{Math.round(perf.successRate * 100)}%</td>
                        <td className="py-2 text-sm text-gray-600">
                          {formatTimeAgo(perf.lastSeen)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Real-time Event Stream</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
              {events.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No events available. Start the observability collector to see real-time data.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Agent Network</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
                {agents.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No agent data available. Agents will appear here once they register with the coordinator.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Health Details</h3>
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                System health monitoring will be displayed here.
                <br />
                This includes connection status, error rates, and performance metrics.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for metric cards
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  icon: string;
}

function MetricCard({ title, value, subtitle, color, icon }: MetricCardProps) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50'
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 ${colorClasses[color]} p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

// Component for event rows
interface EventRowProps {
  event: ObservabilityEvent;
}

function EventRow({ event }: EventRowProps) {
  const eventTypeColors = {
    agent: 'bg-blue-100 text-blue-800',
    task: 'bg-green-100 text-green-800',
    knowledge: 'bg-purple-100 text-purple-800',
    coordination: 'bg-orange-100 text-orange-800',
    system: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
      <div className="flex items-center space-x-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${eventTypeColors[event.eventType]}`}>
          {event.eventType}
        </span>
        <span className="font-medium">{event.eventName.replace(/_/g, ' ')}</span>
        {event.agentId && (
          <span className="text-sm text-gray-500 font-mono">
            {event.agentId}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-500">
        {formatTimeAgo(event.timestamp)}
      </div>
    </div>
  );
}

// Component for agent cards
interface AgentCardProps {
  agent: AgentFlowNode;
}

function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(agent.status)}`}></div>
          <span className="font-medium">{agent.label}</span>
        </div>
        <span className="text-xs text-gray-500">{agent.status}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-600">Tasks:</span>
          <span className="ml-1 font-medium">{agent.tasksCompleted}</span>
        </div>
        <div>
          <span className="text-gray-600">Knowledge:</span>
          <span className="ml-1 font-medium">{agent.knowledgeShared}</span>
        </div>
        <div>
          <span className="text-gray-600">Events:</span>
          <span className="ml-1 font-medium">{agent.events}</span>
        </div>
        <div>
          <span className="text-gray-600">Errors:</span>
          <span className="ml-1 font-medium">{agent.errorRate}</span>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Last activity: {formatTimeAgo(agent.lastActivity)}
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'idle': return 'bg-green-500';
    case 'working': return 'bg-blue-500';
    case 'error': return 'bg-red-500';
    case 'offline': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
}

function formatTimeAgo(timestamp: string) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}