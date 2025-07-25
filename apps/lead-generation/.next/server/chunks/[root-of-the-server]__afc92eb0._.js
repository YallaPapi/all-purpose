module.exports = {

"[project]/.next-internal/server/app/api/meta-agent-factory/progress/[requestId]/route/actions.js [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
}}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}}),
"[project]/app/api/meta-agent-factory/progress/[requestId]/route.tsx [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "GET": ()=>GET
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
async function GET(request, { params }) {
    try {
        const { requestId } = params;
        const url = new URL(request.url);
        const format = url.searchParams.get('format') || 'json'; // json, sse
        if (format === 'sse') {
            // Server-Sent Events for real-time updates
            return new Response(createSSEStream(requestId), {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        // Regular JSON response
        const progress = await getVisualProgress(requestId);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(progress);
    } catch (error) {
        console.error('❌ Visual progress error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to get visual progress',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        });
    }
}
function createSSEStream(requestId) {
    return new ReadableStream({
        async start (controller) {
            console.log(`🎬 Starting visual progress stream for ${requestId}`);
            // Send initial connection
            controller.enqueue(`data: ${JSON.stringify({
                type: 'connected',
                requestId
            })}\n\n`);
            // Simulate real-time progress updates
            const steps = generateBuildSteps(requestId);
            for(let i = 0; i < steps.length; i++){
                const step = steps[i];
                // Send step start
                step.status = 'in_progress';
                const progress = {
                    type: 'progress',
                    requestId,
                    overallProgress: Math.round(i / steps.length * 100),
                    currentStep: i + 1,
                    totalSteps: steps.length,
                    currentStepData: step,
                    architecture: generateArchitectureVisualization(i + 1, steps.length)
                };
                controller.enqueue(`data: ${JSON.stringify(progress)}\n\n`);
                // Simulate work time
                await new Promise((resolve)=>setTimeout(resolve, step.estimatedDuration * 1000));
                // Send step completion
                step.status = 'completed';
                step.actualDuration = step.estimatedDuration;
                progress.currentStepData = step;
                progress.overallProgress = Math.round((i + 1) / steps.length * 100);
                controller.enqueue(`data: ${JSON.stringify(progress)}\n\n`);
            }
            // Send completion
            controller.enqueue(`data: ${JSON.stringify({
                type: 'completed',
                requestId,
                finalArchitecture: generateFinalArchitecture()
            })}\n\n`);
            controller.close();
        }
    });
}
async function getVisualProgress(requestId) {
    // Parse timestamp from request ID to simulate realistic progress
    const timestampMatch = requestId.match(/req-(\d+)-/);
    const createdTime = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - createdTime) / 1000;
    const steps = generateBuildSteps(requestId);
    let currentStep = 0;
    let overallProgress = 0;
    // Calculate current step based on elapsed time
    let accumulatedTime = 0;
    for(let i = 0; i < steps.length; i++){
        accumulatedTime += steps[i].estimatedDuration;
        if (elapsedSeconds >= accumulatedTime) {
            steps[i].status = 'completed';
            currentStep = i + 1;
        } else if (elapsedSeconds >= accumulatedTime - steps[i].estimatedDuration) {
            steps[i].status = 'in_progress';
            currentStep = i + 1;
            break;
        }
    }
    overallProgress = Math.min(100, currentStep / steps.length * 100);
    return {
        requestId,
        overallProgress,
        currentStep,
        totalSteps: steps.length,
        steps,
        architecture: generateArchitectureVisualization(currentStep, steps.length),
        lastUpdate: new Date().toISOString()
    };
}
function generateBuildSteps(requestId) {
    return [
        {
            stepId: 'parse-requirements',
            title: '📋 Parsing Requirements',
            description: 'PRD Parser Agent analyzing your project requirements',
            agent: 'prd-parser',
            status: 'pending',
            visualType: 'emoji',
            visual: '📋➡️🤖➡️📝',
            timestamp: new Date().toISOString(),
            estimatedDuration: 3
        },
        {
            stepId: 'setup-structure',
            title: '🏗️ Setting Up Project Structure',
            description: 'Scaffold Generator creating project foundation',
            agent: 'scaffold-generator',
            status: 'pending',
            visualType: 'ascii',
            visual: `
┌─ auth-api-server/
├── src/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── utils/
├── tests/
├── package.json
└── README.md`,
            timestamp: new Date().toISOString(),
            estimatedDuration: 4
        },
        {
            stepId: 'database-setup',
            title: '🗄️ Configuring Database',
            description: 'Setting up PostgreSQL with connection pooling',
            agent: 'parameter-flow',
            status: 'pending',
            visualType: 'emoji',
            visual: '🗄️🔗⚡📊',
            timestamp: new Date().toISOString(),
            estimatedDuration: 5
        },
        {
            stepId: 'auth-system',
            title: '🔐 Building Authentication',
            description: 'Implementing JWT-based authentication system',
            agent: 'template-engine-factory',
            status: 'pending',
            visualType: 'ascii',
            visual: `
🔐 JWT Authentication Flow
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Client  │───▶│  Auth   │───▶│Database │
   │         │◀───│Service  │◀───│         │
   └─────────┘    └─────────┘    └─────────┘
        │              │              │
        ▼              ▼              ▼
   🎫 Token      🔒 Validate    👤 User Data`,
            timestamp: new Date().toISOString(),
            estimatedDuration: 6
        },
        {
            stepId: 'api-endpoints',
            title: '🌐 Creating API Endpoints',
            description: 'Building RESTful API with Fastify',
            agent: 'template-engine-factory',
            status: 'pending',
            visualType: 'emoji',
            visual: '🌐🛠️📡✨',
            timestamp: new Date().toISOString(),
            estimatedDuration: 4
        },
        {
            stepId: 'swagger-docs',
            title: '📚 Generating Documentation',
            description: 'Creating Swagger/OpenAPI documentation',
            agent: 'five-document-framework',
            status: 'pending',
            visualType: 'emoji',
            visual: '📚📖📋✅',
            timestamp: new Date().toISOString(),
            estimatedDuration: 3
        },
        {
            stepId: 'testing',
            title: '🧪 Running Tests',
            description: 'Executing comprehensive test suite',
            agent: 'thirty-minute-rule',
            status: 'pending',
            visualType: 'ascii',
            visual: `
🧪 Test Results:
   ✅ Unit Tests:        15/15 passed
   ✅ Integration Tests:  8/8 passed  
   ✅ Security Tests:     5/5 passed
   ✅ Performance Tests:  3/3 passed
   
   📊 Coverage: 94%`,
            timestamp: new Date().toISOString(),
            estimatedDuration: 5
        },
        {
            stepId: 'deployment',
            title: '🚀 Deploying to Production',
            description: 'Vercel Native Architecture handling deployment',
            agent: 'vercel-native-architecture',
            status: 'pending',
            visualType: 'emoji',
            visual: '🚀☁️🌍✨',
            timestamp: new Date().toISOString(),
            estimatedDuration: 4
        }
    ];
}
function generateArchitectureVisualization(currentStep, totalSteps) {
    const completionRatio = currentStep / totalSteps;
    if (completionRatio < 0.3) {
        return `
🏗️ Building Foundation...
┌─────────────────┐
│  📋 Requirements │ ✅
├─────────────────┤
│  🏗️ Structure   │ 🔄
├─────────────────┤
│  🗄️ Database    │ ⏳
├─────────────────┤
│  🔐 Auth        │ ⏳
├─────────────────┤
│  🌐 API         │ ⏳
├─────────────────┤
│  📚 Docs        │ ⏳
├─────────────────┤
│  🧪 Tests       │ ⏳
├─────────────────┤
│  🚀 Deploy      │ ⏳
└─────────────────┘`;
    } else if (completionRatio < 0.7) {
        return `
🔧 Building Core Systems...
┌─────────────────┐
│  📋 Requirements │ ✅
├─────────────────┤
│  🏗️ Structure   │ ✅
├─────────────────┤
│  🗄️ Database    │ ✅
├─────────────────┤
│  🔐 Auth        │ 🔄
├─────────────────┤
│  🌐 API         │ 🔄
├─────────────────┤
│  📚 Docs        │ ⏳
├─────────────────┤
│  🧪 Tests       │ ⏳
├─────────────────┤
│  🚀 Deploy      │ ⏳
└─────────────────┘`;
    } else {
        return `
🔥 Finalizing & Deploying...
┌─────────────────┐
│  📋 Requirements │ ✅
├─────────────────┤
│  🏗️ Structure   │ ✅
├─────────────────┤
│  🗄️ Database    │ ✅
├─────────────────┤
│  🔐 Auth        │ ✅
├─────────────────┤
│  🌐 API         │ ✅
├─────────────────┤
│  📚 Docs        │ ✅
├─────────────────┤
│  🧪 Tests       │ 🔄
├─────────────────┤
│  🚀 Deploy      │ 🔄
└─────────────────┘`;
    }
}
function generateFinalArchitecture() {
    return `
🎉 AUTH-API-SERVER COMPLETE!

         🌐 Production API
              │
       ┌──────┴──────┐
       │   Fastify   │
       │   Server    │
       └──────┬──────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│🔐 Auth│ │🌐 API │ │📚 Docs│
│System │ │Routes │ │Swagger│
└───┬───┘ └───────┘ └───────┘
    │
┌───▼───┐
│🗄️ DB  │
│PostgreSQL│
└───────┘

✅ Features Implemented:
• JWT Authentication & Authorization
• RESTful API with Fastify
• PostgreSQL Database Integration
• Comprehensive Test Suite (94% coverage)
• Swagger/OpenAPI Documentation
• Production-Ready Deployment

🚀 Live at: https://auth-api-server.vercel.app
📚 Docs: https://auth-api-server.vercel.app/docs
`;
}
}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__afc92eb0._.js.map