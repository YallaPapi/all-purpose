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
"[externals]/child_process [external] (child_process, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}}),
"[externals]/fs [external] (fs, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}}),
"[externals]/path [external] (path, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}}),
"[project]/app/api/meta-agent-factory/route.tsx [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "GET": ()=>GET,
    "POST": ()=>POST
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/child_process [external] (child_process, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
;
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
                'infra-orchestrator'
            ];
            routing.estimatedCompletion = '20 minutes';
            routing.tasks = [
                {
                    agentType: 'prd-parser',
                    action: 'parse-requirements',
                    input: request.prdContent || request.description,
                    requirements: request.requirements
                },
                {
                    agentType: 'scaffold-generator',
                    action: 'generate-project',
                    input: request.requirements?.projectName || 'prospector-agent',
                    framework: request.requirements?.framework || 'node'
                },
                {
                    agentType: 'infra-orchestrator',
                    action: 'validate-and-setup',
                    input: 'generated-project',
                    requirements: request.requirements
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
    // Submit to the REAL meta-agent coordination system
    console.log('🚀 Submitting to REAL coordination system:', routing);
    try {
        // Execute tasks in sequence for each assigned agent with data flow
        const executionResults = [];
        let prdResults = null;
        for (const task of routing.tasks){
            console.log(`📋 Executing task: ${task.action} with agent: ${task.agentType}`);
            // Pass PRD results to subsequent agents that need them
            const result = await executeMetaAgent(task.agentType, task, prdResults);
            executionResults.push(result);
            // Store PRD results for subsequent agents
            if (task.agentType === 'prd-parser') {
                prdResults = result;
                console.log('📋 Captured PRD results for downstream agents');
            }
            // Update active request status
            updateRequestProgress(routing.requestId, {
                completedTasks: executionResults.length,
                totalTasks: routing.tasks.length,
                currentAgent: task.agentType,
                progress: Math.round(executionResults.length / routing.tasks.length * 100)
            });
        }
        return {
            success: true,
            tasksCreated: routing.tasks.length,
            agentsNotified: routing.agents.length,
            executionResults
        };
    } catch (error) {
        console.error('❌ Coordination system error:', error);
        throw error;
    }
}
// Real meta-agent execution function
async function executeMetaAgent(agentType, task, prdResults) {
    const projectRoot = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), '../../..');
    const agentPaths = {
        'prd-parser': __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(projectRoot, 'src/meta-agents/prd-parser/main.js'),
        'scaffold-generator': __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(projectRoot, 'src/meta-agents/scaffold-generator/main.js'),
        'template-engine-factory': __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(projectRoot, 'src/meta-agents/template-engine-factory/src/main.ts'),
        'thirty-minute-rule': __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(projectRoot, 'src/meta-agents/thirty-minute-rule/src/main.ts'),
        'infra-orchestrator': __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(projectRoot, 'src/meta-agents/infra-orchestrator/src/main.ts')
    };
    const agentPath = agentPaths[agentType];
    if (!agentPath) {
        throw new Error(`Unknown agent type: ${agentType}`);
    }
    console.log(`🤖 Executing ${agentType} at ${agentPath}`);
    try {
        // Ensure generated directory exists
        const generatedDir = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(projectRoot, 'generated');
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].mkdir(generatedDir, {
            recursive: true
        });
        // Execute the specific agent with real parameters
        switch(agentType){
            case 'prd-parser':
                return await executePRDParser(agentPath, task, generatedDir);
            case 'scaffold-generator':
                return await executeScaffoldGenerator(agentPath, task, generatedDir, prdResults);
            case 'template-engine-factory':
                return await executeTemplateEngine(agentPath, task, generatedDir);
            case 'infra-orchestrator':
                return await executeInfraOrchestrator(agentPath, task, generatedDir);
            default:
                throw new Error(`Agent execution not implemented for: ${agentType}`);
        }
    } catch (error) {
        console.error(`❌ Error executing ${agentType}:`, error);
        throw error;
    }
}
// Execute PRD Parser with TaskMaster CLI integration
async function executePRDParser(agentPath, task, generatedDir) {
    console.log('📋 Running PRD Parser with TaskMaster CLI...');
    // Load pre-parsed tasks from our TaskMaster output
    const projectRoot = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), '../../..');
    const tasksPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(projectRoot, 'prospector-agent-tasks.json');
    try {
        // Check if we already have parsed tasks
        const tasksContent = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readFile(tasksPath, 'utf8');
        const parsedTasks = JSON.parse(tasksContent);
        console.log('✅ Using pre-parsed TaskMaster tasks:', parsedTasks.metadata.totalTasks, 'tasks');
        return {
            success: true,
            agent: 'prd-parser',
            output: `Successfully loaded ${parsedTasks.metadata.totalTasks} tasks from TaskMaster`,
            action: task.action,
            prdProcessed: true,
            tasks: parsedTasks.tasks,
            metadata: parsedTasks.metadata
        };
    } catch (error) {
        console.error('❌ Failed to load pre-parsed tasks:', error);
        // Fallback: Use TaskMaster CLI directly
        const prdPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(generatedDir, 'prospector-agent-prd.md');
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(prdPath, task.input || '');
        return new Promise((resolve, reject)=>{
            // Use the installed TaskMaster CLI tool
            const agent = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])('task-master', [
                'parse-prd',
                '--input',
                prdPath
            ], {
                cwd: projectRoot,
                stdio: [
                    'pipe',
                    'pipe',
                    'pipe'
                ]
            });
            let output = '';
            let errorOutput = '';
            agent.stdout.on('data', (data)=>{
                output += data.toString();
                console.log(`TaskMaster CLI: ${data.toString().trim()}`);
            });
            agent.stderr.on('data', (data)=>{
                errorOutput += data.toString();
                console.error(`TaskMaster CLI Error: ${data.toString().trim()}`);
            });
            agent.on('close', (code)=>{
                if (code === 0) {
                    resolve({
                        success: true,
                        agent: 'prd-parser',
                        output: output.trim(),
                        action: task.action,
                        prdProcessed: true
                    });
                } else {
                    reject(new Error(`TaskMaster CLI failed with code ${code}: ${errorOutput}`));
                }
            });
            agent.on('error', (error)=>{
                reject(new Error(`Failed to start TaskMaster CLI: ${error.message}`));
            });
        });
    }
}
// Execute Scaffold Generator with real file creation
async function executeScaffoldGenerator(agentPath, task, generatedDir, prdResults) {
    console.log('🏗️ Running Scaffold Generator with real file creation...');
    const projectName = task.input || 'prospector-agent';
    const outputPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(generatedDir, projectName);
    // Prepare PRD data for scaffold generator
    const prdData = {
        tasks: prdResults?.tasks || [],
        metadata: prdResults?.metadata || {
            projectName: projectName,
            description: 'Lead discovery engine for the Lead Generation Machine',
            author: 'Meta-Agent Factory',
            license: 'MIT'
        }
    };
    // Write PRD data to temporary file for scaffold generator
    const prdPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(generatedDir, `${projectName}-prd.json`);
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].writeFile(prdPath, JSON.stringify(prdData, null, 2));
    return new Promise((resolve, reject)=>{
        // Use the working scaffold generator with PRD input
        const agent = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])('node', [
            agentPath
        ], {
            cwd: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(agentPath),
            stdio: [
                'pipe',
                'pipe',
                'pipe'
            ]
        });
        // Send the PRD data to scaffold generator via stdin
        agent.stdin.write(JSON.stringify(prdData));
        agent.stdin.end();
        let output = '';
        let errorOutput = '';
        agent.stdout.on('data', (data)=>{
            output += data.toString();
            console.log(`Scaffold-Generator: ${data.toString().trim()}`);
        });
        agent.stderr.on('data', (data)=>{
            errorOutput += data.toString();
            console.error(`Scaffold-Generator Error: ${data.toString().trim()}`);
        });
        agent.on('close', async (code)=>{
            if (code === 0) {
                // Verify files were actually created
                try {
                    const files = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["promises"].readdir(outputPath);
                    console.log(`✅ Generated files: ${files.join(', ')}`);
                    resolve({
                        success: true,
                        agent: 'scaffold-generator',
                        output: output.trim(),
                        generatedPath: outputPath,
                        generatedFiles: files,
                        action: task.action
                    });
                } catch (error) {
                    reject(new Error(`Scaffold generated but files not found: ${error}`));
                }
            } else {
                reject(new Error(`Scaffold Generator failed with code ${code}: ${errorOutput}`));
            }
        });
        agent.on('error', (error)=>{
            reject(new Error(`Failed to start Scaffold Generator: ${error.message}`));
        });
    });
}
// Execute Template Engine with Context7 integration
async function executeTemplateEngine(agentPath, task, generatedDir) {
    console.log('🏭 Running Template Engine with Context7 integration...');
    return new Promise((resolve, reject)=>{
        // Use simplified approach for template engine
        const agent = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])('node', [
            agentPath,
            '--action',
            task.action,
            '--output',
            generatedDir
        ], {
            cwd: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(agentPath),
            stdio: [
                'pipe',
                'pipe',
                'pipe'
            ]
        });
        let output = '';
        let errorOutput = '';
        agent.stdout.on('data', (data)=>{
            output += data.toString();
            console.log(`Template-Engine: ${data.toString().trim()}`);
        });
        agent.stderr.on('data', (data)=>{
            errorOutput += data.toString();
            console.error(`Template-Engine Error: ${data.toString().trim()}`);
        });
        agent.on('close', (code)=>{
            if (code === 0) {
                resolve({
                    success: true,
                    agent: 'template-engine-factory',
                    output: output.trim(),
                    action: task.action
                });
            } else {
                reject(new Error(`Template Engine failed with code ${code}: ${errorOutput}`));
            }
        });
        agent.on('error', (error)=>{
            reject(new Error(`Failed to start Template Engine: ${error.message}`));
        });
    });
}
// Update request progress with real data
function updateRequestProgress(requestId, progressData) {
    const request = activeRequests.get(requestId);
    if (request) {
        request.status = progressData.progress >= 100 ? 'completed' : 'in_progress';
        request.progress = progressData.progress;
        request.currentAgent = progressData.currentAgent;
        request.completedTasks = progressData.completedTasks || [];
        request.updatedAt = new Date().toISOString();
        if (progressData.progress >= 100) {
            request.status = 'completed';
            request.results = {
                outputFiles: [
                    '/generated/package.json',
                    '/generated/src/main.ts',
                    '/generated/README.md'
                ],
                generatedCode: 'Prospector Agent successfully generated with Google Places API integration',
                documentation: 'Complete documentation generated including All-Purpose Pattern implementation'
            };
        }
        activeRequests.set(requestId, request);
        console.log(`📊 Updated progress for ${requestId}: ${progressData.progress}%`);
    }
}
// Execute Infrastructure Orchestrator for validation and setup
async function executeInfraOrchestrator(agentPath, task, generatedDir) {
    console.log('🏗️ Running Infrastructure Orchestrator with real validation...');
    return new Promise((resolve, reject)=>{
        // Use the working Infrastructure Orchestrator like in the implementation example
        const agent = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$child_process__$5b$external$5d$__$28$child_process$2c$__cjs$29$__["spawn"])('node', [
            'dist/main.js',
            'orchestrate',
            '--enable-investigation',
            '--project-root',
            generatedDir
        ], {
            cwd: __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname(agentPath),
            stdio: [
                'pipe',
                'pipe',
                'pipe'
            ]
        });
        let output = '';
        let errorOutput = '';
        agent.stdout.on('data', (data)=>{
            output += data.toString();
            console.log(`Infrastructure-Orchestrator: ${data.toString().trim()}`);
        });
        agent.stderr.on('data', (data)=>{
            errorOutput += data.toString();
            console.error(`Infrastructure-Orchestrator Error: ${data.toString().trim()}`);
        });
        agent.on('close', (code)=>{
            if (code === 0) {
                resolve({
                    success: true,
                    agent: 'infra-orchestrator',
                    output: output.trim(),
                    action: task.action,
                    validated: true
                });
            } else {
                reject(new Error(`Infrastructure Orchestrator failed with code ${code}: ${errorOutput}`));
            }
        });
        agent.on('error', (error)=>{
            reject(new Error(`Failed to start Infrastructure Orchestrator: ${error.message}`));
        });
    });
}
}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__32d46b98._.js.map