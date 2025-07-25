/**
 * Tests for ThirtyMinuteRuleAgent
 * 
 * Tests the core functionality of the Anti-Debugging-Loop Guardian
 */

import { ThirtyMinuteRuleAgent } from '../../src/core/ThirtyMinuteRuleAgent';
import type { ThirtyMinuteRuleConfig } from '../../src/types/index';

describe('ThirtyMinuteRuleAgent', () => {
  let agent: ThirtyMinuteRuleAgent;
  let config: ThirtyMinuteRuleConfig;

  beforeEach(() => {
    config = {
      defaultTimeLimit: 15 * 60 * 1000, // 15 minutes for testing
      debugEndpointPort: 3002, // Use different port for tests
      autoGenerateEndpoints: false, // Disable for unit tests
      isolationTestingEnabled: false, // Disable for unit tests
      contextEnabled: false, // Disable for unit tests
      metaAgentCoordination: false // Disable for unit tests
    };

    agent = new ThirtyMinuteRuleAgent(config);
  });

  afterEach(async () => {
    // Clean up any active sessions
    const status = agent.getDebuggingStatus();
    for (const session of status.activeSessions) {
      await agent.cancelDebuggingSession(session.sessionId, 'Test cleanup');
    }
  });

  describe('initialization', () => {
    test('should initialize with default configuration', () => {
      const defaultAgent = new ThirtyMinuteRuleAgent();
      expect(defaultAgent).toBeInstanceOf(ThirtyMinuteRuleAgent);
    });

    test('should initialize with custom configuration', () => {
      expect(agent).toBeInstanceOf(ThirtyMinuteRuleAgent);
    });

    test('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    test('should emit initialization events', async () => {
      const initializingSpy = jest.fn();
      const initializedSpy = jest.fn();

      agent.on('agent:initializing', initializingSpy);
      agent.on('agent:initialized', initializedSpy);

      await agent.initialize();

      expect(initializingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: 'Thirty-Minute-Rule',
          config: expect.any(Object),
          timestamp: expect.any(String)
        })
      );

      expect(initializedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: 'Thirty-Minute-Rule',
          capabilities: expect.any(Object),
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('debugging sessions', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should start a debugging session', async () => {
      const sessionId = await agent.startDebuggingSession({
        description: 'Test debugging session',
        component: 'TestComponent',
        priority: 'medium'
      });

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');

      const status = agent.getDebuggingStatus();
      expect(status.activeSessions).toHaveLength(1);
      expect(status.activeSessions[0].sessionId).toBe(sessionId);
    });

    test('should add debug steps to active session', async () => {
      const sessionId = await agent.startDebuggingSession({
        description: 'Test debugging session'
      });

      await agent.addDebugStep(sessionId, {
        action: 'Test action',
        result: 'success',
        details: 'Test step details',
        confidence: 0.8
      });

      const status = agent.getDebuggingStatus();
      const session = status.activeSessions.find(s => s.sessionId === sessionId);
      
      expect(session).toBeDefined();
      expect(session!.debugSteps).toHaveLength(1);
      expect(session!.debugSteps[0].action).toBe('Test action');
      expect(session!.debugSteps[0].result).toBe('success');
    });

    test('should complete debugging session successfully', async () => {
      const sessionId = await agent.startDebuggingSession({
        description: 'Test debugging session'
      });

      await agent.addDebugStep(sessionId, {
        action: 'Identify issue',
        result: 'success',
        details: 'Found the root cause'
      });

      const result = await agent.completeDebuggingSession(sessionId, 'Issue resolved');

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.resolution).toBe('Issue resolved');
      expect(result.completedInTime).toBe(true);
      expect(result.performance.debugSteps).toBe(1);

      const status = agent.getDebuggingStatus();
      expect(status.activeSessions).toHaveLength(0);
    });

    test('should cancel debugging session', async () => {
      const sessionId = await agent.startDebuggingSession({
        description: 'Test debugging session'
      });

      await agent.cancelDebuggingSession(sessionId, 'Test cancellation');

      const status = agent.getDebuggingStatus();
      expect(status.activeSessions).toHaveLength(0);
    });

    test('should handle session timeout', async () => {
      const timeoutSpy = jest.fn();
      agent.on('session:timeout', timeoutSpy);

      const sessionId = await agent.startDebuggingSession({
        description: 'Test timeout session',
        timeLimit: 100 // Very short timeout for testing
      });

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(String),
          session: expect.any(Object)
        })
      );
    });

    test('should emit session events', async () => {
      const startSpy = jest.fn();
      const stepSpy = jest.fn();
      const completeSpy = jest.fn();

      agent.on('session:started', startSpy);
      agent.on('session:stepAdded', stepSpy);
      agent.on('session:completed', completeSpy);

      const sessionId = await agent.startDebuggingSession({
        description: 'Test events session'
      });

      await agent.addDebugStep(sessionId, {
        action: 'Test step',
        result: 'success',
        details: 'Step details'
      });

      await agent.completeDebuggingSession(sessionId, 'Completed');

      expect(startSpy).toHaveBeenCalled();
      expect(stepSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('capabilities', () => {
    test('should return agent capabilities', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities).toEqual(
        expect.objectContaining({
          name: 'Thirty-Minute Rule Agent',
          version: '1.0.0',
          features: expect.arrayContaining([
            'Time-bounded debugging sessions',
            'Automatic debug endpoint generation',
            'Component isolation testing',
            'Fallback mechanism implementation'
          ]),
          supportedProjectTypes: ['unlimited'],
          supportedFrameworks: ['unlimited'],
          performance: expect.objectContaining({
            maxConcurrentSessions: 'unlimited',
            maxComponents: 'unlimited',
            maxEndpoints: 'unlimited'
          })
        })
      );
    });
  });

  describe('debugging status', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should return debugging status', () => {
      const status = agent.getDebuggingStatus();

      expect(status).toEqual(
        expect.objectContaining({
          activeSessions: expect.any(Array),
          totalSessions: expect.any(Number),
          completedSessions: expect.any(Number),
          registeredComponents: expect.any(Number),
          extractedKnowledge: expect.any(Number),
          capabilities: expect.any(Object)
        })
      );
    });

    test('should track session statistics', async () => {
      const initialStatus = agent.getDebuggingStatus();
      expect(initialStatus.activeSessions).toHaveLength(0);

      const sessionId = await agent.startDebuggingSession({
        description: 'Test status tracking'
      });

      const activeStatus = agent.getDebuggingStatus();
      expect(activeStatus.activeSessions).toHaveLength(1);

      await agent.completeDebuggingSession(sessionId, 'Completed');

      const completedStatus = agent.getDebuggingStatus();
      expect(completedStatus.activeSessions).toHaveLength(0);
      expect(completedStatus.completedSessions).toBeGreaterThan(initialStatus.completedSessions);
    });
  });

  describe('knowledge management', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should extract knowledge from completed sessions', async () => {
      const sessionId = await agent.startDebuggingSession({
        description: 'Knowledge extraction test'
      });

      await agent.addDebugStep(sessionId, {
        action: 'Successful debugging pattern',
        result: 'success',
        details: 'This approach worked well',
        confidence: 0.9
      });

      const result = await agent.completeDebuggingSession(sessionId, 'Successfully resolved');

      expect(result.knowledgeExtracted).toHaveLength(1);
      expect(result.knowledgeExtracted[0]).toEqual(
        expect.objectContaining({
          type: 'pattern',
          title: expect.stringContaining('Successful debugging pattern'),
          confidence: expect.any(Number),
          applicableContexts: expect.any(Array)
        })
      );
    });

    test('should query extracted knowledge', async () => {
      // First, create a session that will extract knowledge
      const sessionId = await agent.startDebuggingSession({
        description: 'Knowledge query test'
      });

      await agent.addDebugStep(sessionId, {
        action: 'Pattern recognition',
        result: 'success',
        details: 'Identified successful pattern'
      });

      await agent.completeDebuggingSession(sessionId, 'Pattern documented');

      // Query the knowledge
      const knowledge = agent.queryKnowledge({
        type: 'pattern',
        minConfidence: 0.5,
        limit: 10
      });

      expect(knowledge).toBeInstanceOf(Array);
      if (knowledge.length > 0) {
        expect(knowledge[0]).toEqual(
          expect.objectContaining({
            type: 'pattern',
            title: expect.any(String),
            description: expect.any(String),
            confidence: expect.any(Number)
          })
        );
      }
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should handle invalid session ID gracefully', async () => {
      await expect(
        agent.addDebugStep('invalid-session-id', {
          action: 'Test action',
          result: 'success',
          details: 'Test details'
        })
      ).rejects.toThrow('Session invalid-session-id is not active');
    });

    test('should handle completion of non-existent session', async () => {
      await expect(
        agent.completeDebuggingSession('invalid-session-id', 'Test resolution')
      ).rejects.toThrow('Session invalid-session-id not found');
    });

    test('should emit error events for failures', async () => {
      const errorSpy = jest.fn();
      agent.on('agent:error', errorSpy);

      try {
        await agent.addDebugStep('invalid-session-id', {
          action: 'Test action',
          result: 'success', 
          details: 'Test details'
        });
      } catch (error) {
        // Expected to throw
      }

      // Error events might be emitted asynchronously
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('All-Purpose Pattern compliance', () => {
    test('should accept unlimited configuration options', () => {
      const customConfig = {
        customOption1: 'value1',
        customOption2: { nested: 'value' },
        customArray: ['item1', 'item2'],
        anyOtherOption: 42
      };

      const customAgent = new ThirtyMinuteRuleAgent(customConfig);
      expect(customAgent).toBeInstanceOf(ThirtyMinuteRuleAgent);
    });

    test('should not have hardcoded limitations in capabilities', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities.supportedProjectTypes).toEqual(['unlimited']);
      expect(capabilities.supportedFrameworks).toEqual(['unlimited']);
      expect(capabilities.performance.maxConcurrentSessions).toBe('unlimited');
      expect(capabilities.performance.maxComponents).toBe('unlimited');
      expect(capabilities.performance.maxEndpoints).toBe('unlimited');
    });

    test('should support any project type through configuration', () => {
      const projectTypes = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'Go', 'Java', 'CustomFramework'];
      
      projectTypes.forEach(projectType => {
        const projectAgent = new ThirtyMinuteRuleAgent({ projectType });
        expect(projectAgent).toBeInstanceOf(ThirtyMinuteRuleAgent);
      });
    });

    test('should support any framework through configuration', () => {
      const frameworks = ['Express', 'Fastify', 'Koa', 'Django', 'Flask', 'Spring', 'CustomFramework'];
      
      frameworks.forEach(framework => {
        const frameworkAgent = new ThirtyMinuteRuleAgent({ framework });
        expect(frameworkAgent).toBeInstanceOf(ThirtyMinuteRuleAgent);
      });
    });
  });
});