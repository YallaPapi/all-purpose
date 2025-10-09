# Product Requirements Document: Simple Todo API

## Overview
Build a simple REST API for managing todo items with basic CRUD operations.

## Requirements

### Functional Requirements
1. **Create Todo**: POST /api/todos
   - Accept title (required) and description (optional)
   - Return created todo with unique ID

2. **List Todos**: GET /api/todos
   - Return array of all todos
   - Support filtering by completion status

3. **Get Todo**: GET /api/todos/:id
   - Return specific todo by ID
   - Return 404 if not found

4. **Update Todo**: PUT /api/todos/:id
   - Update title, description, or completed status
   - Return updated todo

5. **Delete Todo**: DELETE /api/todos/:id
   - Remove todo from system
   - Return 204 on success

### Technical Requirements
- Use Node.js with Express framework
- Store data in-memory (no database required)
- Include basic error handling
- Add input validation
- Include health check endpoint at /health

### Non-Functional Requirements
- Response time < 100ms for all endpoints
- Support concurrent requests
- Include API documentation
- Add basic logging

## Success Criteria
- All CRUD operations working
- Proper HTTP status codes
- JSON request/response format
- Basic test coverage