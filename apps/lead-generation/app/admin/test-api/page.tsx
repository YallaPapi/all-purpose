'use client';

import { useState } from 'react';

export default function ApiTest() {
  const [result, setResult] = useState<string>('Click button to test API');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/observability?action=metrics');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Test</h1>
        
        <button 
          onClick={testApi}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded mb-6"
        >
          {loading ? 'Testing...' : 'Test Observability API'}
        </button>

        <pre className="bg-white p-6 rounded shadow text-sm overflow-auto">
          {result}
        </pre>
      </div>
    </div>
  );
}