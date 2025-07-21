import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { error: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Initialize clients
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    // Get assistant ID from Redis
    const assistantId = await redis.get(`company:${company}`);
    
    if (!assistantId) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get assistant details from OpenAI to extract industry
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const assistant = await openai.beta.assistants.retrieve(assistantId as string);
    
    // Extract industry from assistant name (format: "Company Name industry Assistant")
    let industry = 'business-services'; // default
    if (assistant.name) {
      const nameParts = assistant.name.split(' ');
      // Look for industry keywords in the assistant name
      const industryKeywords = ['dental', 'automotive', 'legal', 'chiropractic', 'business-funding', 'insurance', 'fitness', 'real-estate', 'healthcare', 'solar'];
      
      for (const keyword of industryKeywords) {
        if (assistant.name.toLowerCase().includes(keyword)) {
          industry = keyword;
          break;
        }
      }
    }

    // Industry display mapping
    const industryDisplayData = {
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

    const displayData = industryDisplayData[industry as keyof typeof industryDisplayData] || industryDisplayData['business-services'];

    return NextResponse.json({
      success: true,
      company,
      assistantId,
      industry,
      displayData
    });

  } catch (error) {
    console.error('Error getting company industry:', error);
    return NextResponse.json(
      { error: 'Failed to get company industry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}