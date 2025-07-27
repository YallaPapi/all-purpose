/**
 * Tests for documentation-consolidation-agent Agent
 */

const { Documentation-Consolidation-AgentAgent, main } = require('../main');

describe('Documentation-Consolidation-AgentAgent', () => {
  let agent;

  beforeEach(() => {
    agent = new Documentation-Consolidation-AgentAgent({
      logLevel: 'error' // Suppress logs during tests
    });
  });

  afterEach(async () => {
    if (agent && agent.isInitialized) {
      await agent.cleanup();
    }
  });

  describe('constructor', () => {
    test('creates agent with default config', () => {
      expect(agent.config.logLevel).toBe('error');
      expect(agent.config.timeout).toBe(30000);
      expect(agent.isInitialized).toBe(false);
    });

    test('creates agent with custom config', () => {
      const customAgent = new Documentation-Consolidation-AgentAgent({
        logLevel: 'debug',
        timeout: 60000
      });
      
      expect(customAgent.config.logLevel).toBe('debug');
      expect(customAgent.config.timeout).toBe(60000);
    });
  });

  describe('initialize', () => {
    test('initializes successfully', async () => {
      await agent.initialize();
      expect(agent.isInitialized).toBe(true);
    });
  });

  describe('process', () => {
    test('throws error if not initialized', async () => {
      await expect(agent.process({})).rejects.toThrow('Agent not initialized');
    });

    test('processes input successfully', async () => {
      await agent.initialize();
      
      const input = { test: 'data' };
      const result = await agent.process(input);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
      expect(result.processedAt).toBeDefined();
    });
  });

  describe('getStatus', () => {
    test('returns correct status', () => {
      const status = agent.getStatus();
      
      expect(status.name).toBe('documentation-consolidation-agent');
      expect(status.initialized).toBe(false);
      expect(status.config).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });
  });

  describe('cleanup', () => {
    test('cleans up successfully', async () => {
      await agent.initialize();
      await agent.cleanup();
      expect(agent.isInitialized).toBe(false);
    });
  });
});

describe('main function', () => {
  test('executes successfully with input', async () => {
    const input = { test: 'data' };
    const result = await main({ input, logLevel: 'error' });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(input);
  });

  test('handles errors gracefully', async () => {
    // Test with invalid config that might cause issues
    await expect(main({ 
      input: null, 
      logLevel: 'error',
      timeout: -1 
    })).rejects.toThrow();
  });
});
