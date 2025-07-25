'use client';

import { useState } from 'react';

interface ProjectDiscoveryData {
  // Core Project Details
  projectName: string;
  projectType: string;
  industry: string;
  coreObjective: string;
  
  // Target Market & Localization
  targetRegions: string[];
  primaryLanguages: string[];
  culturalConsiderations: string;
  
  // Business Constraints & Preferences
  budget: string;
  timeline: string;
  specialRequirements: string[];
  complianceNeeds: string[];
  
  // Technical Preferences
  platformPreferences: string[];
  techStackPreferences: string;
  integrationNeeds: string;
  
  // User Experience Specifics
  targetUserTypes: string[];
  accessibilityNeeds: string[];
  devicePriorities: string[];
  
  // Industry-Specific Details
  industrySpecifics: Record<string, string>;
}

export default function ProjectDiscoveryPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectDiscoveryData>({
    projectName: '',
    projectType: '',
    industry: '',
    coreObjective: '',
    targetRegions: [],
    primaryLanguages: [],
    culturalConsiderations: '',
    budget: '',
    timeline: '',
    specialRequirements: [],
    complianceNeeds: [],
    platformPreferences: [],
    techStackPreferences: '',
    integrationNeeds: '',
    targetUserTypes: [],
    accessibilityNeeds: [],
    devicePriorities: [],
    industrySpecifics: {}
  });
  
  const [generating, setGenerating] = useState(false);
  const [researchPrompt, setResearchPrompt] = useState('');

  const handleMultiSelect = (field: keyof ProjectDiscoveryData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(value)
        ? (prev[field] as string[]).filter(item => item !== value)
        : [...(prev[field] as string[]), value]
    }));
  };

  const generateResearchPrompt = () => {
    setGenerating(true);
    
    // Create comprehensive research prompt based on user input
    const prompt = `# Comprehensive ${formData.projectType} Development Research Project

## PROJECT OVERVIEW
Project: ${formData.projectName}
Industry: ${formData.industry}
Core Objective: ${formData.coreObjective}

## CRITICAL RESEARCH AREAS (100-Point Analysis)

### 1. MARKET & COMPETITIVE LANDSCAPE (20 points)
- Research top 10 ${formData.projectType} solutions in ${formData.industry} industry
- Analyze market leaders, pricing models, and feature differentiation
- Identify market gaps and opportunities specific to ${formData.targetRegions.join(', ')} regions
- Study cultural preferences and local market dynamics in ${formData.primaryLanguages.join(', ')} language markets
${formData.culturalConsiderations ? `- Special focus: ${formData.culturalConsiderations}` : ''}

### 2. TECHNICAL ARCHITECTURE & STACK (25 points)
- Research optimal tech stack for ${formData.projectType} in ${formData.industry}
- Analyze scalability patterns for ${formData.targetRegions.length > 1 ? 'multi-regional' : 'regional'} deployment
- Study integration requirements with common ${formData.industry} tools and platforms
${formData.integrationNeeds ? `- Specific integration research: ${formData.integrationNeeds}` : ''}
${formData.techStackPreferences ? `- Preferred technologies analysis: ${formData.techStackPreferences}` : ''}

### 3. COMPLIANCE & SECURITY REQUIREMENTS (20 points)
${formData.complianceNeeds.length > 0 ? `- Deep dive into ${formData.complianceNeeds.join(', ')} compliance requirements` : '- Research standard compliance needs for ' + formData.industry}
- Security best practices for ${formData.projectType} applications
- Data protection laws in ${formData.targetRegions.join(', ')}
- Industry-specific regulatory requirements

### 4. USER EXPERIENCE & INTERFACE DESIGN (15 points)
- Research UX patterns for ${formData.targetUserTypes.join(', ')} user types
- Analyze ${formData.primaryLanguages.join(', ')} language interface best practices
- Study ${formData.devicePriorities.join(', ')} platform design guidelines
${formData.accessibilityNeeds.length > 0 ? `- Accessibility requirements: ${formData.accessibilityNeeds.join(', ')}` : ''}

### 5. BUSINESS MODEL & MONETIZATION (10 points)
- Research revenue models for ${formData.projectType} in ${formData.industry}
- Pricing strategies in target markets
- Cost structure analysis and budget optimization for ${formData.budget} budget range

### 6. IMPLEMENTATION STRATEGY (10 points)
- Development methodology recommendations for ${formData.timeline} timeline
- Team structure and resource requirements
- Risk mitigation strategies
- Launch and scaling roadmap

## SPECIAL REQUIREMENTS RESEARCH
${formData.specialRequirements.map(req => `- In-depth analysis: ${req}`).join('\n')}

## DELIVERABLES EXPECTED
1. Technology stack recommendations with rationale
2. Architecture diagrams and system design patterns
3. Compliance checklist and security requirements
4. User journey maps and interface guidelines
5. Implementation timeline and resource requirements
6. Risk assessment and mitigation strategies
7. Market positioning and competitive analysis
8. Cost breakdown and ROI projections

Research should be current as of 2024-2025 and include the latest industry standards, tools, and best practices.`;

    setResearchPrompt(prompt);
    setGenerating(false);
  };

  const submitToMetaAgents = async () => {
    // This would integrate with the meta-agent factory
    const workRequest = {
      type: 'scaffold',
      description: `Build ${formData.projectName} - ${formData.coreObjective}`,
      requirements: {
        projectName: formData.projectName,
        framework: formData.techStackPreferences || 'recommended',
        features: formData.specialRequirements,
        researchContext: researchPrompt
      },
      priority: 'high'
    };

    const response = await fetch('/api/meta-agent-factory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workRequest)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Work request submitted:', result);
      // Redirect to progress tracking
      window.location.href = `/meta-agent-factory?requestId=${result.requestId}`;
    }
  };

  const projectTypes = [
    'Web Application', 'Mobile App', 'Desktop Software', 'API/Backend Service',
    'E-commerce Platform', 'Content Management System', 'Data Analytics Platform',
    'IoT Application', 'Blockchain/Web3 App', 'AI/ML Application'
  ];

  const industries = [
    'Healthcare', 'Finance', 'E-commerce', 'Education', 'Real Estate',
    'Food & Beverage', 'Transportation', 'Entertainment', 'Manufacturing',
    'Non-profit', 'Government', 'Technology', 'Consulting', 'Other'
  ];

  const languages = [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese',
    'Korean', 'Portuguese', 'Russian', 'Arabic', 'Italian', 'Dutch'
  ];

  const specialRequirements = [
    'Vegan/Vegetarian Focus', 'Eco-friendly/Sustainable', 'Accessibility Compliant',
    'Offline Capability', 'Real-time Features', 'AI/ML Integration',
    'Blockchain Integration', 'IoT Device Support', 'Multi-tenant Architecture',
    'White-label Solution', 'API-first Design', 'Microservices Architecture'
  ];

  const complianceOptions = [
    'GDPR', 'HIPAA', 'SOX', 'PCI DSS', 'ISO 27001', 'WCAG 2.1',
    'FedRAMP', 'COPPA', 'CCPA', 'SOC 2', 'FISMA', 'FDA Regulations'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🚀 AI-Powered Project Discovery
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your project idea into a comprehensive 100-point research analysis. 
              Our AI will research industry best practices, technical requirements, and market insights 
              to create the perfect blueprint for your software project.
            </p>
            <div className="flex justify-center mt-6">
              <div className="flex items-center space-x-4 bg-indigo-50 px-6 py-3 rounded-lg">
                <span className="text-sm text-indigo-600 font-medium">Discovery Process:</span>
                <span className={`px-3 py-1 rounded text-sm ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  Core Details
                </span>
                <span className={`px-3 py-1 rounded text-sm ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  Specifications
                </span>
                <span className={`px-3 py-1 rounded text-sm ${currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  Research & Build
                </span>
              </div>
            </div>
          </div>

          {currentStep === 1 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 1: Core Project Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="e.g., VegaFresh Delivery"
                    value={formData.projectName}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Type *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    value={formData.projectType}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectType: e.target.value }))}
                  >
                    <option value="">Select project type...</option>
                    {projectTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  >
                    <option value="">Select industry...</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3"
                    value={formData.timeline}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                  >
                    <option value="">Select timeline...</option>
                    <option value="1-3 months">1-3 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="6-12 months">6-12 months</option>
                    <option value="12+ months">12+ months</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Core Objective *
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  rows={3}
                  placeholder="e.g., Connect vegan food lovers with local plant-based restaurants for delivery in Spanish-speaking markets"
                  value={formData.coreObjective}
                  onChange={(e) => setFormData(prev => ({ ...prev, coreObjective: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Languages & Markets
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {languages.map(lang => (
                    <label key={lang} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.primaryLanguages.includes(lang)}
                        onChange={() => handleMultiSelect('primaryLanguages', lang)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requirements & Focus Areas
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {specialRequirements.map(req => (
                    <label key={req} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.specialRequirements.includes(req)}
                        onChange={() => handleMultiSelect('specialRequirements', req)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{req}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!formData.projectName || !formData.projectType || !formData.industry || !formData.coreObjective}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Continue to Technical Specs →
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 2: Technical & Compliance Specifications</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compliance Requirements
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {complianceOptions.map(compliance => (
                    <label key={compliance} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.complianceNeeds.includes(compliance)}
                        onChange={() => handleMultiSelect('complianceNeeds', compliance)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{compliance}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Technology Stack
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  rows={2}
                  placeholder="e.g., React, Node.js, PostgreSQL, or leave blank for AI recommendations"
                  value={formData.techStackPreferences}
                  onChange={(e) => setFormData(prev => ({ ...prev, techStackPreferences: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Integrations
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  rows={2}
                  placeholder="e.g., Stripe payments, Google Maps, SMS notifications, social media APIs"
                  value={formData.integrationNeeds}
                  onChange={(e) => setFormData(prev => ({ ...prev, integrationNeeds: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cultural & Market Considerations
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-3"
                  rows={2}
                  placeholder="e.g., Spanish cultural preferences, vegan market trends, local payment methods"
                  value={formData.culturalConsiderations}
                  onChange={(e) => setFormData(prev => ({ ...prev, culturalConsiderations: e.target.value }))}
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700"
                >
                  Generate Research & Build →
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 3: Comprehensive Research & Build</h2>
              
              {!researchPrompt ? (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      🔍 AI Research Analysis Ready
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Based on your specifications, we'll generate a comprehensive 100-point research project 
                      that analyzes market trends, technical requirements, and industry best practices for your 
                      <strong> {formData.projectName}</strong> project.
                    </p>
                    <button
                      onClick={generateResearchPrompt}
                      disabled={generating}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-lg font-medium"
                    >
                      {generating ? 'Generating Research...' : '🚀 Generate 100-Point Research Analysis'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-green-800 mb-2">
                      ✅ Research Prompt Generated Successfully!
                    </h3>
                    <p className="text-green-700">
                      Your comprehensive research analysis is ready. This will be used to gather 
                      industry insights and technical requirements before building your project.
                    </p>
                  </div>

                  <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm max-h-96 overflow-y-auto mb-6">
                    <pre className="whitespace-pre-wrap">{researchPrompt}</pre>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-600 mb-6">
                      This research prompt will be sent to our AI research system to gather comprehensive 
                      market intelligence and technical specifications before your meta-agents begin building.
                    </p>
                    <button
                      onClick={submitToMetaAgents}
                      className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 text-lg font-medium"
                    >
                      🤖 Submit to Meta-Agent Factory
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}