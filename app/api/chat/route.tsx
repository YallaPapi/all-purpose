import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';

export async function POST(request: NextRequest) {
  console.log('=== CHAT API START ===');
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Initialize clients inside the function to avoid build-time issues
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const { assistantId, message, threadId, company, initialize } = await request.json();
    console.log('Chat API called with:', { assistantId, message, threadId, company, initialize });

    // Get assistant ID from company slug if not provided directly
    let finalAssistantId = assistantId;
    if (!finalAssistantId && company) {
      try {
        // Try multiple Redis key formats to handle slug mismatches
        let companyData = await redis.get(`company:${company}`);
        
        if (!companyData) {
          // Try raw slug format
          const rawSlug = company.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          if (rawSlug !== company) {
            companyData = await redis.get(`company:${rawSlug}`);
          }
        }
        
        if (!companyData) {
          // Try original company name patterns
          const variations = [
            company.replace(/-/g, ''),
            company.replace(/-/g, ' '),
            company.split('-').join('')
          ];
          
          for (const variation of variations) {
            const testSlug = variation.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const testData = await redis.get(`company:${testSlug}`);
            if (testData) {
              companyData = testData;
              break;
            }
          }
        }
        
        console.log('REDIS RETRIEVAL DEBUG:', {
          lookingForKey: `company:${company}`,
          company: company,
          foundData: companyData,
          dataType: typeof companyData
        });
        
        // Handle both old format (just assistant ID) and new format (JSON object)
        if (typeof companyData === 'string' && companyData.startsWith('asst_')) {
          // Legacy format - just assistant ID
          finalAssistantId = companyData;
        } else if (typeof companyData === 'string' && companyData.startsWith('{')) {
          // New format - JSON object
          const parsed = JSON.parse(companyData);
          finalAssistantId = parsed.assistantId;
        } else if (companyData && typeof companyData === 'object') {
          // Already parsed object
          finalAssistantId = companyData.assistantId;
        } else if (companyData) {
          finalAssistantId = companyData;
        }
        
        console.log(`Final assistant ID for company ${company}:`, finalAssistantId);
      } catch (error) {
        console.error('Error retrieving assistant from Redis:', error);
        return NextResponse.json(
          { error: 'Failed to retrieve assistant data', details: error.message },
          { status: 500 }
        );
      }
    }

    if (!finalAssistantId) {
      return NextResponse.json({ error: 'Assistant ID or company is required' }, { status: 400 });
    }

    // For initialization calls, message can be empty
    if (!initialize && !message) {
      return NextResponse.json({ error: 'Message is required for non-initialization calls' }, { status: 400 });
    }

    // Create or use existing thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
      console.log('Created thread:', currentThreadId);
    }

    // Add user message to thread only if not initializing
    if (!initialize && message) {
      await openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: message
      });
    }

    // FIXED: For initialization, add a special system instruction to ensure the assistant
    // recognizes this is the absolute first interaction and should send the FIRST message
    if (initialize) {
      await openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: 'SYSTEM: This is the absolute first interaction. Please send your FIRST message exactly as specified in your instructions. This is not a response to any previous message - this is the opening message to start the conversation.'
      });
    }

    // Create run and immediately poll with a simplified approach
    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: finalAssistantId
    });

    console.log('Run created:', run.id);

    // FIXED: Bypass run status checking entirely - poll messages directly (working pattern from debug guide)
    let attempts = 0;
    const maxAttempts = 30;
    const runStartTime = Date.now();
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Skip run status checking - go straight to messages
        const messages = await openai.beta.threads.messages.list(currentThreadId);
        
        // Look for assistant messages created after this run
        const newAssistantMessage = messages.data.find(msg => 
          msg.role === 'assistant' && 
          new Date(msg.created_at * 1000) > new Date(runStartTime)
        );
        
        if (newAssistantMessage && newAssistantMessage.content[0] && newAssistantMessage.content[0].type === 'text') {
          console.log(`SUCCESS! Got response in ${attempts + 1} attempts`);
          return NextResponse.json({
            success: true,
            message: newAssistantMessage.content[0].text.value,
            threadId: currentThreadId
          });
        }
        
        attempts++;
        console.log(`Attempt ${attempts}: No new assistant message yet, continuing...`);
        
      } catch (error) {
        console.error('Error checking messages:', error);
        attempts++;
      }
    }

    // If we get here, timeout
    return NextResponse.json({
      error: 'Response timeout - assistant is taking too long',
      threadId: currentThreadId
    }, { status: 500 });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({
      error: 'Chat failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}