module.exports = {

"[project]/.next-internal/server/app/api/meta-agent-factory/status/[requestId]/route/actions.js [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {

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
"[project]/app/api/meta-agent-factory/status/[requestId]/route.tsx [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "GET": ()=>GET
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
async function GET(request, { params }) {
    try {
        const { requestId } = params;
        console.log(`📊 Checking status for request: ${requestId}`);
        // In a real implementation, this would query the coordination system
        // For now, we'll simulate realistic status based on request age
        const status = await getWorkStatus(requestId);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(status);
    } catch (error) {
        console.error('❌ Status check error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to get work status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        });
    }
}
async function getWorkStatus(requestId) {
    // Parse timestamp from request ID to simulate realistic progress
    const timestampMatch = requestId.match(/req-(\d+)-/);
    const createdTime = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
    const currentTime = Date.now();
    const elapsedMinutes = (currentTime - createdTime) / (1000 * 60);
    // Simulate realistic work progression
    let status = 'queued';
    let progress = 0;
    let currentAgent = '';
    let completedTasks = [];
    let remainingTasks = [
        'parse-requirements',
        'generate-code',
        'test-output',
        'finalize'
    ];
    if (elapsedMinutes > 0.5) {
        status = 'in_progress';
        currentAgent = 'prd-parser';
        progress = 20;
        completedTasks = [
            'parse-requirements'
        ];
        remainingTasks = [
            'generate-code',
            'test-output',
            'finalize'
        ];
    }
    if (elapsedMinutes > 2) {
        currentAgent = 'scaffold-generator';
        progress = 50;
        completedTasks = [
            'parse-requirements',
            'generate-code'
        ];
        remainingTasks = [
            'test-output',
            'finalize'
        ];
    }
    if (elapsedMinutes > 4) {
        currentAgent = 'template-engine-factory';
        progress = 80;
        completedTasks = [
            'parse-requirements',
            'generate-code',
            'test-output'
        ];
        remainingTasks = [
            'finalize'
        ];
    }
    if (elapsedMinutes > 6) {
        status = 'completed';
        progress = 100;
        completedTasks = [
            'parse-requirements',
            'generate-code',
            'test-output',
            'finalize'
        ];
        remainingTasks = [];
        currentAgent = '';
    }
    const workStatus = {
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
}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__87996f36._.js.map