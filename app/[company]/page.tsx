'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface IndustryDisplayData {
  name: string;
  branding: string;
  description: string;
  leadType: string;
  interest: string;
  sampleResponses: string[];
  howItWorks: string;
}

export default function CompanyPage() {
  const params = useParams();
  const company = params?.company as string;
  
  // Format company name for display
  const formatCompanyName = (name: string) => {
    if (!name) return 'Lead Advisor';
    return name
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [industryData, setIndustryData] = useState<IndustryDisplayData | null>(null);
  const [loadingIndustry, setLoadingIndustry] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll to bottom if there are at least 2 messages (after user starts chatting)
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (company) {
      loadIndustryData();
      initializeChat();
    }
  }, [company]);

  // Generate completely dynamic industry responses for ANY industry
  const getIndustryResponses = (industryType: string) => {
    // Capitalize industry name for display
    const capitalizedIndustry = industryType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Return dynamic, industry-agnostic responses that work for ALL industries
    return {
      name: capitalizedIndustry,
      service: `${industryType} services`,
      responses: [
        '"Yes I\'m interested"',
        '"Not interested"',
        '"Tell me more"',
        '"How much does it cost?"'
      ]
    };
  };

  const loadIndustryData = async () => {
    try {
      setLoadingIndustry(true);
      
      // Try to get company data from Redis which includes industry
      let industryData = null;
      try {
        const response = await fetch(`/api/company-data/${company}`);
        if (response.ok) {
          industryData = await response.json();
        }
      } catch (error) {
        console.log('Could not fetch company data:', error);
      }
      
      const companyDisplayName = formatCompanyName(company);
      const industryType = industryData?.industry || 'business-services';
      const industryInfo = getIndustryResponses(industryType);
      
      // Dynamic display data that adapts to the actual industry
      const displayData: IndustryDisplayData = {
        name: industryInfo.name,
        branding: `${companyDisplayName} Lead Generation`,
        description: `${industryInfo.name} Consultation System`,
        leadType: `Customer seeking ${industryInfo.service}`,
        interest: industryInfo.service,
        sampleResponses: industryInfo.responses,
        howItWorks: `This SMS agent automatically reaches out to your prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their ${industryInfo.service} needs and works to book consultations for ${companyDisplayName}.`
      };
      
      setIndustryData(displayData);
      
    } catch (error) {
      console.error('Error loading industry data:', error);
      // Set fallback data using same dynamic approach
      const companyDisplayName = formatCompanyName(company);
      setIndustryData({
        name: 'Business Services',
        branding: `${companyDisplayName} Lead Generation`, 
        description: 'Lead Consultation System',
        leadType: 'Potential customer seeking services',
        interest: 'Professional services and solutions',
        sampleResponses: [
          '"Yes, I\'m interested"',
          '"Not interested"',
          '"Tell me more"',
          '"How much does it cost?"'
        ],
        howItWorks: `This SMS agent automatically reaches out to your prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their needs and works to book consultations for ${companyDisplayName}.`
      });
    } finally {
      setLoadingIndustry(false);
    }
  };

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      
      // Request AI assistant's first message
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '', // Empty message to trigger AI assistant's first message
          threadId: null,
          company: company,
          initialize: true // Flag to indicate this is initialization
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.threadId) {
        setThreadId(data.threadId);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages([assistantMessage]);
    } catch (error) {
      console.error('Error initializing chat:', error);
      const fallbackMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error starting the chat. Please refresh the page.',
        timestamp: new Date()
      };
      setMessages([fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          threadId: threadId,
          company: company
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {industryData?.branding || 'Lead Generation Pro'}
                </h1>
                <p className="text-sm text-gray-600">
                  {industryData?.description || 'Lead Consultation Demo'} for {formatCompanyName(company)}
                </p>
              </div>
            </div>
            <div className="bg-green-50 px-4 py-2 rounded-full border border-green-200">
              <span className="text-green-700 font-medium text-sm">✨ Live Demo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch min-h-[800px]">
          
          {/* Left Side - Demo Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-2xl">{formatCompanyName(company).charAt(0)}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{formatCompanyName(company)}</h2>
                <p className="text-blue-600 font-medium">{industryData?.description || 'Lead Consultation System'}</p>
              </div>

              <div className="space-y-4">
                {/* Book Appointment Button */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <h3 className="font-semibold text-orange-900 mb-3">🚀 Ready to Get Started?</h3>
                  <p className="text-orange-800 text-sm mb-3">
                    Book a discovery call to see how this AI agent can work for your business.
                  </p>
                  <div>
                    <a 
                      href="https://calendly.com/tool-delta/discovery"
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full bg-orange-600 text-white text-center py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      📅 Book Discovery Call
                    </a>
                  </div>
                  <p className="text-orange-700 text-xs mt-2 text-center">
                    Get your AI agent set up in 24 hours ⚡
                  </p>
                </div>

                {/* Why SMS? Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">📱 Why SMS?</h3>
                  <div className="grid grid-cols-2 gap-3 text-blue-800 text-sm">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">98%</div>
                      <div className="text-xs">Open Rate</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">45%</div>
                      <div className="text-xs">Response Rate</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">30%</div>
                      <div className="text-xs">Conversion Rate</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">3 min</div>
                      <div className="text-xs">Response Time</div>
                    </div>
                  </div>
                  <p className="text-blue-800 text-xs mt-2">SMS is 5x more effective than email with 98% open rates vs 20% for email*</p>
                  <p className="text-blue-700 text-xs mt-1">*Source: SimpleTexting, TextDrip, Constant Contact 2024 studies</p>
                </div>

                {/* How It Works Section */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-semibold text-green-900 mb-3">🤖 How It Works</h3>
                  <div className="space-y-2 text-green-800 text-sm">
                    <div className="flex items-start space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                      <span>AI sends personalized first message using prospect's name and context</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                      <span>Asks qualifying questions about their specific needs and goals</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                      <span>Builds rapport and provides compelling reasons to book a call</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                      <span>Automatically provides calendar link for instant booking</span>
                    </div>
                  </div>
                </div>

                {/* Quick Responses Section */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h3 className="font-semibold text-purple-900 mb-3">💬 Quick Responses to Try</h3>
                  <div className="space-y-2">
                    {industryData?.sampleResponses ? (
                      industryData.sampleResponses.map((response, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${
                            index === 0 ? 'bg-green-500' : 
                            index === 1 ? 'bg-blue-500' :
                            index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                          }`}></span>
                          <span className="text-sm text-gray-700">{response}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-sm text-gray-700">"Yes, I'm interested"</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span className="text-sm text-gray-700">"Not interested"</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span className="text-sm text-gray-700">"Tell me more about your services"</span>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-purple-800 text-xs mt-2">
                    <strong>Act like the prospect!</strong> Try different responses to see how the AI adapts to various scenarios.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - iPhone Demo */}
          <div className="flex justify-center items-start">
            <div className="relative bg-black rounded-[3rem] p-2 shadow-2xl w-full max-w-[375px] h-[812px]">
              {/* iPhone Screen */}
              <div className="bg-black rounded-[2.5rem] overflow-hidden relative h-full">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black rounded-b-2xl z-50" 
                     style={{ width: '154px', height: '32px' }}></div>
                
                {/* Screen Content */}
                <div className="bg-white h-full flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  
                  {/* Status Bar */}
                  <div className="flex justify-between items-center px-6 pt-12 pb-2 bg-white">
                    <div className="text-black font-semibold text-sm">9:41</div>
                    <div className="flex items-center space-x-1">
                      <div className="text-black text-sm">●●●</div>
                      <div className="text-black text-sm">📶</div>
                      <div className="text-black text-sm">🔋</div>
                    </div>
                  </div>

                  {/* Messages Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                    <div className="text-blue-500 text-lg">‹</div>
                    <div className="flex flex-col items-center">
                      <div className="text-black font-semibold text-lg">{formatCompanyName(company)}</div>
                      <div className="text-gray-500 text-xs">Active now</div>
                    </div>
                    <div className="text-blue-500 text-lg">🔄</div>
                  </div>

                  {/* Messages Container */}
                  <div className="flex-1 overflow-y-auto px-4 py-2 bg-white">
                    {messages.map((message, index) => (
                      <div key={index} className={`flex mb-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-xs px-4 py-2 text-base leading-tight ${
                            message.role === 'user'
                              ? 'text-white rounded-2xl rounded-br-md'
                              : 'text-black rounded-2xl rounded-bl-md'
                          }`}
                          style={{
                            backgroundColor: message.role === 'user' ? '#007AFF' : '#E9E9EB',
                            borderRadius: '18px',
                            borderBottomRightRadius: message.role === 'user' ? '5px' : '18px',
                            borderBottomLeftRadius: message.role === 'assistant' ? '5px' : '18px',
                          }}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start mb-3">
                        <div 
                          className="px-4 py-2 rounded-2xl rounded-bl-md"
                          style={{
                            backgroundColor: '#E9E9EB',
                            borderRadius: '18px',
                            borderBottomLeftRadius: '5px',
                          }}
                        >
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Bar */}
                  <div className="px-4 py-3 bg-white border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-400 text-xl">📷</div>
                      <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2" style={{ backgroundColor: '#F2F2F7' }}>
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="iMessage"
                          disabled={isLoading}
                          className="flex-1 bg-transparent border-none outline-none text-base text-black placeholder-gray-500"
                        />
                        {inputMessage.trim() && (
                          <button
                            onClick={sendMessage}
                            disabled={isLoading}
                            className="ml-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold"
                            style={{ backgroundColor: '#007AFF' }}
                          >
                            ↑
                          </button>
                        )}
                      </div>
                      <div className="text-gray-400 text-xl">🎤</div>
                    </div>
                  </div>

                  {/* Home Indicator */}
                  <div className="flex justify-center pb-2 bg-white">
                    <div className="w-32 h-1 bg-black rounded-full opacity-60"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}