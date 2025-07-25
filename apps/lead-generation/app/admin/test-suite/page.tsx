'use client';

import { useState } from 'react';

interface TestResult {
  [key: string]: any;
}

interface TestData {
  companyName: string;
  email: string;
  location: string;
  phone: string;
}

export default function TestSuite() {
  const [results, setResults] = useState<TestResult>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [testData, setTestData] = useState<TestData>({
    companyName: 'Test Solar Company',
    email: 'test@example.com',
    location: 'New York, NY',
    phone: '555-123-4567'
  });

  const runTest = async (testName: string) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    try {
      let response: Response;
      
      switch(testName) {
        case 'debug-all':
          response = await fetch('/api/debug');
          break;
        case 'debug-redis':
          response = await fetch('/api/debug?action=redis');
          break;
        case 'debug-openai':
          response = await fetch('/api/debug?action=openai');
          break;
        case 'debug-environment':
          response = await fetch('/api/debug?action=environment');
          break;
        case 'debug-urlGeneration':
          response = await fetch('/api/debug?action=urlGeneration');
          break;
        case 'debug-companies':
          response = await fetch('/api/debug?action=companies');
          break;
        case 'create-prototype':
          response = await fetch('/api/create-prototype', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyName: testData.companyName,
              contactName: 'Test User',
              contactEmail: testData.email,
              location: testData.location,
              title: 'CEO'
            })
          });
          break;
        case 'company-assistant':
          const companySlug = testData.companyName.toLowerCase()
            .replace(/\b(llc|inc|corp|ltd|co)\b/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          response = await fetch(`/api/company-assistant?company=${companySlug}`);
          break;
                 case 'chat-test':
           // First get or create a demo, then test chat
           const createResponse = await fetch('/api/create-prototype', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               companyName: testData.companyName + ' Chat Test',
               contactName: 'Chat Tester',
               contactEmail: testData.email
             })
           });
           const createData = await createResponse.json();
           
           if (createData.success && createData.assistantId) {
             response = await fetch('/api/chat', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 assistantId: createData.assistantId,
                 message: "Yes, I'm interested in solar panels",
                 threadId: null
               })
             });
           } else {
             throw new Error('Failed to create assistant for chat test');
           }
           break;
         case 'n8n-webhook-valid':
           response = await fetch('/api/create-prototype', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               companyName: testData.companyName,
               contactName: 'Test Contact',
               contactEmail: testData.email,
               location: testData.location,
               title: 'CEO'
             })
           });
           break;
         case 'n8n-webhook-invalid':
           response = await fetch('/api/create-prototype', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               // Missing required fields intentionally
               companyName: '',
               contactEmail: 'invalid-email'
             })
           });
           break;
         case 'n8n-cleanup':
           const cleanupSlug = testData.companyName.toLowerCase()
             .replace(/\b(llc|inc|corp|ltd|co)\b/g, '')
             .replace(/[^a-z0-9\s-]/g, '')
             .replace(/\s+/g, '-')
             .replace(/-+/g, '-')
             .replace(/^-|-$/g, '');
           response = await fetch('/api/debug', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               action: 'clear-company',
               data: { companySlug: cleanupSlug }
             })
           });
           break;
         default:
           throw new Error('Unknown test type');
      }
      
      const data = await response.json();
      setResults(prev => ({ ...prev, [testName]: { success: response.ok, data } }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Solar Lead System - Integration Test Suite</h1>
        
        {/* Test Data Configuration */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Data Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name:</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={testData.companyName} 
                onChange={(e) => setTestData({...testData, companyName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={testData.email} 
                onChange={(e) => setTestData({...testData, email: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location:</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={testData.location} 
                onChange={(e) => setTestData({...testData, location: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone:</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={testData.phone} 
                onChange={(e) => setTestData({...testData, phone: e.target.value})} 
              />
            </div>
          </div>
        </div>

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Debug Tests */}
          <TestCard 
            title="Complete System Debug" 
            description="Run all diagnostic checks (Redis, OpenAI, Environment, URLs, Companies)"
            onRun={() => runTest('debug-all')}
            loading={loading['debug-all']}
            results={results['debug-all']}
            category="debug"
          />
          
          <TestCard 
            title="Redis Connection" 
            description="Test Redis connection, set/get operations, and company data lookup"
            onRun={() => runTest('debug-redis')}
            loading={loading['debug-redis']}
            results={results['debug-redis']}
            category="debug"
          />
          
          <TestCard 
            title="OpenAI API" 
            description="Test OpenAI connection, model access, and assistant functionality"
            onRun={() => runTest('debug-openai')}
            loading={loading['debug-openai']}
            results={results['debug-openai']}
            category="debug"
          />
          
          <TestCard 
            title="Environment Variables" 
            description="Validate all required environment variables are present"
            onRun={() => runTest('debug-environment')}
            loading={loading['debug-environment']}
            results={results['debug-environment']}
            category="debug"
          />
          
          <TestCard 
            title="URL Generation" 
            description="Test n8n-compatible slug generation algorithm"
            onRun={() => runTest('debug-urlGeneration')}
            loading={loading['debug-urlGeneration']}
            results={results['debug-urlGeneration']}
            category="debug"
          />
          
          <TestCard 
            title="Company Mappings" 
            description="List all stored company->assistant mappings in Redis"
            onRun={() => runTest('debug-companies')}
            loading={loading['debug-companies']}
            results={results['debug-companies']}
            category="debug"
          />

          {/* Integration Tests */}
          <TestCard 
            title="Create Prototype" 
            description="Test demo site creation with OpenAI assistant"
            onRun={() => runTest('create-prototype')}
            loading={loading['create-prototype']}
            results={results['create-prototype']}
            category="integration"
          />
          
          <TestCard 
            title="Company Assistant Lookup" 
            description="Test Redis lookup for company->assistant mapping"
            onRun={() => runTest('company-assistant')}
            loading={loading['company-assistant']}
            results={results['company-assistant']}
            category="integration"
          />
          
                     <TestCard 
             title="Chat Functionality" 
             description="Test complete chat flow: create assistant + send message"
             onRun={() => runTest('chat-test')}
             loading={loading['chat-test']}
             results={results['chat-test']}
             category="integration"
           />

           {/* N8N Workflow Tests */}
           <TestCard 
             title="N8N Valid Webhook" 
             description="Test n8n webhook with valid payload data"
             onRun={() => runTest('n8n-webhook-valid')}
             loading={loading['n8n-webhook-valid']}
             results={results['n8n-webhook-valid']}
             category="n8n"
           />
           
           <TestCard 
             title="N8N Invalid Webhook" 
             description="Test n8n webhook error handling with invalid data"
             onRun={() => runTest('n8n-webhook-invalid')}
             loading={loading['n8n-webhook-invalid']}
             results={results['n8n-webhook-invalid']}
             category="n8n"
           />
           
           <TestCard 
             title="Test Data Cleanup" 
             description="Clean up test data from Redis and other storage"
             onRun={() => runTest('n8n-cleanup')}
             loading={loading['n8n-cleanup']}
             results={results['n8n-cleanup']}
             category="n8n"
           />
           
         </div>
      </div>
    </div>
  );
}

interface TestCardProps {
   title: string;
   description: string;
   onRun: () => void;
   loading: boolean;
   results?: TestResult;
   category: 'debug' | 'integration' | 'n8n';
 }

 function TestCard({ title, description, onRun, loading, results, category }: TestCardProps) {
   const categoryColors = {
     debug: 'border-blue-200 bg-blue-50',
     integration: 'border-green-200 bg-green-50',
     n8n: 'border-orange-200 bg-orange-50'
   };

   const buttonColors = {
     debug: 'bg-blue-500 hover:bg-blue-600',
     integration: 'bg-green-500 hover:bg-green-600',
     n8n: 'bg-orange-500 hover:bg-orange-600'
   };

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 ${categoryColors[category]} p-6`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      
      <button 
        onClick={onRun} 
        disabled={loading}
        className={`w-full px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonColors[category]}`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Running...
          </div>
        ) : (
          'Run Test'
        )}
      </button>
      
      {results && (
        <div className="mt-4">
          <div className={`p-2 rounded text-sm font-medium ${
            results.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {results.success ? '✅ SUCCESS' : '❌ FAILED'}
          </div>
          <div className="mt-2 max-h-48 overflow-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Results:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 