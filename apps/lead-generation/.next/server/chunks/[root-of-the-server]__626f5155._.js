module.exports = {

"[project]/.next-internal/server/app/api/meta-agent-factory/route/actions.js [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {

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
"[project]/app/api/meta-agent-factory/route.tsx [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "GET": ()=>GET,
    "POST": ()=>POST
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
async function POST(request) {
    try {
        const workRequest = await request.json();
        console.log('📋 Meta-Agent Factory received work request:', workRequest);
        // Generate unique request ID
        const requestId = workRequest.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Validate request
        if (!workRequest.type || !workRequest.description) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                error: 'Work request must include type and description'
            }, {
                status: 400
            });
        }
        // Route to appropriate meta-agents based on request type
        const routing = await routeWorkRequest(workRequest, requestId);
        // Submit to meta-agent coordination system
        const coordinationResult = await submitToCoordination(routing);
        // Store active request for dashboard tracking
        const activeRequest = {
            requestId,
            type: workRequest.type,
            description: workRequest.description,
            status: 'in_progress',
            assignedAgents: routing.agents,
            estimatedCompletion: routing.estimatedCompletion,
            createdAt: new Date().toISOString(),
            priority: workRequest.priority || 'medium'
        };
        activeRequests.set(requestId, activeRequest);
        // Clean up completed requests older than 1 hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        for (const [id, req] of activeRequests.entries()){
            const requestTime = parseInt(id.split('-')[1]) || 0;
            if (requestTime < oneHourAgo) {
                activeRequests.delete(id);
            }
        }
        const response = {
            success: true,
            requestId,
            assignedAgents: routing.agents,
            estimatedCompletion: routing.estimatedCompletion,
            trackingUrl: `/api/meta-agent-factory/status/${requestId}`
        };
        console.log('✅ Work request routed successfully:', response);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(response);
    } catch (error) {
        console.error('❌ Meta-Agent Factory error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: 'Failed to process work request',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        });
    }
}
// Simple in-memory store for active requests
const activeRequests = new Map();
async function GET(request) {
    // Return factory status and active requests
    const status = {
        factoryStatus: 'operational',
        activeRequests: Array.from(activeRequests.values()),
        availableAgents: [
            'all-purpose-pattern',
            'five-document-framework',
            'parameter-flow',
            'prd-parser',
            'scaffold-generator',
            'template-engine-factory',
            'thirty-minute-rule',
            'vercel-native-architecture',
            'infra-orchestrator'
        ],
        supportedWorkTypes: [
            {
                type: 'scaffold',
                description: 'Generate new project scaffolding with best practices',
                estimatedTime: '5-15 minutes'
            },
            {
                type: 'fix-patterns',
                description: 'Analyze and fix anti-patterns in existing codebase',
                estimatedTime: '10-30 minutes'
            },
            {
                type: 'generate-docs',
                description: 'Auto-generate comprehensive project documentation',
                estimatedTime: '5-20 minutes'
            },
            {
                type: 'create-templates',
                description: 'Build reusable templates for common patterns',
                estimatedTime: '10-25 minutes'
            },
            {
                type: 'integrate-systems',
                description: 'Design and implement system integrations',
                estimatedTime: '15-45 minutes'
            },
            {
                type: 'debug-system',
                description: 'Comprehensive system debugging and issue resolution',
                estimatedTime: '10-30 minutes'
            }
        ],
        currentLoad: 'light',
        lastHealthCheck: new Date().toISOString()
    };
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(status);
}
async function routeWorkRequest(request, requestId) {
    const routing = {
        requestId,
        agents: [],
        tasks: [],
        estimatedCompletion: '',
        priority: request.priority || 'medium'
    };
    switch(request.type){
        case 'scaffold':
            routing.agents = [
                'prd-parser',
                'scaffold-generator',
                'template-engine-factory'
            ];
            routing.estimatedCompletion = '15 minutes';
            routing.tasks = [
                {
                    agentType: 'prd-parser',
                    action: 'parse-requirements',
                    input: request.description,
                    requirements: request.requirements
                },
                {
                    agentType: 'scaffold-generator',
                    action: 'generate-project',
                    input: request.requirements?.projectName || 'new-project',
                    framework: request.requirements?.framework || 'node'
                },
                {
                    agentType: 'template-engine-factory',
                    action: 'create-templates',
                    input: request.requirements?.features || []
                }
            ];
            break;
        case 'fix-patterns':
            routing.agents = [
                'all-purpose-pattern',
                'infra-orchestrator'
            ];
            routing.estimatedCompletion = '20 minutes';
            routing.tasks = [
                {
                    agentType: 'all-purpose-pattern',
                    action: 'detect-antipatterns',
                    input: request.requirements?.codeBase || '',
                    targetDirectory: request.requirements?.targetDirectory
                },
                {
                    agentType: 'infra-orchestrator',
                    action: 'compliance-check',
                    input: 'full-audit'
                }
            ];
            break;
        case 'generate-docs':
            routing.agents = [
                'five-document-framework',
                'template-engine-factory'
            ];
            routing.estimatedCompletion = '12 minutes';
            routing.tasks = [
                {
                    agentType: 'five-document-framework',
                    action: 'generate-documentation',
                    input: request.description,
                    types: request.requirements?.documentationTypes || [
                        'readme',
                        'api',
                        'setup'
                    ]
                }
            ];
            break;
        case 'integrate-systems':
            routing.agents = [
                'parameter-flow',
                'vercel-native-architecture'
            ];
            routing.estimatedCompletion = '30 minutes';
            routing.tasks = [
                {
                    agentType: 'parameter-flow',
                    action: 'design-integration',
                    input: request.requirements?.integrationEndpoints || [],
                    description: request.description
                },
                {
                    agentType: 'vercel-native-architecture',
                    action: 'deploy-integration',
                    input: 'production-ready'
                }
            ];
            break;
        case 'debug-system':
            routing.agents = [
                'thirty-minute-rule',
                'infra-orchestrator'
            ];
            routing.estimatedCompletion = '25 minutes';
            routing.tasks = [
                {
                    agentType: 'thirty-minute-rule',
                    action: 'debug-session',
                    input: request.description,
                    isolationLevel: 'component'
                }
            ];
            break;
        default:
            throw new Error(`Unsupported work type: ${request.type}`);
    }
    return routing;
}
async function submitToCoordination(routing) {
    // Submit to the meta-agent coordination system
    console.log('🚀 Submitting to coordination system:', routing);
    // In a real implementation, this would interface with the coordination system
    // For now, we'll simulate successful submission
    return {
        success: true,
        tasksCreated: routing.tasks.length,
        agentsNotified: routing.agents.length
    };
}
}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__626f5155._.js.map