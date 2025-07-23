"use strict";
/**
 * Thirty-Minute Rule Agent - Main Export
 *
 * The Anti-Debugging-Loop Guardian that prevents endless debugging by architecting
 * time-bounded problem solving with systematic debugging procedures.
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on project types or debugging scenarios
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.DebugEndpointGenerator = exports.ComponentIsolationTester = exports.DebuggingSessionManager = exports.ThirtyMinuteRuleAgent = void 0;
exports.createThirtyMinuteRuleAgent = createThirtyMinuteRuleAgent;
exports.startQuickDebuggingSession = startQuickDebuggingSession;
var ThirtyMinuteRuleAgent_js_1 = require("./core/ThirtyMinuteRuleAgent.js");
Object.defineProperty(exports, "ThirtyMinuteRuleAgent", { enumerable: true, get: function () { return ThirtyMinuteRuleAgent_js_1.ThirtyMinuteRuleAgent; } });
var DebuggingSessionManager_js_1 = require("./core/DebuggingSessionManager.js");
Object.defineProperty(exports, "DebuggingSessionManager", { enumerable: true, get: function () { return DebuggingSessionManager_js_1.DebuggingSessionManager; } });
var ComponentIsolationTester_js_1 = require("./core/ComponentIsolationTester.js");
Object.defineProperty(exports, "ComponentIsolationTester", { enumerable: true, get: function () { return ComponentIsolationTester_js_1.ComponentIsolationTester; } });
var DebugEndpointGenerator_js_1 = require("./debug/DebugEndpointGenerator.js");
Object.defineProperty(exports, "DebugEndpointGenerator", { enumerable: true, get: function () { return DebugEndpointGenerator_js_1.DebugEndpointGenerator; } });
__exportStar(require("./types/index.js"), exports);
// Re-export for convenience
var ThirtyMinuteRuleAgent_js_2 = require("./core/ThirtyMinuteRuleAgent.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(ThirtyMinuteRuleAgent_js_2).default; } });
/**
 * Create a new Thirty-Minute Rule Agent with default configuration
 */
const ThirtyMinuteRuleAgent_js_3 = require("./core/ThirtyMinuteRuleAgent.js");
function createThirtyMinuteRuleAgent(config) {
    return new ThirtyMinuteRuleAgent_js_3.ThirtyMinuteRuleAgent(config);
}
/**
 * Quick-start function for common debugging scenarios
 */
async function startQuickDebuggingSession(description, options) {
    const agent = new ThirtyMinuteRuleAgent_js_3.ThirtyMinuteRuleAgent({
        defaultTimeLimit: options?.timeLimit,
        autoGenerateEndpoints: options?.autoSetup !== false,
        isolationTestingEnabled: options?.autoSetup !== false
    });
    await agent.initialize();
    // Start the debugging session
    const sessionId = await agent.startDebuggingSession({
        description,
        component: options?.component,
        timeLimit: options?.timeLimit,
        autoGenerateEndpoints: options?.autoSetup !== false,
        runIsolationTests: options?.autoSetup !== false
    });
    console.log(`🚀 Quick debugging session started: ${sessionId}`);
    return agent;
}
//# sourceMappingURL=index.js.map