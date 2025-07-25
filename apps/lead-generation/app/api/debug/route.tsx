import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  // Check 1: OpenAI API Key
  results.checks.openai_key = {
    exists: !!process.env.OPENAI_API_KEY,
    length: process.env.OPENAI_API_KEY?.length || 0,
    prefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...' || 'missing'
  };

  // Check 2: Redis configuration
  results.checks.redis = {
    url_exists: !!process.env.KV_REST_API_URL,
    token_exists: !!process.env.KV_REST_API_TOKEN
  };

  // Check 3: Try to initialize OpenAI client
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    results.checks.openai_client = { status: 'initialized' };

    // Check 4: Try to create a thread
    try {
      const thread = await openai.beta.threads.create();
      results.checks.thread_creation = {
        status: 'success',
        threadId: thread.id
      };

      // Check 5: Try to retrieve the thread
      try {
        const retrievedThread = await openai.beta.threads.retrieve(thread.id);
        results.checks.thread_retrieval = {
          status: 'success',
          threadId: retrievedThread.id
        };
      } catch (retrieveError) {
        results.checks.thread_retrieval = {
          status: 'failed',
          error: retrieveError instanceof Error ? retrieveError.message : 'Unknown error'
        };
      }

    } catch (threadError) {
      results.checks.thread_creation = {
        status: 'failed',
        error: threadError instanceof Error ? threadError.message : 'Unknown error'
      };
    }

  } catch (clientError) {
    results.checks.openai_client = {
      status: 'failed',
      error: clientError instanceof Error ? clientError.message : 'Unknown error'
    };
  }

  // Check 6: Test assistant lookup for quick-demo-solar
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    
    const assistantId = await redis.get('company:quick-demo-solar');
    results.checks.redis_lookup = {
      status: 'success',
      assistantId: assistantId || 'not found'
    };
  } catch (redisError) {
    results.checks.redis_lookup = {
      status: 'failed',
      error: redisError instanceof Error ? redisError.message : 'Unknown error'
    };
  }

  return NextResponse.json(results, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assistantId, message, threadId } = body;

    const results: any = {
      timestamp: new Date().toISOString(),
      input: { assistantId, message, threadId: threadId || 'none' },
      steps: []
    };

    if (!process.env.OPENAI_API_KEY) {
      results.steps.push({ step: 'api_key_check', status: 'failed', error: 'No OpenAI API key' });
      return NextResponse.json(results, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    results.steps.push({ step: 'client_init', status: 'success' });

    // Step 1: Create or use thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      try {
        const thread = await openai.beta.threads.create();
        currentThreadId = thread.id;
        results.steps.push({ step: 'thread_creation', status: 'success', threadId: currentThreadId });
      } catch (error) {
        results.steps.push({ 
          step: 'thread_creation', 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        return NextResponse.json(results, { status: 500 });
      }
    } else {
      results.steps.push({ step: 'thread_reuse', status: 'success', threadId: currentThreadId });
    }

    // Step 2: Add message to thread
    try {
      await openai.beta.threads.messages.create(currentThreadId, {
        role: 'user',
        content: message
      });
      results.steps.push({ step: 'message_added', status: 'success' });
    } catch (error) {
      results.steps.push({ 
        step: 'message_added', 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return NextResponse.json(results, { status: 500 });
    }

    // Step 3: Create run
    try {
      const run = await openai.beta.threads.runs.create(currentThreadId, {
        assistant_id: assistantId
      });
      results.steps.push({ step: 'run_created', status: 'success', runId: run.id });

      // Step 4: Poll for completion (just one check for debug)
      // @ts-ignore - OpenAI SDK typing issue with retrieve method
      const runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
      results.steps.push({ step: 'run_status_check', status: 'success', runStatus: runStatus.status });

      return NextResponse.json(results, { status: 200 });

    } catch (error) {
      results.steps.push({ 
        step: 'run_creation', 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return NextResponse.json(results, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 