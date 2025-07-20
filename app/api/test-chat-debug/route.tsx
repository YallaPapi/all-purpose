import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Get the base URL from the request
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  
  try {
    // Test 1: Debug endpoint infrastructure check
    console.log('Testing debug endpoint...');
    const debugResponse = await fetch(`${baseUrl}/api/debug`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      results.tests.push({
        test: 'infrastructure_check',
        status: 'success',
        data: debugData
      });
    } else {
      results.tests.push({
        test: 'infrastructure_check',
        status: 'failed',
        error: `HTTP ${debugResponse.status}: ${debugResponse.statusText}`,
        responseText: await debugResponse.text()
      });
    }
  } catch (error) {
    results.tests.push({
      test: 'infrastructure_check',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  try {
    // Test 2: Get assistant ID for test-solar
    console.log('Testing company-assistant endpoint...');
    const assistantResponse = await fetch(`${baseUrl}/api/company-assistant?company=test-solar`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (assistantResponse.ok) {
      const assistantData = await assistantResponse.json();
      results.tests.push({
        test: 'assistant_lookup',
        status: 'success',
        data: assistantData
      });

      // Test 3: Chat API test (if we have an assistant ID)
      if (assistantData.success && assistantData.assistantId) {
        console.log('Testing chat API...');
        const chatResponse = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Hello, this is a test message',
            assistantId: assistantData.assistantId,
            threadId: null
          })
        });

        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          results.tests.push({
            test: 'chat_api',
            status: 'success',
            data: chatData
          });
        } else {
          const errorText = await chatResponse.text();
          results.tests.push({
            test: 'chat_api',
            status: 'failed',
            error: `HTTP ${chatResponse.status}: ${chatResponse.statusText}`,
            responseText: errorText
          });
        }
      } else {
        results.tests.push({
          test: 'chat_api',
          status: 'skipped',
          reason: 'No valid assistant ID found'
        });
      }
    } else {
      const errorText = await assistantResponse.text();
      results.tests.push({
        test: 'assistant_lookup',
        status: 'failed',
        error: `HTTP ${assistantResponse.status}: ${assistantResponse.statusText}`,
        responseText: errorText
      });
    }
  } catch (error) {
    results.tests.push({
      test: 'assistant_lookup',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Summary
  const successCount = results.tests.filter((t: any) => t.status === 'success').length;
  const failedCount = results.tests.filter((t: any) => t.status === 'failed').length;
  
  results.summary = {
    total: results.tests.length,
    passed: successCount,
    failed: failedCount,
    overall: failedCount === 0 ? 'ALL_SYSTEMS_GO' : 'ISSUES_DETECTED'
  };

  return NextResponse.json(results, { 
    status: failedCount === 0 ? 200 : 500 
  });
} 