import { NextRequest, NextResponse } from 'next/server';

/**
 * Meta-Agent Factory Work Request Status API
 * 
 * Track progress of submitted work requests
 */

interface WorkStatus {
  requestId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  currentAgent?: string;
  completedTasks: string[];
  remainingTasks: string[];
  estimatedCompletion: string;
  results?: {
    outputFiles?: string[];
    generatedCode?: string;
    documentation?: string;
    deploymentUrl?: string;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params;
    
    console.log(`📊 Checking status for request: ${requestId}`);

    // In a real implementation, this would query the coordination system
    // For now, we'll simulate realistic status based on request age
    const status = await getWorkStatus(requestId);

    return NextResponse.json(status);

  } catch (error) {
    console.error('❌ Status check error:', error);
    return NextResponse.json({
      error: 'Failed to get work status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getWorkStatus(requestId: string): Promise<WorkStatus> {
  // Parse timestamp from request ID to simulate realistic progress
  const timestampMatch = requestId.match(/req-(\d+)-/);
  const createdTime = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
  const currentTime = Date.now();
  const elapsedMinutes = (currentTime - createdTime) / (1000 * 60);

  // Simulate realistic work progression
  let status: 'queued' | 'in_progress' | 'completed' | 'failed' = 'queued';
  let progress = 0;
  let currentAgent = '';
  let completedTasks: string[] = [];
  let remainingTasks = ['parse-requirements', 'generate-code', 'test-output', 'finalize'];

  if (elapsedMinutes > 0.5) { // After 30 seconds
    status = 'in_progress';
    currentAgent = 'prd-parser';
    progress = 20;
    completedTasks = ['parse-requirements'];
    remainingTasks = ['generate-code', 'test-output', 'finalize'];
  }

  if (elapsedMinutes > 2) { // After 2 minutes
    currentAgent = 'scaffold-generator';
    progress = 50;
    completedTasks = ['parse-requirements', 'generate-code'];
    remainingTasks = ['test-output', 'finalize'];
  }

  if (elapsedMinutes > 4) { // After 4 minutes
    currentAgent = 'template-engine-factory';
    progress = 80;
    completedTasks = ['parse-requirements', 'generate-code', 'test-output'];
    remainingTasks = ['finalize'];
  }

  if (elapsedMinutes > 6) { // After 6 minutes
    status = 'completed';
    progress = 100;
    completedTasks = ['parse-requirements', 'generate-code', 'test-output', 'finalize'];
    remainingTasks = [];
    currentAgent = '';
  }

  const workStatus: WorkStatus = {
    requestId,
    status,
    progress,
    currentAgent,
    completedTasks,
    remainingTasks,
    estimatedCompletion: status === 'completed' ? 'Completed' : `${Math.max(0, 6 - elapsedMinutes).toFixed(1)} minutes remaining`,
    createdAt: new Date(createdTime).toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add results if completed
  if (status === 'completed') {
    workStatus.results = {
      outputFiles: [
        '/generated/package.json',
        '/generated/src/main.ts',
        '/generated/README.md',
        '/generated/tests/main.test.ts'
      ],
      generatedCode: 'Project successfully generated with modern TypeScript setup',
      documentation: 'Complete documentation generated including API docs and setup guide',
      deploymentUrl: 'https://your-project.vercel.app'
    };
  }

  return workStatus;
}