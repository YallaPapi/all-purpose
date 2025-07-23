'use client';

import { useState } from 'react';

interface MetricsData {
  totalEvents: number;
  activeAgents: number;
  completedTasks: number;
  sharedKnowledge: number;
  averageCoordinationTime: number;
  systemHealth: string;
  eventsByType: Record<string, number>;
  agentPerformance: Record<string, any>;
}

export default function WorkingObservabilityDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching observability data...');
      
      const [metricsRes, eventsRes] = await Promise.all([
        fetch('/api/observability?action=metrics'),
        fetch('/api/observability?action=events&limit=20')
      ]);

      console.log('Responses received:', {
        metricsStatus: metricsRes.status,
        eventsStatus: eventsRes.status
      });

      const metricsData = await metricsRes.json();
      const eventsData = await eventsRes.json();

      console.log('Data parsed:', {
        metricsSuccess: metricsData.success,
        eventsSuccess: eventsData.success
      });

      if (metricsData.success) {
        setMetrics(metricsData.data);
        console.log('Metrics set successfully');
      } else {
        setError(`Metrics error: ${metricsData.error}`);
      }

      if (eventsData.success) {
        setEvents(eventsData.data || []);
        console.log('Events set successfully:', eventsData.data?.length || 0);
      } else {
        console.warn('Events error:', eventsData.error);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('Fetch error:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const startAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    setAutoRefresh(true);
    fetchAllData(); // Initial fetch
    
    const interval = setInterval(fetchAllData, 5000);
    setRefreshInterval(interval);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    setAutoRefresh(false);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500 text-white';
      case 'degraded': return 'bg-yellow-500 text-white';
      case 'critical': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Meta-Agent Observability</h1>
            <p className="text-gray-600 mt-1">Real-time coordination monitoring for 9 meta-agents</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Fetch Data'}
            </button>
            {autoRefresh ? (
              <button
                onClick={stopAutoRefresh}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Stop Auto-Refresh
              </button>
            ) : (
              <button
                onClick={startAutoRefresh}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Start Auto-Refresh
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error:</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* System Status */}
        {metrics && (
          <div className="mb-6">
            <div className={`inline-block px-4 py-2 rounded-full font-medium ${getHealthColor(metrics.systemHealth)}`}>
              System Status: {metrics.systemHealth.toUpperCase()}
            </div>
          </div>
        )}

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl font-bold text-blue-600">{metrics.activeAgents}</div>
              <div className="text-sm text-gray-600">Active Agents</div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl font-bold text-green-600">{metrics.completedTasks}</div>
              <div className="text-sm text-gray-600">Completed Tasks</div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl font-bold text-purple-600">{metrics.sharedKnowledge}</div>
              <div className="text-sm text-gray-600">Shared Knowledge</div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl font-bold text-orange-600">{metrics.totalEvents}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
          </div>
        )}

        {/* Response Time */}
        {metrics && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Performance</h3>
            <div className="text-xl font-bold text-gray-900">
              {metrics.averageCoordinationTime}ms
            </div>
            <div className="text-sm text-gray-600">Average Coordination Time</div>
          </div>
        )}

        {/* Agent Performance Table */}
        {metrics && metrics.agentPerformance && Object.keys(metrics.agentPerformance).length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
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
                  {Object.entries(metrics.agentPerformance).map(([agentId, perf]: [string, any]) => (
                    <tr key={agentId} className="border-b">
                      <td className="py-2 font-mono text-sm">{agentId}</td>
                      <td className="py-2">{perf.tasksCompleted}</td>
                      <td className="py-2">{perf.averageTime}ms</td>
                      <td className="py-2">{Math.round(perf.successRate * 100)}%</td>
                      <td className="py-2 text-sm text-gray-600">
                        {new Date(perf.lastSeen).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Events */}
        {events && events.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Events</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map((event, index) => (
                <div key={event.id || index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      event.eventType === 'agent' ? 'bg-blue-100 text-blue-800' :
                      event.eventType === 'task' ? 'bg-green-100 text-green-800' :
                      event.eventType === 'knowledge' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.eventType}
                    </span>
                    <span className="font-medium">{event.eventName?.replace(/_/g, ' ')}</span>
                    {event.agentId && (
                      <span className="text-sm text-gray-500 font-mono">{event.agentId}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'No timestamp'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !metrics && !error && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Observability Data</h3>
            <p className="text-gray-600 mb-4">Click "Fetch Data" to load meta-agent coordination metrics</p>
            <button
              onClick={fetchAllData}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Load Observability Data
            </button>
          </div>
        )}

        {/* Raw Data Debug (collapsed by default) */}
        {metrics && (
          <details className="bg-white rounded-lg shadow-lg p-6">
            <summary className="text-lg font-semibold text-gray-800 cursor-pointer">Raw Data (Debug)</summary>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96 mt-4">
              {JSON.stringify({ metrics, events: events.slice(0, 3) }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}