'use client';

import { useState } from 'react';

interface WorkRequest {
  type: 'scaffold' | 'fix-patterns' | 'generate-docs' | 'create-templates' | 'integrate-systems' | 'debug-system';
  description: string;
  requirements?: {
    projectName?: string;
    framework?: string;
    features?: string[];
    targetDirectory?: string;
    codeBase?: string;
    integrationEndpoints?: string[];
    documentationTypes?: string[];
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export default function MetaAgentFactoryPage() {
  const [request, setRequest] = useState<WorkRequest>({
    type: 'scaffold',
    description: '',
    priority: 'medium',
    requirements: {}
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/meta-agent-factory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      const resultData = await response.json();
      setResult(resultData);
      
      // Start polling for status updates
      if (resultData.requestId) {
        pollStatus(resultData.requestId);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const pollStatus = async (requestId: string) => {
    // Use Server-Sent Events for real-time visual progress
    const eventSource = new EventSource(`/api/meta-agent-factory/progress/${requestId}?format=sse`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          setResult((prev: any) => ({ 
            ...prev, 
            visualProgress: data,
            status: {
              ...prev.status,
              progress: data.overallProgress,
              status: data.overallProgress === 100 ? 'completed' : 'in_progress'
            }
          }));
        } else if (data.type === 'completed') {
          setResult((prev: any) => ({ 
            ...prev, 
            finalArchitecture: data.finalArchitecture,
            status: { ...prev.status, status: 'completed', progress: 100 }
          }));
          eventSource.close();
        }
      } catch (err) {
        console.error('SSE parsing error:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();
      
      // Fallback to polling
      setTimeout(() => pollStatusFallback(requestId), 3000);
    };
  };

  const pollStatusFallback = async (requestId: string) => {
    try {
      const response = await fetch(`/api/meta-agent-factory/status/${requestId}`);
      const status = await response.json();
      
      setResult((prev: any) => ({ ...prev, status }));
      
      // Continue polling if not completed
      if (status.status !== 'completed' && status.status !== 'failed') {
        setTimeout(() => pollStatusFallback(requestId), 3000);
      }
    } catch (err) {
      console.error('Status polling error:', err);
    }
  };

  const workTypes = [
    { value: 'scaffold', label: 'Scaffold New Project', description: 'Generate complete project structure with best practices' },
    { value: 'fix-patterns', label: 'Fix Anti-Patterns', description: 'Analyze and fix hardcoded limitations in existing code' },
    { value: 'generate-docs', label: 'Generate Documentation', description: 'Create comprehensive project documentation' },
    { value: 'create-templates', label: 'Create Templates', description: 'Build reusable templates for common patterns' },
    { value: 'integrate-systems', label: 'Integrate Systems', description: 'Design and implement system integrations' },
    { value: 'debug-system', label: 'Debug System', description: 'Comprehensive debugging and issue resolution' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🤖 Meta-Agent Factory</h1>
            <p className="text-gray-600">Submit work requests to our AI agent factory</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Work Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${ 
                      request.type === type.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setRequest(prev => ({ ...prev, type: type.value as any }))}
                  >
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{type.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                value={request.description}
                onChange={(e) => setRequest(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what you want to build or fix..."
                required
              />
            </div>

            {/* Requirements based on type */}
            {request.type === 'scaffold' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={request.requirements?.projectName || ''}
                    onChange={(e) => setRequest(prev => ({
                      ...prev,
                      requirements: { ...prev.requirements, projectName: e.target.value }
                    }))}
                    placeholder="my-awesome-project"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Framework
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={request.requirements?.framework || 'node'}
                    onChange={(e) => setRequest(prev => ({
                      ...prev,
                      requirements: { ...prev.requirements, framework: e.target.value }
                    }))}
                  >
                    <option value="node">Node.js/TypeScript</option>
                    <option value="react">React</option>
                    <option value="nextjs">Next.js</option>
                    <option value="express">Express.js</option>
                    <option value="fastify">Fastify</option>
                  </select>
                </div>
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={request.priority}
                onChange={(e) => setRequest(prev => ({ ...prev, priority: e.target.value as any }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !request.description}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '🚀 Submitting to Meta-Agents...' : '🤖 Submit to Factory'}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">❌ {error}</div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="mt-8 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-lg font-medium text-green-800 mb-2">✅ Request Submitted Successfully!</h3>
                <div className="text-green-700 space-y-2">
                  <div><strong>Request ID:</strong> {result.requestId}</div>
                  <div><strong>Assigned Agents:</strong> {result.assignedAgents?.join(', ')}</div>
                  <div><strong>Estimated Completion:</strong> {result.estimatedCompletion}</div>
                </div>
              </div>

              {/* Real-Time Visual Progress */}
              {result.visualProgress && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="text-xl font-bold text-blue-800 mb-4">🎬 Live Build Progress</h4>
                  
                  {/* Current Step Highlight */}
                  {result.visualProgress.currentStepData && (
                    <div className="mb-6 p-4 bg-white rounded-lg border-l-4 border-blue-500 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-bold text-lg">{result.visualProgress.currentStepData.title}</h5>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Agent:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                            {result.visualProgress.currentStepData.agent}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{result.visualProgress.currentStepData.description}</p>
                      
                      {/* Visual Representation */}
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm whitespace-pre-wrap">
                        {result.visualProgress.currentStepData.visual}
                      </div>
                    </div>
                  )}

                  {/* Architecture Visualization */}
                  {result.visualProgress.architecture && (
                    <div className="mb-6 p-4 bg-gray-900 text-white rounded-lg">
                      <h5 className="font-bold text-white mb-3">🏗️ System Architecture</h5>
                      <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                        {result.visualProgress.architecture}
                      </pre>
                    </div>
                  )}

                  {/* Progress Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-blue-700 font-medium">Overall Progress:</span>
                        <span className="text-blue-900 font-bold">{result.visualProgress.overallProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${result.visualProgress.overallProgress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Step Progress</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {result.visualProgress.currentStep} / {result.visualProgress.totalSteps}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Architecture Display */}
              {result.finalArchitecture && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h4 className="text-xl font-bold text-green-800 mb-4">🎉 Build Complete!</h4>
                  <div className="bg-gray-900 text-white p-4 rounded-lg">
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                      {result.finalArchitecture}
                    </pre>
                  </div>
                </div>
              )}

              {/* Fallback Status Updates */}
              {result.status && !result.visualProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-lg font-medium text-blue-800 mb-2">📊 Progress Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Status:</span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        result.status.status === 'completed' ? 'bg-green-100 text-green-800' :
                        result.status.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        result.status.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.status.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${result.status.progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-sm text-blue-600">
                      {result.status.progress}% complete - {result.status.estimatedCompletion}
                    </div>
                    
                    {result.status.currentAgent && (
                      <div className="text-sm text-blue-600">
                        Current Agent: <span className="font-medium">{result.status.currentAgent}</span>
                      </div>
                    )}

                    {result.status.completedTasks?.length > 0 && (
                      <div className="text-sm text-green-600">
                        ✅ Completed: {result.status.completedTasks.join(', ')}
                      </div>
                    )}

                    {result.status.results && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                        <h5 className="font-medium text-green-800 mb-2">🎉 Results Ready!</h5>
                        {result.status.results.outputFiles && (
                          <div className="text-sm text-green-700">
                            <strong>Generated Files:</strong>
                            <ul className="list-disc list-inside mt-1">
                              {result.status.results.outputFiles.map((file: string, i: number) => (
                                <li key={i}>{file}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.status.results.deploymentUrl && (
                          <div className="text-sm text-green-700 mt-2">
                            <strong>Deployment:</strong>{' '}
                            <a href={result.status.results.deploymentUrl} target="_blank" rel="noopener noreferrer" className="underline">
                              {result.status.results.deploymentUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}