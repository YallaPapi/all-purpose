/**
 * Tests for Input Parser
 * Following current Jest best practices for Node.js testing
 */

const {
  parseInput,
  validateInput,
  normalizeAgentName,
  extractAgentName,
  validateAgentName
} = require('../lib/inputParser');

describe('Input Parser', () => {
  describe('validateInput', () => {
    test('validates valid input successfully', () => {
      const validInput = {
        tasks: [
          {
            title: 'Test Task',
            description: 'Test description'
          }
        ],
        metadata: {
          projectName: 'Test Agent'
        }
      };

      expect(() => validateInput(validInput)).not.toThrow();
      expect(validateInput(validInput)).toBe(true);
    });

    test('throws error for missing tasks array', () => {
      const invalidInput = {
        metadata: { projectName: 'Test' }
      };

      expect(() => validateInput(invalidInput)).toThrow('missing required field "tasks"');
    });

    test('throws error for missing metadata', () => {
      const invalidInput = {
        tasks: []
      };

      expect(() => validateInput(invalidInput)).toThrow('missing required field "metadata"');
    });

    test('throws error for invalid task structure', () => {
      const invalidInput = {
        tasks: [
          { title: 'Valid Task', description: 'Valid' },
          { title: 'Missing Description' } // Missing description
        ],
        metadata: { projectName: 'Test' }
      };

      expect(() => validateInput(invalidInput)).toThrow('task at index 1 missing required field "description"');
    });
  });

  describe('normalizeAgentName', () => {
    test('converts spaces to hyphens', () => {
      expect(normalizeAgentName('Test Agent Name')).toBe('test-agent-name');
    });

    test('removes special characters', () => {
      expect(normalizeAgentName('Test@#$Agent!')).toBe('testagent');
    });

    test('converts to lowercase', () => {
      expect(normalizeAgentName('TestAgentName')).toBe('testagentname');
    });

    test('collapses multiple hyphens', () => {
      expect(normalizeAgentName('test---agent')).toBe('test-agent');
    });

    test('removes leading and trailing hyphens', () => {
      expect(normalizeAgentName('-test-agent-')).toBe('test-agent');
    });

    test('limits length to 50 characters', () => {
      const longName = 'a'.repeat(60);
      expect(normalizeAgentName(longName).length).toBe(50);
    });

    test('throws error for non-string input', () => {
      expect(() => normalizeAgentName(null)).toThrow('Agent name must be a string');
      expect(() => normalizeAgentName(123)).toThrow('Agent name must be a string');
    });
  });

  describe('extractAgentName', () => {
    test('removes PRD prefix', () => {
      expect(extractAgentName({ projectName: 'PRD: Test Agent' })).toBe('Test');
      expect(extractAgentName({ projectName: 'PRD Test Agent' })).toBe('Test');
    });

    test('removes Agent suffix', () => {
      expect(extractAgentName({ projectName: 'Test Agent' })).toBe('Test');
      expect(extractAgentName({ projectName: 'Test Service' })).toBe('Test');
    });

    test('handles mixed case prefixes and suffixes', () => {
      expect(extractAgentName({ projectName: 'prd: Test AGENT' })).toBe('Test');
    });

    test('returns original name if no patterns match', () => {
      expect(extractAgentName({ projectName: 'TestGenerator' })).toBe('TestGenerator');
    });
  });

  describe('validateAgentName', () => {
    test('validates correct agent name', () => {
      const result = validateAgentName('test-agent');
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('detects name too short', () => {
      const result = validateAgentName('a');
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('too short');
      expect(result.suggestions[0]).toContain('a-agent');
    });

    test('detects name too long', () => {
      const longName = 'a'.repeat(60);
      const result = validateAgentName(longName);
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('too long');
    });

    test('detects invalid characters', () => {
      const result = validateAgentName('test@agent');
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('lowercase letters, numbers, and hyphens');
    });

    test('detects consecutive hyphens', () => {
      const result = validateAgentName('test--agent');
      expect(result.isValid).toBe(false);
      expect(result.issues[0]).toContain('consecutive hyphens');
    });
  });

  describe('parseInput', () => {
    test('parses valid PRD-Parser output', () => {
      const input = {
        tasks: [
          {
            id: 1,
            title: 'Setup Project',
            description: 'Initialize project structure',
            details: 'Create directories and files',
            priority: 'high'
          },
          {
            id: 2,
            title: 'Implement Core',
            description: 'Build main functionality'
          }
        ],
        metadata: {
          projectName: 'PRD: Test Agent',
          totalTasks: 2,
          sourceFile: 'test.md',
          generatedAt: '2023-06-14'
        }
      };

      const result = parseInput(input);

      expect(result.agentName).toBe('Test');
      expect(result.normalizedAgentName).toBe('test');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].id).toBe(1);
      expect(result.tasks[0].title).toBe('Setup Project');
      expect(result.tasks[1].priority).toBe('medium'); // Default value
      expect(result.metadata.totalTasks).toBe(2);
      expect(result.metadata.parsedAt).toBeDefined();
    });

    test('generates description from agent name if missing', () => {
      const input = {
        tasks: [{ title: 'Test', description: 'Test task' }],
        metadata: { projectName: 'TestAgent' }
      };

      const result = parseInput(input);
      expect(result.description).toBe('Agent for testagent functionality');
    });

    test('processes task dependencies correctly', () => {
      const input = {
        tasks: [
          {
            title: 'Task 1',
            description: 'First task',
            dependencies: [2, 3]
          }
        ],
        metadata: { projectName: 'Test' }
      };

      const result = parseInput(input);
      expect(result.tasks[0].dependencies).toEqual([2, 3]);
    });

    test('handles missing optional task fields', () => {
      const input = {
        tasks: [
          {
            title: 'Minimal Task',
            description: 'Just title and description'
          }
        ],
        metadata: { projectName: 'Test' }
      };

      const result = parseInput(input);
      const task = result.tasks[0];
      expect(task.details).toBe('');
      expect(task.testStrategy).toBe('');
      expect(task.priority).toBe('medium');
      expect(task.dependencies).toEqual([]);
      expect(task.status).toBe('pending');
    });

    test('throws error for invalid input', () => {
      const invalidInput = {
        tasks: [],
        // Missing metadata
      };

      expect(() => parseInput(invalidInput)).toThrow('missing required field "metadata"');
    });
  });
});