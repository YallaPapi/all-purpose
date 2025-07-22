import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PromptTemplateManager, PromptTemplateVariables } from '../../../lib/prompt-template-manager';

// All industries are supported - no hardcoded restrictions

// Request body interface
interface CreatePrototypeRequest {
  // N8N format
  name?: string;
  lead_email?: string;
  organization_name?: string;
  title?: string;
  city?: string;
  state?: string;
  organization_short_description?: string;
  industry?: string;
  client_company_name?: string;
  client_website?: string;
  service_type?: string;
  
  // Test format
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  location?: string;
  
  // Additional fields
  email?: string;
  domain?: string;
}

// Accept ANY industry - no validation or mapping needed
function validateIndustry(industry?: string): string {
  if (!industry) return 'business-services';
  
  // Return the industry as-is, normalized
  return industry.toLowerCase().trim();
}

// FIXED: Use exact same slug generator as n8n workflow
function createCompanySlug(companyName: string): string {
  return (companyName || 'demo').toLowerCase()
    .replace(/\b(llc|inc|corp|ltd|co)\b/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePrototypeRequest = await request.json();
    console.log('Received request body:', body);
    
    // Extract and validate industry parameter first
    const validatedIndustry = validateIndustry(body.industry);
    const industryText = validatedIndustry === 'business-services' ? 'business services' : validatedIndustry;
    
    console.log('Industry validation:', {
      received: body.industry,
      validated: validatedIndustry,
      displayText: industryText
    });

    // Handle n8n workflow field mappings exactly as they're sent
    let name, email, organization_name, title, city, state, organization_short_description;
    let client_company_name, client_website, service_type;

    // FIXED: Check for exact n8n field names from the workflow
    if (body.companyName || body.contactName || body.contactEmail) {
      // Current test format (companyName, contactName, contactEmail)
      name = body.contactName || 'Prospect';
      email = body.contactEmail || '';
      organization_name = body.companyName || '';
      title = body.title || '';
      
      // Handle location splitting - N8N sends combined location field
      if (body.location && body.location.includes(',')) {
        const locationParts = body.location.split(',');
        city = locationParts[0]?.trim() || '';
        state = locationParts[1]?.trim() || '';
      } else {
        // Try individual city/state fields if available
        city = body.city || '';
        state = body.state || '';
      }
      
      organization_short_description = body.organization_short_description || '';
      
      client_company_name = organization_name;
      client_website = body.client_website || `https://${organization_name.toLowerCase().replace(/\s+/g, '')}.com`;
      service_type = `${industryText} services`;
    } else {
      // FIXED: Handle n8n actual workflow format (organization_name, lead_email, name)
      name = body.name || (body.contactName || 'Prospect').split(' ')[0];
      email = body.lead_email || body.email || body.contactEmail || '';
      organization_name = body.organization_name || body.companyName || '';
      title = body.title || '';
      city = body.city || (body.location ? body.location.split(',')[0]?.trim() : '');
      state = body.state || (body.location ? body.location.split(',')[1]?.trim() : '');
      organization_short_description = body.organization_short_description || '';
      client_company_name = body.client_company_name || organization_name;  // Use LEAD'S company for demo
      client_website = body.client_website || `https://${organization_name.toLowerCase().replace(/\s+/g, '')}.com`;
      service_type = body.service_type || `${industryText} services`;  // Dynamic based on industry
    }

    console.log('Processed fields:', { name, organization_name, client_company_name, client_website });

    // Validate required fields
    if (!organization_name) {
      return NextResponse.json(
        { error: 'Company name (organization_name or companyName) is required' },
        { status: 400 }
      );
    }

    // Set defaults if missing
    if (!name) name = 'Prospect';
    if (!client_company_name) client_company_name = organization_name;  // Use LEAD'S company for the demo
    if (!client_website) client_website = `https://${organization_name.toLowerCase().replace(/\s+/g, '')}.com`;

    // Generate dynamic calendar link based on client company name
    const companySlug = createCompanySlug(organization_name);
    const dynamicCalendarLink = `https://calendly.com/${companySlug}`;

    console.log('Final processing:', {
      validatedIndustry,
      industryText,
      companySlug,
      clientCompany: client_company_name
    });

    // Debug the first message construction - using natural, casual language
    // Note: In the demo, ${name} will be replaced with actual customer names dynamically
    const firstMessage = `It's Sarah from ${client_company_name} here. Is this the same [CUSTOMER_NAME] that reached out to us about [SPECIFIC_SERVICE] in the last couple of months?`;
    console.log('First message template will be:', firstMessage);

    // Initialize OpenAI client inside function to avoid build-time issues
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize the prompt template manager
    const templateManager = PromptTemplateManager.getInstance();
    
    // Prepare template variables
    const templateVariables: PromptTemplateVariables = {
      name: name || 'Prospect',
      title: title || 'Not specified',
      organizationName: organization_name,
      industryText,
      organizationShortDescription: organization_short_description || '',
      city: city || '',
      state: state || '',
      clientCompanyName: client_company_name,
      clientWebsite: client_website,
      serviceType: service_type,
      dynamicCalendarLink,
      currentDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };
    
    // Generate dynamic instructions using the template system
    const instructions = templateManager.generateInstructions(templateVariables, validatedIndustry);
    
    console.log('Generated instructions using template system for industry:', validatedIndustry);

    // Create the assistant
    const assistant = await openai.beta.assistants.create({
      name: `${organization_name} ${industryText} Assistant`,
      instructions,
      model: "gpt-4-1106-preview",
      tools: [{ type: "code_interpreter" }]
    });

  // Use the new domain detection utility for Vercel-aware domain detection
  const { generateFullUrl, logDomainDetection } = await import('../../../lib/domain-utils');
  
  // Log domain detection for debugging
  logDomainDetection(request, 'create-prototype');
  
  // Generate demo URL using the smart domain detection
  const demoUrl = generateFullUrl(request, companySlug);
  
  console.log('Demo URL generated:', { 
    companySlug,
    demoUrl,
    providedDomain: body.domain 
  });

    // Store the assistant mapping for this company using direct Redis call
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      });
      
      // Store both assistant ID and industry data
      const companyData = {
        assistantId: assistant.id,
        industry: validatedIndustry,
        companyName: organization_name,
        createdAt: new Date().toISOString()
      };
      
      await redis.set(`company:${companySlug}`, JSON.stringify(companyData));
      console.log(`Successfully stored assistant ${assistant.id} and industry ${validatedIndustry} for company ${companySlug} in Redis`);
    } catch (error) {
      console.log('Warning: Could not store assistant mapping:', error);
      // Don't fail the whole request if storage fails
    }

    // FIXED: Return 'url' field that N8N expects, plus other fields for compatibility
    const response = {
      success: true,
      assistantId: assistant.id,
      url: demoUrl,           // This is what N8N expects
      demoUrl: demoUrl,       // Keep for backward compatibility
      companySlug: companySlug,
      calendarLink: dynamicCalendarLink,
      message: `${industryText} consultation assistant created for ${name} at ${organization_name}`
    };

    console.log('Returning response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error creating assistant:', error);
    return NextResponse.json(
      { error: 'Failed to create assistant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
