import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Test prompt request body:', body);

    // Extract industry from request
    const industry = body.industry || '';
    const industryText = industry || 'business services';
    const name = body.contactName || body.name || 'Prospect';
    const client_company_name = body.companyName || body.organization_name || 'Test Company';

    // Test the first message construction
    const firstMessage = `It's Sarah from ${client_company_name} here. Is this the same ${name} that got a quote for ${industryText} from us in the last couple of months?`;
    
    return NextResponse.json({
      success: true,
      industry_received: industry,
      industry_text_used: industryText,
      first_message: firstMessage,
      prompt_contains_industry: firstMessage.includes(industryText),
      template_debugging: {
        client_company_name,
        name,
        industryText
      }
    });

  } catch (error) {
    console.error('Test prompt error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}