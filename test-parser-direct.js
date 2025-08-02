import Parser from './src/meta-agents/prd-parser/parser.js';

const prd = {
  projectName: "Task Management API",
  overview: "Build a RESTful API for task management with authentication",
  requirements: [
    { id: "REQ-001", description: "User authentication with JWT", priority: "high", type: "functional" },
    { id: "REQ-002", description: "CRUD operations for tasks", priority: "high", type: "functional" },
    { id: "REQ-003", description: "Task categories", priority: "medium", type: "functional" },
    { id: "REQ-004", description: "Task assignment to users", priority: "medium", type: "functional" },
    { id: "REQ-005", description: "Task comments", priority: "low", type: "functional" }
  ],
  technicalRequirements: {
    framework: "express",
    database: "mongodb",
    authentication: "jwt",
    apiStyle: "rest"
  }
};

const parser = new Parser();
console.log('Parser:', parser);

// Convert PRD to markdown format that parser expects
const prdMarkdown = `# Task Management API

## Overview
Build a RESTful API for task management with authentication

## Requirements
- Must have user authentication with JWT (REQ-001)
- Must support CRUD operations for tasks (REQ-002)
- Should have task categories (REQ-003)
- Should support task assignment to users (REQ-004)
- Could have task comments (REQ-005)

## Technical Requirements
- Framework: Express
- Database: MongoDB
- Authentication: JWT
- API Style: REST
`;

const parsed = await parser.parse(prdMarkdown);
console.log('Parsed result:', JSON.stringify(parsed, null, 2));