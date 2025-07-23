'use client';

import { useState, useEffect } from 'react';

export default function SimpleObservabilityDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Simple dashboard: Starting fetch...');
        const response = await fetch('/api/observability?action=metrics');
        console.log('Simple dashboard: Response status:', response.status);
        
        const result = await response.json();
        console.log('Simple dashboard: Result:', result);
        
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        console.error('Simple dashboard: Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading simple observability data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Simple Dashboard Error</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-red-600 text-sm font-mono">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Simple Observability Test</h1>
        
        {data && (
          <>
            {/* Basic Metrics */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">System Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{data.activeAgents}</div>
                  <div className="text-sm text-gray-600">Active Agents</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{data.completedTasks}</div>
                  <div className="text-sm text-gray-600">Completed Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{data.sharedKnowledge}</div>
                  <div className="text-sm text-gray-600">Shared Knowledge</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{data.totalEvents}</div>
                  <div className="text-sm text-gray-600">Total Events</div>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">System Health</h2>
              <div className={`inline-block px-4 py-2 rounded-full text-white font-medium ${
                data.systemHealth === 'healthy' ? 'bg-green-500' :
                data.systemHealth === 'degraded' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}>
                {data.systemHealth.toUpperCase()}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Average Response Time: {data.averageCoordinationTime}ms
              </div>
            </div>

            {/* Agent Performance */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Agent Performance</h2>
              {data.agentPerformance && Object.keys(data.agentPerformance).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Agent ID</th>
                        <th className="text-left py-2">Tasks</th>
                        <th className="text-left py-2">Avg Time</th>
                        <th className="text-left py-2">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.agentPerformance).map(([agentId, perf]: [string, any]) => (
                        <tr key={agentId} className="border-b">
                          <td className="py-2 font-mono text-sm">{agentId}</td>
                          <td className="py-2">{perf.tasksCompleted}</td>
                          <td className="py-2">{perf.averageTime}ms</td>
                          <td className="py-2">{Math.round(perf.successRate * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No agent performance data available.</p>
              )}
            </div>

            {/* Raw Data (for debugging) */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Raw Data (Debug)</h2>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}