'use client';

import { useState } from 'react';
import Image from "next/image";

export default function Home() {
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [demoUrl, setDemoUrl] = useState('');

  const createQuickDemo = async () => {
    setIsCreatingDemo(true);
    try {
      const response = await fetch('/api/quick-demo');
      if (response.ok) {
        // The quick-demo endpoint returns HTML, let's get the demo URL from it
        const demoUrl = `${window.location.origin}/quick-demo-solar`;
        setDemoUrl(demoUrl);
        window.open(demoUrl, '_blank');
      } else {
        alert('Failed to create demo. Please try again.');
      }
    } catch (error) {
      console.error('Error creating demo:', error);
      alert('Error creating demo. Please try again.');
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const openTestDemo = () => {
    window.open(`${window.location.origin}/quick-demo-solar`, '_blank');
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
              alt="Solar Lead System"
              width={240}
              height={50}
              priority
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Solar Lead Generation System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            AI-powered solar lead qualification and chat demo. Experience personalized solar consultations 
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
                Experience our AI solar assistant in action
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
                      <strong>Demo Company:</strong> Quick Demo Solar Co<br/>
                      <strong>Location:</strong> Austin, TX<br/>
                      <strong>Service:</strong> Database Reactivation
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

                  <button
                    onClick={createQuickDemo}
                    disabled={isCreatingDemo}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    {isCreatingDemo ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                        Creating Demo...
                      </>
                    ) : (
                      '🛠️ Create Custom Demo'
                    )}
                  </button>

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
                      <li>Respond as if you're interested in solar</li>
                      <li>Experience the qualification process</li>
                      <li>Test the calendar booking flow</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Expected Behavior:</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                      <li>AI introduces as "Sarah from Solar Bookers"</li>
                      <li>Asks about previous solar quotes</li>
                      <li>Qualifies based on utility bills</li>
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
