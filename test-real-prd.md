# Simple Task Management API

## Requirements
Build a REST API for task management with the following features:

### Backend API
- POST /api/tasks - Create new task
- GET /api/tasks - List all tasks  
- GET /api/tasks/:id - Get specific task
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task

### Task Model
- id: unique identifier
- title: task title (required)
- description: task description
- status: pending, in-progress, completed
- createdAt: timestamp
- updatedAt: timestamp

### Technical Requirements
- Node.js with Express framework
- SQLite database for persistence
- Input validation and error handling
- API documentation with examples
- Unit tests for all endpoints