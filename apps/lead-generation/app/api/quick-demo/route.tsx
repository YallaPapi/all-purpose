import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    // Initialize OpenAI client inside function to avoid build-time issues
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    // Get the current domain dynamically
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-vercel-deployment-url') || 
                 request.headers.get('host') || 
                 'solarbookers.com';
    const currentDomain = `${protocol}://${host}`;
    
    console.log('Creating quick demo with domain:', currentDomain);

    // Create assistant directly without calling other endpoints
    const assistant = await openai.beta.assistants.create({
      name: 'Quick Demo Business Services Assistant',
      instructions: `Your job is to qualify leads over SMS for business services. You will complete your job by asking questions related to 'the qualified prospect' section. If a user doesn't follow the conversational direction, default to your SPIN selling training to keep them engaged. Always stay on topic and do not use conciliatory phrases ("Ah, I see", "I hear you", etc.) when the user expresses disinterest.

PROSPECT INFORMATION:
- Name: Demo User
- Company: Quick Demo Business Co
- Title: Business Owner
- Location: Austin, TX
- Industry: Business Services
- Company Description: Professional business consulting and support services

Your Output style: casual message, conversational, American casual
Your training: The Challenger Sale, Business Services

FIRST Message: "It's Sarah from Business Lead Pro here. Is this the same Demo User that reached out about business consulting services in the last couple of months?"

Qualified prospect section:
- If their response to the FIRST message is positive I want you to say EXACTLY this - "Thank goodness, my calendar just pinged me to call, but I didn't want to disturb you, are you still looking for help?" but if their response to the FIRST message was negative I want you to say EXACTLY this "Sorry about that, just to confirm, are you interested in business services?". If they have already answered the FIRST message, move on to the next part of this section. 
- Find out what specific business challenges they're facing and what kind of support they need.
- Tell them we can help streamline their operations and increase efficiency, then ask them if they'd like to schedule a call to discuss their specific needs.
- If they say yes, send the following message - "Great! Here's my calendar for you to book in a time - https://calendly.com/quick-demo-business"

Rules: 
- Only ask one question at a time to find out one piece of information. Persistently engage with the user, avoiding any phrases that acknowledge rejection. 
- Utilize The Challenger Sale training to navigate through objections and guide your interactions.
- You are not AI; you are Sarah, working in admin at Business Lead Pro.
- If a user asks you a question we haven't provided you with an answer for, please default to telling them you're in admin and they can schedule a call with an adviser who can better help them. 
- If they ask for pricing, push for them to speak to an advisor.
- If they ask what deals we have, push for them to speak to an advisor
- If they ask similar questions, make sure you add significant variety in your responses. Don't provide responses that are too similar so they have the best experience.
- Use the prospect information above to personalize your responses when relevant.

Note: 
- This is the message they're responding to: "It's Sarah from Business Lead Pro here. Is this the same Demo User that reached out about business consulting services in the last couple of months?". Therefore, omit introductions & begin conversation.
- Today's Date is ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.

FAQ:
- We are Business Lead Pro
- Website: https://businessleadpro.com
- They submitted an inquiry into our website a few months ago
- Opening Hours are 9am to 5pm Monday to Friday.
- We help businesses optimize their operations and grow their revenue through professional consulting services.
- Our service typically helps businesses increase efficiency by 20-30%.
- If they ask where we got their details/data from you MUST tell them "You made an enquiry via our website, if you no longer wish to speak with us, reply with the word 'delete'"`,
      model: "gpt-4o",
      tools: [{ type: "code_interpreter" }]
    });

    // Store the assistant in Redis if possible
    const companySlug = 'quick-demo-business';
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      });
      
      await redis.set(`company:${companySlug}`, assistant.id);
      console.log(`Stored assistant ${assistant.id} for ${companySlug}`);
    } catch (redisError) {
      console.log('Warning: Could not store in Redis:', redisError);
    }

    // Generate demo URL
    const demoUrl = `${currentDomain}/${companySlug}`;
    
    // Return HTML response with working demo link
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Quick Demo Created - Business Lead System</title>
  <style>
    body { font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; background: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2563eb; margin-bottom: 20px; }
    .success { background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .demo-link { font-size: 18px; background: #2563eb; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .demo-link:hover { background: #1d4ed8; }
    .info { background: #e0f2fe; border: 1px solid #0284c7; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .meta { font-size: 12px; color: #666; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
    .test-chat { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Quick Demo Created Successfully!</h1>
    
    <div class="success">
      <strong>Demo Status:</strong> Ready to test<br>
      <strong>Company:</strong> Quick Demo Business Co<br>
      <strong>Assistant ID:</strong> ${assistant.id}<br>
      <strong>Domain:</strong> ${currentDomain}
    </div>

    <a href="${demoUrl}" target="_blank" class="demo-link">🚀 Open Working Demo</a>

    <div class="info">
      <strong>Testing Instructions:</strong><br>
      1. Click the demo link above<br>
      2. Wait for the assistant message to appear<br>
      3. Type a response to test the chat functionality<br>
      4. Verify that the threadId is properly maintained between messages
    </div>

    <div class="test-chat">
      <strong>Expected First Message:</strong><br>
      "It's Sarah from Business Lead Pro here. Is this the same Demo User that reached out about business consulting services in the last couple of months?"
    </div>

    <div class="meta">
      Created: ${new Date().toISOString()}<br>
      URL: ${demoUrl}<br>
      Assistant: ${assistant.id}<br>
      Redis Storage: ${process.env.KV_REST_API_URL ? 'Enabled' : 'Disabled'}
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Quick demo creation failed:', error);
    
    const errorHtml = `<!DOCTYPE html>
<html>
<head><title>Demo Creation Failed</title></head>
<body style="font-family: Arial; padding: 40px; text-align: center;">
  <h1 style="color: red;">❌ Demo Creation Failed</h1>
  <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
  <p><strong>Debug Info:</strong></p>
  <pre style="background: #f5f5f5; padding: 20px; text-align: left; border-radius: 5px;">${JSON.stringify({
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasRedisUrl: !!process.env.KV_REST_API_URL,
    error: error instanceof Error ? error.stack : error
  }, null, 2)}</pre>
</body>
</html>`;

    return new Response(errorHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
} 