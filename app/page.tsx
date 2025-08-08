'use client';

import { useState } from 'react';
import Image from "next/image";

export default function Home() {
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [demoUrl, setDemoUrl] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDemoData, setCustomDemoData] = useState({
    companyName: '',
    contactName: '',
    industry: '',
    city: '',
    state: '',
    organization_short_description: ''
  });

  const createQuickDemo = async () => {
    setIsCreatingDemo(true);
    try {
      const response = await fetch('/api/quick-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: 'Custom Demo Company',
          industry: 'business-services',
          generateUnique: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.demoUrl) {
          setDemoUrl(data.demoUrl);
          window.open(data.demoUrl, '_blank');
        } else {
          alert('Demo created but no URL returned. Please try again.');
        }
      } else {
        const errorData = await response.json();
        console.error('Demo creation failed:', errorData);
        alert(`Failed to create demo: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating demo:', error);
      alert('Error creating demo. Please try again.');
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const openTestDemo = () => {
    window.open(`${window.location.origin}/quick-demo-business`, '_blank');
  };

  const createCustomDemo = async () => {
    // Validate required fields
    if (!customDemoData.companyName || !customDemoData.contactName) {
      alert('Please fill in Company Name and Contact Name');
      return;
    }

    setIsCreatingDemo(true);
    try {
      const response = await fetch('/api/create-prototype', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: customDemoData.companyName,
          contactName: customDemoData.contactName,
          industry: customDemoData.industry || 'business-services',
          city: customDemoData.city,
          state: customDemoData.state,
          organization_short_description: customDemoData.organization_short_description
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.url || data.demoUrl) {
          const demoLink = data.url || data.demoUrl;
          setDemoUrl(demoLink);
          setShowCustomForm(false);
          window.open(demoLink, '_blank');
          
          // Reset form
          setCustomDemoData({
            companyName: '',
            contactName: '',
            industry: '',
            city: '',
            state: '',
            organization_short_description: ''
          });
        } else {
          alert('Demo created but no URL returned. Please try again.');
        }
      } else {
        const errorData = await response.json();
        console.error('Demo creation failed:', errorData);
        alert(`Failed to create demo: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating demo:', error);
      alert('Error creating demo. Please try again.');
    } finally {
      setIsCreatingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <Image
              className="dark:invert"
              src="/next.svg"
              alt="Business Lead System"
              width={240}
              height={50}
              priority
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            All-Purpose Lead Generation System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            AI-powered lead qualification and chat demo. Experience personalized business consultations 
            with our intelligent assistant that qualifies prospects and schedules appointments.
          </p>
        </div>

        {/* Demo Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <h2 className="text-3xl font-bold text-white mb-2">
                Try the Live Demo
              </h2>
              <p className="text-blue-100">
                Experience our AI business assistant in action
              </p>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Quick Demo */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      🚀 Instant Demo
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Launch a pre-configured demo with sample company data. 
                      Perfect for testing the AI chat functionality immediately.
                    </p>
                  </div>
                  
                  <button
                    onClick={openTestDemo}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    🎯 Launch Quick Demo
                  </button>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Demo Company:</strong> Quick Demo Business Co<br/>
                      <strong>Location:</strong> Austin, TX<br/>
                      <strong>Service:</strong> Business Consulting
                    </p>
                  </div>
                </div>

                {/* Create New Demo */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      ⚡ Create New Demo
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Generate a fresh demo with custom company data. 
                      This creates a new AI assistant tailored to your specifications.
                    </p>
                  </div>

                  {!showCustomForm ? (
                    <button
                      onClick={() => setShowCustomForm(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
                    >
                      🛠️ Create Custom Demo
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Company Name *
                          </label>
                          <input
                            type="text"
                            value={customDemoData.companyName}
                            onChange={(e) => setCustomDemoData(prev => ({ ...prev, companyName: e.target.value }))}
                            placeholder="e.g., Smith Marketing Agency"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Name *
                          </label>
                          <input
                            type="text"
                            value={customDemoData.contactName}
                            onChange={(e) => setCustomDemoData(prev => ({ ...prev, contactName: e.target.value }))}
                            placeholder="e.g., John Smith"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Industry
                          </label>
                          <select
                            value={customDemoData.industry}
                            onChange={(e) => setCustomDemoData(prev => ({ ...prev, industry: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Industry</option>
                            <option value="marketing">Marketing & Advertising</option>
                            <option value="automotive">Automotive</option>
                            <option value="dental">Dental</option>
                            <option value="legal">Legal</option>
                            <option value="fitness">Fitness</option>
                            <option value="real-estate">Real Estate</option>
                            <option value="consulting">Business Consulting</option>
                            <option value="technology">Technology</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="financial">Financial Services</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              value={customDemoData.city}
                              onChange={(e) => setCustomDemoData(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="Austin"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              State
                            </label>
                            <input
                              type="text"
                              value={customDemoData.state}
                              onChange={(e) => setCustomDemoData(prev => ({ ...prev, state: e.target.value }))}
                              placeholder="TX"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Description
                        </label>
                        <textarea
                          value={customDemoData.organization_short_description}
                          onChange={(e) => setCustomDemoData(prev => ({ ...prev, organization_short_description: e.target.value }))}
                          placeholder="e.g., Digital marketing and SEO services for small businesses"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={createCustomDemo}
                          disabled={isCreatingDemo}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                        >
                          {isCreatingDemo ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Creating Demo...
                            </span>
                          ) : '🚀 Create Demo'}
                        </button>
                        <button
                          onClick={() => setShowCustomForm(false)}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Features:</strong><br/>
                      • AI-powered lead qualification<br/>
                      • Personalized chat responses<br/>
                      • Calendar booking integration<br/>
                      • Company-specific branding
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-12 bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  📋 How to Test the Demo
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Testing Steps:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Click "Launch Quick Demo" button</li>
                      <li>Wait for the AI assistant's first message</li>
                      <li>Respond as if you're interested in business services</li>
                      <li>Experience the qualification process</li>
                      <li>Test the calendar booking flow</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Expected Behavior:</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                      <li>AI introduces as "Sarah from Business Lead Pro"</li>
                      <li>Asks about previous business consulting inquiries</li>
                      <li>Qualifies based on business needs</li>
                      <li>Offers calendar booking for interested leads</li>
                      <li>Handles objections intelligently</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Admin Links */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-4 justify-center">
                  <a 
                    href="/admin/test-suite" 
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                  >
                    🔧 Admin Test Suite
                  </a>
                  <a 
                    href="/api/debug" 
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                  >
                    🔍 System Debug
                  </a>
                  <a 
                    href="https://github.com/your-repo/solar-lead-clean" 
                    target="_blank"
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                  >
                    📚 Documentation
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
