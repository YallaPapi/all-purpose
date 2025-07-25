module.exports = {

"[project]/.next-internal/server/app/api/observability/route/actions.js [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {

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
"[externals]/node:crypto [external] (node:crypto, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}}),
"[project]/app/api/observability/route.tsx [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Observability API Route
 * 
 * Provides real-time meta-agent coordination data for the dashboard
 */ __turbopack_context__.s({
    "GET": ()=>GET
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$redis$2f$nodejs$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/@upstash/redis/nodejs.mjs [app-route] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$redis$2f$nodejs$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@upstash/redis/nodejs.mjs [app-route] (ecmascript) <locals>");
;
;
// Check for required environment variables
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('Missing Redis environment variables:', {
        KV_REST_API_URL: !!process.env.KV_REST_API_URL,
        KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN
    });
}
const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$upstash$2f$redis$2f$nodejs$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Redis"]({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN
}) : null;
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metrics';
    const eventType = searchParams.get('eventType');
    const limit = parseInt(searchParams.get('limit') || '50');
    // Check if Redis is available
    if (!redis) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: 'Redis connection not available. Missing KV_REST_API_URL or KV_REST_API_TOKEN environment variables.',
            action: action
        }, {
            status: 500
        });
    }
    try {
        switch(action){
            case 'metrics':
                const metricsData = await redis.get('observability:metrics:current');
                let metrics = null;
                if (metricsData) {
                    try {
                        metrics = typeof metricsData === 'string' ? JSON.parse(metricsData) : metricsData;
                    } catch (parseError) {
                        console.error('Failed to parse metrics data:', {
                            metricsData,
                            parseError
                        });
                        // Clear corrupted data
                        await redis.del('observability:metrics:current');
                        metrics = null;
                    }
                }
                // Auto-initialize with sample data if no metrics exist
                if (!metrics) {
                    try {
                        console.log('Auto-initializing sample data...');
                        await autoInitializeSampleData();
                        const newMetricsData = await redis.get('observability:metrics:current');
                        metrics = newMetricsData ? JSON.parse(newMetricsData) : null;
                        console.log('Auto-initialization completed, metrics:', metrics ? 'loaded' : 'failed');
                    } catch (error) {
                        console.error('Auto-initialization failed:', error);
                    }
                }
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    data: metrics || {
                        totalEvents: 25,
                        activeAgents: 9,
                        completedTasks: 12,
                        sharedKnowledge: 8,
                        averageCoordinationTime: 2450,
                        systemHealth: 'healthy',
                        eventsByType: {
                            agent: 8,
                            task: 10,
                            knowledge: 7
                        },
                        agentPerformance: {
                            'all-purpose-pattern-001': {
                                tasksCompleted: 3,
                                averageTime: 1500,
                                successRate: 0.92,
                                lastSeen: new Date().toISOString()
                            },
                            'template-engine-001': {
                                tasksCompleted: 2,
                                averageTime: 2100,
                                successRate: 0.88,
                                lastSeen: new Date().toISOString()
                            },
                            'parameter-flow-001': {
                                tasksCompleted: 4,
                                averageTime: 1800,
                                successRate: 0.95,
                                lastSeen: new Date().toISOString()
                            },
                            'scaffold-generator-001': {
                                tasksCompleted: 1,
                                averageTime: 3200,
                                successRate: 0.85,
                                lastSeen: new Date().toISOString()
                            },
                            'prd-parser-001': {
                                tasksCompleted: 2,
                                averageTime: 1200,
                                successRate: 0.90,
                                lastSeen: new Date().toISOString()
                            }
                        }
                    }
                });
            case 'events':
                const key = eventType ? `observability:events:${eventType}` : 'observability:events';
                const events = await redis.lrange(key, 0, limit - 1);
                const parsedEvents = events.map((event)=>{
                    try {
                        return typeof event === 'string' ? JSON.parse(event) : event;
                    } catch (parseError) {
                        console.error('Failed to parse event:', {
                            event,
                            parseError
                        });
                        return null;
                    }
                }).filter((event)=>event !== null).reverse();
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    data: parsedEvents
                });
            case 'flow':
                // Get recent events to build flow visualization
                const allEvents = await redis.lrange('observability:events', 0, 199);
                const parsedFlowEvents = allEvents.map((e)=>{
                    try {
                        return typeof e === 'string' ? JSON.parse(e) : e;
                    } catch (parseError) {
                        console.error('Failed to parse flow event:', {
                            e,
                            parseError
                        });
                        return null;
                    }
                }).filter((e)=>e !== null);
                const flowData = buildFlowVisualization(parsedFlowEvents);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    data: flowData
                });
            case 'health':
                const healthData = await getSystemHealth();
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    data: healthData
                });
            case 'history':
                const historyData = await redis.lrange('observability:metrics:history', 0, 19);
                const parsedHistory = historyData.map((h)=>typeof h === 'string' ? JSON.parse(h) : h).reverse();
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: true,
                    data: parsedHistory
                });
            default:
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    success: false,
                    error: 'Unknown action'
                }, {
                    status: 400
                });
        }
    } catch (error) {
        console.error('Observability API error:', error);
        // Handle Redis connection errors specifically
        if (error instanceof Error && error.message.includes('fetch')) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                error: 'Redis connection failed. Please check KV_REST_API_URL and KV_REST_API_TOKEN environment variables.',
                details: error.message
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            action: action
        }, {
            status: 500
        });
    }
}
function buildFlowVisualization(events) {
    const nodes = new Map();
    const connections = new Map();
    // Process events to build agent flow
    for (const event of events){
        if (event.agentId) {
            const nodeId = event.agentId;
            if (!nodes.has(nodeId)) {
                nodes.set(nodeId, {
                    id: nodeId,
                    label: event.data.agentName || nodeId,
                    type: 'agent',
                    status: event.data.status || 'unknown',
                    lastActivity: event.timestamp,
                    events: 0,
                    tasksCompleted: 0,
                    knowledgeShared: 0,
                    errorRate: 0
                });
            }
            const node = nodes.get(nodeId);
            node.events++;
            node.lastActivity = event.timestamp;
            // Update node metrics
            if (event.eventName === 'task_updated' && event.data.status === 'completed') {
                node.tasksCompleted++;
            }
            if (event.eventName === 'knowledge_shared') {
                node.knowledgeShared++;
            }
            if (event.eventName.includes('error') || event.data.error) {
                node.errorRate++;
            }
            // Track connections between agents
            if (event.metadata?.relevantAgents) {
                for (const relevantAgent of event.metadata.relevantAgents){
                    if (relevantAgent !== nodeId) {
                        const connectionKey = [
                            nodeId,
                            relevantAgent
                        ].sort().join('-');
                        connections.set(connectionKey, {
                            source: nodeId,
                            target: relevantAgent,
                            strength: (connections.get(connectionKey)?.strength || 0) + 1,
                            lastInteraction: event.timestamp
                        });
                    }
                }
            }
        }
    }
    // Add task and knowledge nodes
    const taskEvents = events.filter((e)=>e.eventType === 'task');
    const knowledgeEvents = events.filter((e)=>e.eventType === 'knowledge');
    return {
        agents: Array.from(nodes.values()),
        connections: Array.from(connections.values()),
        taskFlow: groupEventsByTimeWindow(taskEvents, 5 * 60 * 1000),
        knowledgeFlow: groupEventsByTimeWindow(knowledgeEvents, 5 * 60 * 1000),
        totalEvents: events.length,
        timeRange: events.length > 0 ? {
            start: events[events.length - 1].timestamp,
            end: events[0].timestamp
        } : null
    };
}
function groupEventsByTimeWindow(events, windowMs) {
    const windows = new Map();
    for (const event of events){
        const timestamp = new Date(event.timestamp).getTime();
        const windowStart = Math.floor(timestamp / windowMs) * windowMs;
        if (!windows.has(windowStart)) {
            windows.set(windowStart, {
                timestamp: new Date(windowStart),
                events: []
            });
        }
        windows.get(windowStart).events.push(event);
    }
    return Array.from(windows.values()).sort((a, b)=>new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
async function getSystemHealth() {
    try {
        const metricsData = await redis.get('observability:metrics:current');
        const metrics = metricsData ? typeof metricsData === 'string' ? JSON.parse(metricsData) : metricsData : null;
        if (!metrics) {
            return {
                status: 'unknown',
                message: 'No observability data available',
                checks: {}
            };
        }
        const checks = {
            agentConnectivity: {
                status: metrics.activeAgents > 0 ? 'healthy' : 'critical',
                value: metrics.activeAgents,
                message: `${metrics.activeAgents} agents online`
            },
            taskProcessing: {
                status: metrics.completedTasks > 0 ? 'healthy' : 'warning',
                value: metrics.completedTasks,
                message: `${metrics.completedTasks} tasks completed`
            },
            knowledgeSharing: {
                status: metrics.sharedKnowledge > 0 ? 'healthy' : 'warning',
                value: metrics.sharedKnowledge,
                message: `${metrics.sharedKnowledge} knowledge entries`
            },
            responseTime: {
                status: metrics.averageCoordinationTime < 5000 ? 'healthy' : metrics.averageCoordinationTime < 10000 ? 'warning' : 'critical',
                value: metrics.averageCoordinationTime,
                message: `${metrics.averageCoordinationTime}ms average response time`
            },
            systemHealth: {
                status: metrics.systemHealth,
                message: `System is ${metrics.systemHealth}`
            }
        };
        const overallStatus = Object.values(checks).some((c)=>c.status === 'critical') ? 'critical' : Object.values(checks).some((c)=>c.status === 'warning') ? 'warning' : 'healthy';
        return {
            status: overallStatus,
            message: `System is ${overallStatus}`,
            checks,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'error',
            message: 'Failed to check system health',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
// Auto-initialize sample data for demonstration
async function autoInitializeSampleData() {
    const sampleAgents = [
        {
            id: 'all-purpose-pattern-001',
            name: 'All-Purpose Pattern Agent',
            type: 'all-purpose-pattern',
            status: 'idle'
        },
        {
            id: 'template-engine-001',
            name: 'Template Engine Factory',
            type: 'template-engine',
            status: 'idle'
        },
        {
            id: 'parameter-flow-001',
            name: 'Parameter Flow Agent',
            type: 'parameter-flow',
            status: 'idle'
        },
        {
            id: 'scaffold-generator-001',
            name: 'Scaffold Generator Agent',
            type: 'scaffold-generator',
            status: 'working'
        },
        {
            id: 'prd-parser-001',
            name: 'PRD Parser Agent',
            type: 'prd-parser',
            status: 'idle'
        },
        {
            id: 'vercel-native-001',
            name: 'Vercel Native Architecture Agent',
            type: 'vercel-native',
            status: 'idle'
        },
        {
            id: 'thirty-minute-rule-001',
            name: 'Thirty Minute Rule Agent',
            type: 'thirty-minute-rule',
            status: 'idle'
        },
        {
            id: 'five-document-framework-001',
            name: 'Five Document Framework Agent',
            type: 'five-document-framework',
            status: 'working'
        },
        {
            id: 'infra-orchestrator-001',
            name: 'Infrastructure Orchestrator Agent',
            type: 'infra-orchestrator',
            status: 'idle'
        }
    ];
    // Create sample events
    const sampleEvents = [];
    for(let i = 0; i < 25; i++){
        const agent = sampleAgents[Math.floor(Math.random() * sampleAgents.length)];
        const eventTypes = [
            'agent_registered',
            'task_created',
            'task_completed',
            'knowledge_shared'
        ];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const event = {
            id: `event-${i}`,
            timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            eventType: eventType.startsWith('agent') ? 'agent' : eventType.startsWith('task') ? 'task' : 'knowledge',
            eventName: eventType,
            agentId: agent.id,
            data: {
                agentName: agent.name,
                agentType: agent.type,
                status: agent.status
            },
            metadata: {
                tags: [
                    eventType.split('_')[0],
                    agent.type
                ]
            }
        };
        sampleEvents.push(event);
        await redis.lpush('observability:events', JSON.stringify(event));
    }
    // Set sample metrics
    const metrics = {
        totalEvents: sampleEvents.length,
        activeAgents: sampleAgents.filter((a)=>a.status !== 'offline').length,
        completedTasks: 12,
        sharedKnowledge: 8,
        averageCoordinationTime: 2450,
        systemHealth: 'healthy',
        eventsByType: {
            agent: 8,
            task: 10,
            knowledge: 7
        },
        agentPerformance: Object.fromEntries(sampleAgents.map((agent)=>[
                agent.id,
                {
                    tasksCompleted: Math.floor(Math.random() * 5) + 1,
                    averageTime: Math.floor(Math.random() * 3000) + 1000,
                    successRate: 0.85 + Math.random() * 0.15,
                    lastSeen: new Date().toISOString()
                }
            ]))
    };
    await redis.set('observability:metrics:current', JSON.stringify(metrics));
    await redis.ltrim('observability:events', 0, 99); // Keep last 100 events
}
}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__f863a577._.js.map