'use client';

import { useState, useEffect } from 'react';

export default function MetaAgentDashboard() {
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    // Get list of active requests
    fetch('/api/meta-agent-factory')
      .then(res => res.json())
      .then(data => {
        if (data.activeRequests) {
          setActiveRequests(data.activeRequests);
          if (data.activeRequests.length > 0) {
            setSelectedRequest(data.activeRequests[0].requestId);
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedRequest) return;

    // Connect to real-time progress
    const eventSource = new EventSource(`/api/meta-agent-factory/progress/${selectedRequest}?format=sse`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);
      } catch (err) {
        console.error('SSE parsing error:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [selectedRequest]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-400 mb-2">🤖 Meta-Agent Factory Dashboard</h1>
          <p className="text-gray-400">Real-time monitoring of AI agents at work</p>
        </div>

        {/* Request Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Active Requests:
          </label>
          <select
            className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 w-full"
            value={selectedRequest}
            onChange={(e) => setSelectedRequest(e.target.value)}
          >
            <option value="">Select a request to monitor...</option>
            {activeRequests.map((req) => (
              <option key={req.requestId} value={req.requestId}>
                {req.requestId} - {req.type} ({req.status})
              </option>
            ))}
          </select>
        </div>

        {/* Live Progress Display */}
        {progress && progress.type === 'progress' && (
          <div className="space-y-6">
            {/* Overall Progress */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-green-400">Overall Progress</h2>
                <div className="text-3xl font-bold text-green-400">
                  {progress.overallProgress}%
                </div>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${progress.overallProgress}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-gray-400">Current Step</div>
                  <div className="text-xl font-bold">{progress.currentStep} / {progress.totalSteps}</div>
                </div>
                <div>
                  <div className="text-gray-400">Current Agent</div>
                  <div className="text-xl font-bold text-blue-400">{progress.currentStepData?.agent}</div>
                </div>
                <div>
                  <div className="text-gray-400">Status</div>
                  <div className="text-xl font-bold text-yellow-400">{progress.currentStepData?.status}</div>
                </div>
              </div>
            </div>

            {/* Current Step Details */}
            {progress.currentStepData && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-blue-400 mb-2">
                    {progress.currentStepData.title}
                  </h3>
                  <p className="text-gray-300">{progress.currentStepData.description}</p>
                </div>

                {/* Visual Representation */}
                <div className="bg-black rounded-lg p-4 font-mono text-green-400">
                  <pre className="whitespace-pre-wrap text-sm">
                    {progress.currentStepData.visual}
                  </pre>
                </div>
              </div>
            )}

            {/* Architecture Diagram */}
            {progress.architecture && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-purple-400 mb-4">🏗️ System Architecture</h3>
                <div className="bg-black rounded-lg p-4 font-mono text-green-400">
                  <pre className="whitespace-pre-wrap text-sm">
                    {progress.architecture}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completed State */}
        {progress && progress.type === 'completed' && (
          <div className="bg-green-900 border border-green-500 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-4">🎉 Build Complete!</h2>
            <div className="bg-black rounded-lg p-4 font-mono text-green-400">
              <pre className="whitespace-pre-wrap text-sm">
                {progress.finalArchitecture}
              </pre>
            </div>
          </div>
        )}

        {/* No Progress Yet */}
        {!progress && selectedRequest && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
            <div className="text-gray-400 mb-4">Connecting to meta-agents...</div>
            <div className="animate-pulse text-blue-400">🤖 Waiting for real-time data...</div>
          </div>
        )}

        {/* No Request Selected */}
        {!selectedRequest && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
            <div className="text-gray-400 mb-4">No active request selected</div>
            <div className="text-blue-400">Select a request above to monitor progress</div>
          </div>
        )}

        {/* Quick Access Links */}
        <div className="mt-8 text-center">
          <a 
            href="/meta-agent-factory" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors mr-4"
          >
            🤖 Submit New Request
          </a>
          <button 
            onClick={() => window.location.reload()} 
            className="inline-block bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            🔄 Refresh Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}