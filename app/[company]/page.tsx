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
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (company) {
      loadIndustryData();
      initializeChat();
    }
  }, [company]);

  const loadIndustryData = async () => {
    try {
      setLoadingIndustry(true);
      
      // Detect industry from company name patterns
      const companyLower = company?.toLowerCase() || '';
      let detectedIndustry = 'business-services';
      
      if (companyLower.includes('dental') || companyLower.includes('dentist')) {
        detectedIndustry = 'dental';
      } else if (companyLower.includes('auto') || companyLower.includes('car') || companyLower.includes('dealership')) {
        detectedIndustry = 'automotive';
      } else if (companyLower.includes('legal') || companyLower.includes('law') || companyLower.includes('attorney')) {
        detectedIndustry = 'legal';
      } else if (companyLower.includes('chiro') || companyLower.includes('spine')) {
        detectedIndustry = 'chiropractic';
      } else if (companyLower.includes('fund') || companyLower.includes('loan') || companyLower.includes('capital')) {
        detectedIndustry = 'business-funding';
      } else if (companyLower.includes('insurance')) {
        detectedIndustry = 'insurance';
      } else if (companyLower.includes('fitness') || companyLower.includes('gym')) {
        detectedIndustry = 'fitness';
      } else if (companyLower.includes('property') || companyLower.includes('real-estate') || companyLower.includes('realty')) {
        detectedIndustry = 'real-estate';
      } else if (companyLower.includes('health') || companyLower.includes('medical') || companyLower.includes('clinic')) {
        detectedIndustry = 'healthcare';
      } else if (companyLower.includes('solar') || companyLower.includes('energy')) {
        detectedIndustry = 'solar';
      }

      // Industry display data
      const industryDisplayData: Record<string, IndustryDisplayData> = {
        'solar': {
          name: 'Solar',
          branding: 'Solar Bookers',
          description: 'Solar Consultation System',
          leadType: 'Homeowner/Business owner looking for solar',
          interest: 'Solar panel installation',
          sampleResponses: [
            '"Yes, I\'m interested in solar"',
            '"Not interested in solar"', 
            '"How much do solar panels cost?"',
            '"Tell me more about solar"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your solar prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their energy needs and works to book solar consultations for your sales team.'
        },
        'dental': {
          name: 'Dental',
          branding: 'Dental Lead Pro',
          description: 'Dental Consultation System',
          leadType: 'Patient looking for dental care',
          interest: 'Dental treatment and services',
          sampleResponses: [
            '"Yes, I need dental work"',
            '"Not looking for dental care"',
            '"How much do dental procedures cost?"',
            '"Tell me about your dental services"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your dental prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their dental needs and works to book dental consultations for your practice.'
        },
        'automotive': {
          name: 'Automotive',
          branding: 'Auto Lead Pro',
          description: 'Automotive Consultation System',
          leadType: 'Customer looking for vehicles/service',
          interest: 'Vehicle purchase or automotive service',
          sampleResponses: [
            '"Yes, I\'m interested in a car"',
            '"Not looking for a vehicle"',
            '"What vehicles do you have available?"',
            '"Tell me about financing options"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your automotive prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their vehicle needs and works to book consultations for your dealership.'
        },
        'legal': {
          name: 'Legal',
          branding: 'Legal Lead Pro', 
          description: 'Legal Consultation System',
          leadType: 'Client needing legal assistance',
          interest: 'Legal representation and services',
          sampleResponses: [
            '"Yes, I need legal help"',
            '"Not interested in legal services"',
            '"What types of cases do you handle?"',
            '"How much do legal services cost?"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your legal prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their legal needs and works to book consultations for your law firm.'
        },
        'chiropractic': {
          name: 'Chiropractic',
          branding: 'Chiro Lead Pro',
          description: 'Chiropractic Consultation System', 
          leadType: 'Patient with pain/mobility issues',
          interest: 'Chiropractic treatment and care',
          sampleResponses: [
            '"Yes, I have back pain"',
            '"Not interested in chiropractic care"',
            '"What treatments do you offer?"',
            '"How much does chiropractic care cost?"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your chiropractic prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their pain and mobility issues and works to book consultations for your practice.'
        },
        'business-funding': {
          name: 'Business Funding',
          branding: 'Funding Lead Pro',
          description: 'Business Funding System',
          leadType: 'Business owner seeking funding',
          interest: 'Business loans and funding',
          sampleResponses: [
            '"Yes, I need business funding"',
            '"Not looking for funding"',
            '"What loan options do you have?"',
            '"What are your interest rates?"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your business funding prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their funding needs and works to book consultations with your lending team.'
        },
        'insurance': {
          name: 'Insurance',
          branding: 'Insurance Lead Pro',
          description: 'Insurance Consultation System',
          leadType: 'Individual/Business needing coverage',
          interest: 'Insurance policies and coverage',
          sampleResponses: [
            '"Yes, I need insurance coverage"',
            '"Not interested in insurance"',
            '"What types of coverage do you offer?"',
            '"How much does insurance cost?"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your insurance prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their coverage needs and works to book consultations with your agents.'
        },
        'fitness': {
          name: 'Fitness',
          branding: 'Fitness Lead Pro',
          description: 'Fitness Consultation System',
          leadType: 'Individual looking to get fit',
          interest: 'Fitness training and membership',
          sampleResponses: [
            '"Yes, I want to get in shape"',
            '"Not interested in fitness"',
            '"What programs do you offer?"',
            '"How much does membership cost?"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your fitness prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their fitness goals and works to book consultations for your gym or training services.'
        },
        'real-estate': {
          name: 'Real Estate',
          branding: 'Property Lead Pro',
          description: 'Real Estate Consultation System',
          leadType: 'Buyer/Seller of property',
          interest: 'Property buying or selling',
          sampleResponses: [
            '"Yes, I\'m looking to buy/sell"',
            '"Not interested in real estate"',
            '"What properties do you have?"',
            '"What are current market rates?"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your real estate prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their property needs and works to book consultations with your agents.'
        },
        'healthcare': {
          name: 'Healthcare',
          branding: 'Health Lead Pro',
          description: 'Healthcare Consultation System',
          leadType: 'Patient needing medical care',
          interest: 'Medical services and treatment',
          sampleResponses: [
            '"Yes, I need medical care"',
            '"Not interested in healthcare"',
            '"What services do you provide?"',
            '"Do you accept my insurance?"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your healthcare prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their health needs and works to book consultations with your medical practice.'
        },
        'business-services': {
          name: 'Business Services',
          branding: 'Business Lead Pro',
          description: 'Business Consultation System',
          leadType: 'Business owner needing services',
          interest: 'Professional business services',
          sampleResponses: [
            '"Yes, I need business help"',
            '"Not interested in services"',
            '"What services do you offer?"',
            '"How much do your services cost?"'
          ],
          howItWorks: 'This SMS agent automatically reaches out to your business prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their business needs and works to book consultations for your services.'
        }
      };

      const displayData = industryDisplayData[detectedIndustry] || industryDisplayData['business-services'];
      setIndustryData(displayData);
      
    } catch (error) {
      console.error('Error loading industry data:', error);
      // Set fallback data
      setIndustryData({
        name: 'Business Services',
        branding: 'Business Lead Pro', 
        description: 'Business Consultation System',
        leadType: 'Business owner needing services',
        interest: 'Professional business services',
        sampleResponses: [
          '"Yes, I need business help"',
          '"Not interested in services"',
          '"What services do you offer?"',
          '"How much do your services cost?"'
        ],
        howItWorks: 'This SMS agent automatically reaches out to your business prospects with personalized messages using their name, company, and context. It engages them in natural conversation about their business needs and works to book consultations for your services.'
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
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
                  <p className="text-blue-800 text-xs mt-2">SMS is 5x more effective than email with 98% open rates vs 20% for email</p>
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

                {/* How to Get Started Section */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <h3 className="font-semibold text-orange-900 mb-3">🚀 How to Get Started</h3>
                  <p className="text-orange-800 text-sm mb-3">
                    Ready to get your own AI SMS agent that converts prospects into booked calls?
                  </p>
                  <div className="space-y-2">
                    <a 
                      href="https://calendly.com/solar-bookers-demo" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full bg-orange-600 text-white text-center py-2 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      📅 Book Your Demo Call
                    </a>
                    <a 
                      href="https://forms.gle/demo-request" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full bg-white border border-orange-600 text-orange-600 text-center py-2 px-4 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                    >
                      📝 Fill Out Request Form
                    </a>
                  </div>
                  <p className="text-orange-700 text-xs mt-2 text-center">
                    Get your AI agent set up in 24 hours ⚡
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - iPhone Demo */}
          <div className="flex justify-center">
            <div className="relative bg-black rounded-[3rem] p-2 shadow-2xl" style={{ width: '375px', height: '812px' }}>
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