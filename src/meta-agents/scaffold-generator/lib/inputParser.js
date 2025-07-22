/**
 * Input Parser for PRD-Parser Output
 * 
 * Validates and normalizes input from the PRD-Parser for scaffold generation.
 * Following current best practices for input validation and normalization.
 */

const path = require('path');

/**
 * Validates the structure of PRD-Parser input
 * @param {Object} input - The input object from PRD-Parser
 * @returns {boolean} - True if valid
 * @throws {Error} - If input is invalid
 */
function validateInput(input) {
  // Check for required top-level fields
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input: input must be an object');
  }

  // Check for tasks array
  if (!input.tasks || !Array.isArray(input.tasks)) {
    throw new Error('Invalid input: missing required field "tasks" (must be an array)');
  }

  // Check for metadata
  if (!input.metadata || typeof input.metadata !== 'object') {
    throw new Error('Invalid input: missing required field "metadata" (must be an object)');
  }

  // Validate metadata structure
  if (!input.metadata.projectName || typeof input.metadata.projectName !== 'string') {
    throw new Error('Invalid input: metadata.projectName is required and must be a string');
  }

  // Validate task structure
  input.tasks.forEach((task, index) => {
    if (!task || typeof task !== 'object') {
      throw new Error(`Invalid input: task at index ${index} must be an object`);
    }
    
    if (!task.title || typeof task.title !== 'string') {
      throw new Error(`Invalid input: task at index ${index} missing required field "title"`);
    }
    
    if (!task.description || typeof task.description !== 'string') {
      throw new Error(`Invalid input: task at index ${index} missing required field "description"`);
    }
  });

  return true;
}

/**
 * Normalizes agent name for directory creation
 * @param {string} name - The original agent name
 * @returns {string} - Normalized name suitable for file system
 */
function normalizeAgentName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Agent name must be a string');
  }

  return name
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '')     // Remove special characters
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-|-$/g, '')          // Remove leading/trailing hyphens
    .substring(0, 50);              // Limit length
}

/**
 * Extracts agent name from project name or metadata
 * @param {Object} metadata - Metadata from PRD-Parser
 * @returns {string} - Extracted agent name
 */
function extractAgentName(metadata) {
  // Try to extract from project name first
  let agentName = metadata.projectName;

  // Remove common prefixes and suffixes
  agentName = agentName
    .replace(/^(PRD:?\s*)/i, '')      // Remove "PRD:" prefix
    .replace(/\s+(Agent|Service)$/i, ''); // Remove "Agent" or "Service" suffix

  return agentName.trim();
}

/**
 * Parses and validates input from PRD-Parser
 * @param {Object} input - The PRD-Parser output
 * @returns {Object} - Parsed and normalized data
 */
function parseInput(input) {
  // Validate input structure
  validateInput(input);

  // Extract and normalize agent name
  const rawAgentName = extractAgentName(input.metadata);
  const agentName = rawAgentName;
  const normalizedAgentName = normalizeAgentName(rawAgentName);

  // Validate normalized name
  if (!normalizedAgentName) {
    throw new Error(`Unable to generate valid agent name from: "${rawAgentName}"`);
  }

  // Extract description from metadata or first task
  let description = input.metadata.description || '';
  if (!description && input.tasks.length > 0) {
    description = `Agent for ${agentName.toLowerCase()} functionality`;
  }

  // Process tasks
  const processedTasks = input.tasks.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    details: task.details || '',
    testStrategy: task.testStrategy || '',
    priority: task.priority || 'medium',
    dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
    status: task.status || 'pending'
  }));

  return {
    agentName,
    normalizedAgentName,
    description,
    tasks: processedTasks,
    metadata: {
      ...input.metadata,
      parsedAt: new Date().toISOString(),
      totalTasks: processedTasks.length
    }
  };
}

/**
 * Validates that the agent name follows naming conventions
 * @param {string} name - The normalized agent name
 * @returns {Object} - Validation result with isValid and suggestions
 */
function validateAgentName(name) {
  const issues = [];
  const suggestions = [];

  // Check minimum length
  if (name.length < 2) {
    issues.push('Agent name is too short (minimum 2 characters)');
    suggestions.push(`Consider: "${name}-agent"`);
  }

  // Check maximum length
  if (name.length > 50) {
    issues.push('Agent name is too long (maximum 50 characters)');
    suggestions.push(`Consider abbreviating: "${name.substring(0, 47)}..."`);
  }

  // Check for valid characters
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    issues.push('Agent name must start with a letter and contain only lowercase letters, numbers, and hyphens');
    const suggested = name.replace(/^[^a-z]*/, '').replace(/[^a-z0-9-]/g, '-');
    if (suggested) {
      suggestions.push(`Consider: "${suggested}"`);
    }
  }

  // Check for consecutive hyphens
  if (/-{2,}/.test(name)) {
    issues.push('Agent name should not contain consecutive hyphens');
    suggestions.push(`Consider: "${name.replace(/-+/g, '-')}"`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

module.exports = {
  parseInput,
  validateInput,
  normalizeAgentName,
  extractAgentName,
  validateAgentName
};