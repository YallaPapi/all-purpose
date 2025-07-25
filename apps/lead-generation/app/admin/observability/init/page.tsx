'use client';

import { useState } from 'react';

export default function ObservabilityInit() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const initializeSystem = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/observability/init?action=full', {
        method: 'POST'
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Initialize Observability System
        </h1>
        
        <p className="text-gray-600 mb-6 text-center">
          Click the button below to populate your observability dashboard with sample data for all 9 meta-agents.
        </p>

        <button
          onClick={initializeSystem}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Initializing...
            </div>
          ) : (
            'Initialize System'
          )}
        </button>

        {result && (
          <div className="mt-6">
            <div className={`p-4 rounded-lg ${
              result.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
            }`}>
              <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? '✅ Success!' : '❌ Error'}
              </h3>
              <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? result.message : result.error}
              </p>
            </div>
            
            {result.success && (
              <div className="mt-4 text-center">
                <a 
                  href="/admin/observability"
                  className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  View Dashboard →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}