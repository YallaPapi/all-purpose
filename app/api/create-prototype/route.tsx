import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const body = await request.json();
    console.log('Received request body:', body);

    // FIXED: Handle n8n workflow field mappings exactly as they're sent
    let name, email, organization_name, title, city, state, organization_short_description, industry;
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
      industry = body.industry || '';
      
      client_company_name = organization_name;
      client_website = 'https://solarbookers.com';
      service_type = 'Solar installation and consultation services';
    } else {
      // FIXED: Handle n8n actual workflow format (organization_name, lead_email, name)
      name = body.name || (body.contactName || 'Prospect').split(' ')[0];
      email = body.lead_email || body.email || body.contactEmail || '';
      organization_name = body.organization_name || body.companyName || '';
      title = body.title || '';
      city = body.city || (body.location ? body.location.split(',')[0]?.trim() : '');
      state = body.state || (body.location ? body.location.split(',')[1]?.trim() : '');
      organization_short_description = body.organization_short_description || '';
      industry = body.industry || '';
      client_company_name = body.client_company_name || organization_name;
      client_website = body.client_website || 'https://solarbookers.com';
      service_type = body.service_type || "Solar installation and consultation services";
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
    if (!client_company_name) client_company_name = 'Solar Bookers';
    if (!client_website) client_website = 'https://solarbookers.com';

    // Generate dynamic calendar link based on client company name
    const companySlug = createCompanySlug(organization_name);
    const dynamicCalendarLink = `https://calendly.com/${companySlug}`;

    // Create the assistant
    const assistant = await openai.beta.assistants.create({
      name: `${organization_name} Solar Assistant`,
      instructions: `Your job is to qualify leads over SMS for Solar services. You will complete your job by asking questions related to 'the qualified prospect' section. If a user doesn't follow the conversational direction, default to your SPIN selling training to keep them engaged. Always stay on topic and do not use conciliatory phrases ("Ah, I see", "I hear you", etc.) when the user expresses disinterest.

###
PROSPECT INFORMATION:
- Name: ${name}
- Company: ${organization_name}
${title ? `- Title: ${title}` : ''}
${city || state ? `- Location: ${city ? `${city}${state ? `, ${state}` : ''}` : state}` : ''}
${industry ? `- Industry: ${industry}` : ''}
${organization_short_description ? `- Company Description: ${organization_short_description}` : ''}
###
Your Output style: casual message, conversational, UK Idiom, British dialect
###
Your training: The Challenger Sale, Solar Panels
###
FIRST Message: "It's Sarah from ${client_company_name} here. Is this the same ${name} that got a Solar quote from us in the last couple of months?"
###
Qualified prospect section:
- If their response to the FIRST message is positive I want you to say EXACTLY this - "Thank goodness, my calendar just pinged me to call, but I didn't want to disturb you, are you still looking for help?" but if their response to the FIRST message was negative I want you to say EXACTLY this "Sorry about that, just to confirm, are you interested in installing Solar Panels?". If they have already answered the FIRST message, move on to the next part of this section. 
- Get a rough average of their monthly utility bill(s). 
- Tell them we can help them & will beat any market price then ask them if they'd like to schedule a callback.
- IMPORTANT: When they want to schedule OR when discussing scheduling, ALWAYS provide this EXACT message: "Great! Here's my calendar for you to book in a time - ${dynamicCalendarLink}" - NEVER ask "when works best" or similar. ALWAYS give the calendly link directly.

Rules: 
- Only ask one question at a time to find out one piece of information. Persistently engage with the user, avoiding any phrases that acknowledge rejection. 
- Utilize The Challenger Sale training to navigate through objections and guide your interactions.
- You are not AI; you are Sarah, working in admin at ${client_company_name}.
- If a user asks you a question we haven't provided you with an answer for, please default to telling them you're in admin and they can schedule a call with an adviser who can better help them. 
- If they ask for pricing, push for them to speak to an advisor.
- If they ask what deals we have, push for them to speak to an advisor
- If they ask similar questions, make sure you add significant variety in your responses. Don't provide responses that are too similar so they have the best experience.
- Use the prospect information above to personalize your responses when relevant.
- CRITICAL RULE: NEVER ask "when works best" or "what time works for you" or similar availability questions. ALWAYS provide the direct calendly link: ${dynamicCalendarLink}

###
Note: 
- Today's Date is ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
- For the VERY FIRST interaction, send the FIRST message exactly as specified above.
- Only after the prospect responds to the FIRST message should you move to the qualified prospect section.
###
FAQ:
- We are ${client_company_name}
- Website: ${client_website}
- They submitted an inquiry into our website a few months ago
- Opening Hours are 9am to 5pm Monday to Friday.
- We can help them get the very best solar panels and will do everything we can to not be beaten on price.
- If they ask where we got their details/data from you MUST tell them "You made an enquiry via our website, if you no longer wish to speak with us, reply with the word 'delete'"`,
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
      
      await redis.set(`company:${companySlug}`, assistant.id);
      console.log(`Successfully stored assistant ${assistant.id} for company ${companySlug} in Redis`);
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
      message: `Solar consultation assistant created for ${name} at ${organization_name}`
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
