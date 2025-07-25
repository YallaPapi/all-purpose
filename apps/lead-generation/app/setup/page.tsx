'use client';

import { useState } from 'react';

interface ApiKeys {
  openai: string;
  anthropic: string;
  upstash_vector_url: string;
  upstash_vector_token: string;
  upstash_redis_url: string;
  upstash_redis_token: string;
  github_token?: string;
  perplexity_api?: string;
}

export default function SetupPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    anthropic: '',
    upstash_vector_url: '',
    upstash_vector_token: '',
    upstash_redis_url: '',
    upstash_redis_token: '',
    github_token: '',
    perplexity_api: ''
  });
  
  const [setupStep, setSetupStep] = useState(1);
  const [validating, setValidating] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const handleValidateAndSave = async () => {
    setValidating(true);
    
    // Save to environment
    const response = await fetch('/api/setup/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiKeys)
    });
    
    if (response.ok) {
      setSetupComplete(true);
    }
    
    setValidating(false);
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <h1 className="text-4xl font-bold text-green-600 mb-4">🎉 Setup Complete!</h1>
            <p className="text-xl text-gray-600 mb-8">
              Your Meta-Agent Factory is now ready to build real software.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="/meta-agent-factory" 
                className="bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 block"
              >
                🏭 Meta-Agent Factory
              </a>
              <a 
                href="/project-discovery" 
                className="bg-purple-600 text-white px-6 py-4 rounded-lg hover:bg-purple-700 block"
              >
                🔍 Project Discovery
              </a>
              <a 
                href="/observability" 
                className="bg-indigo-600 text-white px-6 py-4 rounded-lg hover:bg-indigo-700 block"
              >
                📊 Observability
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ⚙️ Meta-Agent Factory Setup
            </h1>
            <p className="text-xl text-gray-600">
              Let's get your AI agents connected to real services
            </p>
          </div>

          {setupStep === 1 && (
            <div className="space-y-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-yellow-800 mb-2">
                  🚨 Required Accounts & API Keys
                </h3>
                <p className="text-yellow-700 mb-4">
                  You'll need accounts and API keys from these services:
                </p>
                <ul className="space-y-2 text-yellow-700">
                  <li>🤖 <strong>OpenAI</strong> - For GPT models (code generation)</li>
                  <li>🧠 <strong>Anthropic</strong> - For Claude models (analysis & planning)</li>
                  <li>🗄️ <strong>Upstash Vector</strong> - For RAG/documentation memory</li>
                  <li>⚡ <strong>Upstash Redis</strong> - For real-time coordination</li>
                  <li>📚 <strong>GitHub</strong> - For repository operations (optional)</li>
                  <li>🔍 <strong>Perplexity</strong> - For research capabilities (optional)</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-800">🤖 OpenAI Setup</h4>
                  <p className="text-blue-700 text-sm">
                    1. Go to <a href="https://platform.openai.com/api-keys" className="underline">platform.openai.com</a><br/>
                    2. Create new API key<br/>
                    3. Copy the key below
                  </p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-bold text-purple-800">🧠 Anthropic Setup</h4>
                  <p className="text-purple-700 text-sm">
                    1. Go to <a href="https://console.anthropic.com/" className="underline">console.anthropic.com</a><br/>
                    2. Create API key<br/>
                    3. Copy the key below
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-green-800">🗄️ Upstash Vector</h4>
                  <p className="text-green-700 text-sm">
                    1. Go to <a href="https://console.upstash.com/" className="underline">console.upstash.com</a><br/>
                    2. Create Vector database<br/>
                    3. Copy URL & Token
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-bold text-red-800">⚡ Upstash Redis</h4>
                  <p className="text-red-700 text-sm">
                    1. Same Upstash console<br/>
                    2. Create Redis database<br/>
                    3. Copy URL & Token
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setSetupStep(2)}
                  className="bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700"
                >
                  I Have My API Keys Ready →
                </button>
              </div>
            </div>
          )}

          {setupStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 2: Enter Your API Keys</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key *
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="sk-..."
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anthropic API Key *
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="sk-ant-..."
                    value={apiKeys.anthropic}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upstash Vector URL *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="https://..."
                    value={apiKeys.upstash_vector_url}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, upstash_vector_url: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upstash Vector Token *
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="..."
                    value={apiKeys.upstash_vector_token}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, upstash_vector_token: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upstash Redis URL *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="https://..."
                    value={apiKeys.upstash_redis_url}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, upstash_redis_url: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upstash Redis Token *
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="..."
                    value={apiKeys.upstash_redis_token}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, upstash_redis_token: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Token (Optional)
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="ghp_..."
                    value={apiKeys.github_token}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, github_token: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Perplexity API (Optional)
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="pplx-..."
                    value={apiKeys.perplexity_api}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, perplexity_api: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setSetupStep(1)}
                  className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600"
                >
                  ← Back
                </button>
                <button
                  onClick={handleValidateAndSave}
                  disabled={validating || !apiKeys.openai || !apiKeys.anthropic || !apiKeys.upstash_vector_url}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {validating ? 'Validating...' : 'Validate & Start Building 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}