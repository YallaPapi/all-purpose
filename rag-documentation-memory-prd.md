# RAG Documentation Memory System - PRD

## Project Overview
Implement a Retrieval Augmented Generation (RAG) system with vector database to provide persistent context awareness for AI agents working on the all-purpose project. This system will eliminate the need to re-explain project context, TaskMaster usage, and documentation at the start of each session.

## Problem Statement
AI agents currently lose all context between sessions, requiring extensive re-explanation of:
- How to use TaskMaster CLI commands properly
- Project structure and file locations
- Meta-agent architecture and relationships
- All-Purpose Pattern principles and implementation details
- Documentation scattered across multiple directories

This wastes significant time at the beginning of every session and leads to repeated mistakes.

## Solution
Build a comprehensive RAG system that:
1. **Indexes all project documentation** into a searchable vector database
2. **Provides persistent memory** across AI sessions
3. **Enables semantic search** of project knowledge
4. **Integrates with existing workflow** transparently
5. **Updates dynamically** as documentation evolves

## Technical Requirements

### 1. Vector Database Setup
- **Primary Choice**: Qdrant (open-source, high-performance, supports payload filtering)
- **Alternative**: Weaviate (hybrid search, good for mixed content)
- **Local Development**: Chroma (lightweight for testing)
- **Metadata Support**: File paths, timestamps, content type, project context

### 2. Embedding Model
- **Primary**: OpenAI text-embedding-3-large (high quality, widely supported)
- **Code-Specific**: CodeBERT or StarCoder for AST/code documentation
- **Fallback**: Sentence Transformers all-MiniLM-L6-v2 (open-source)

### 3. Document Sources to Index
- All `.md` files in `docs-consolidated/`
- All `.mdc` files in `.cursor/rules/`
- TaskMaster documentation and usage guides
- PRD files and project specifications
- Code comments and documentation in meta-agents
- Task lists and project structure files
- Configuration files and setup instructions

### 4. Memory Architecture
- **Short-term Memory**: Recent conversation history (in-memory)
- **Long-term Memory**: Persistent documentation embeddings (vector DB)
- **Session Context**: Current project state and active tasks
- **Historical Context**: Previous sessions and decisions

### 5. Integration Points
- **TaskMaster Integration**: Auto-query before using TaskMaster commands
- **Meta-Agent Factory**: Provide context to PRD-Parser, Scaffold-Generator, All-Purpose Pattern Agent
- **Development Workflow**: Seamless context injection during coding tasks
- **Documentation Updates**: Auto-reindex when files change

## Implementation Plan

### Phase 1: Core RAG Infrastructure
1. **Setup Qdrant Vector Database**
   - Docker container for local development
   - Configure collections and indexing
   - Test basic embedding storage/retrieval

2. **Document Processing Pipeline**
   - File discovery and chunking logic
   - Metadata extraction and tagging
   - Embedding generation and storage
   - Incremental update mechanism

3. **Basic Retrieval System**
   - Semantic search API
   - Context ranking and filtering
   - Query expansion and refinement

### Phase 2: Memory Integration
1. **Conversation Memory Store**
   - Session management
   - Context persistence
   - History retrieval

2. **Project Context Awareness**
   - Current task tracking
   - File change detection
   - Dynamic context updates

3. **Smart Context Injection**
   - Automated documentation retrieval
   - Contextual prompt enhancement
   - Relevance scoring

### Phase 3: Workflow Integration
1. **TaskMaster Enhancement**
   - Pre-command context lookup
   - Usage pattern learning
   - Error prevention

2. **Meta-Agent Coordination**
   - Shared knowledge base
   - Cross-agent context sharing
   - Workflow optimization

3. **Development Tools**
   - Documentation queries
   - Code context lookup
   - Decision history

## Technical Stack

### Backend
- **Node.js/TypeScript** for main application
- **Express.js** for API endpoints
- **Qdrant SDK** for vector operations
- **OpenAI SDK** for embeddings

### Vector Database
- **Qdrant** running in Docker
- **Collections**: docs, code, conversations, tasks
- **Metadata**: file_path, content_type, timestamp, project_context

### Processing Pipeline
- **File Watchers** for change detection
- **Text Splitters** for optimal chunking
- **Embedding Cache** for performance
- **Update Queues** for batch processing

## Success Criteria

### Primary Goals
1. **Zero Setup Time**: AI agents have full project context immediately
2. **Accurate Documentation**: 95%+ correct responses about project structure
3. **TaskMaster Mastery**: Zero errors in TaskMaster command usage
4. **Session Continuity**: Perfect context preservation across sessions

### Performance Targets
- **Query Response Time**: < 500ms for documentation lookup
- **Index Update Time**: < 30 seconds for full project reindex
- **Memory Usage**: < 1GB for complete documentation index
- **Accuracy**: > 90% relevant results for project queries

### User Experience
- **Transparent Operation**: No additional commands required
- **Smart Suggestions**: Proactive context awareness
- **Error Prevention**: Warn before incorrect TaskMaster usage
- **Knowledge Discovery**: Surface relevant documentation automatically

## Implementation Timeline

### Week 1: Infrastructure
- Setup Qdrant database
- Implement document processing pipeline
- Create basic embedding system
- Test with sample documentation

### Week 2: Integration
- Build context retrieval API
- Integrate with existing workflows
- Implement memory persistence
- Add TaskMaster awareness

### Week 3: Optimization
- Performance tuning
- Advanced context filtering
- Smart query expansion
- User experience refinement

### Week 4: Production
- Comprehensive testing
- Documentation updates
- Deployment automation
- Monitoring setup

## Technical Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agent      │────│  RAG Service    │────│  Qdrant Vector │
│                 │    │                 │    │     Database   │
│ - Query Context │    │ - Embed Query   │    │ - Store Vectors │
│ - Use Knowledge │    │ - Search Docs   │    │ - Search Index  │
│ - Make Decisions│    │ - Rank Results  │    │ - Filter Meta   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────────────┐               │
         └──────────────│  Memory Store   │───────────────┘
                        │                 │
                        │ - Conversations │
                        │ - Session State │
                        │ - Task History  │
                        └─────────────────┘
```

## File Structure
```
/rag-system/
├── src/
│   ├── embeddings/        # Embedding generation
│   ├── vectordb/          # Qdrant integration
│   ├── memory/            # Conversation persistence
│   ├── processing/        # Document processing
│   ├── api/               # REST API endpoints
│   └── integration/       # Workflow hooks
├── config/
│   ├── qdrant.yml         # Vector DB config
│   ├── embedding.json     # Model settings
│   └── processing.json    # Pipeline config
├── docs/
│   ├── api-reference.md   # API documentation
│   ├── setup-guide.md     # Installation guide
│   └── usage-examples.md  # Integration examples
└── tests/
    ├── unit/              # Unit tests
    ├── integration/       # Integration tests
    └── e2e/               # End-to-end tests
```

## Dependencies
- `@qdrant/js-client-rest` - Vector database client
- `openai` - Embedding generation
- `fs-extra` - File system operations
- `chokidar` - File change watching
- `node-cron` - Scheduled reindexing
- `express` - API server
- `winston` - Logging
- `joi` - Input validation

## Configuration
```json
{
  "vectorDb": {
    "host": "localhost",
    "port": 6333,
    "collections": {
      "documentation": "project_docs",
      "code": "code_snippets", 
      "conversations": "chat_history",
      "tasks": "task_context"
    }
  },
  "embedding": {
    "model": "text-embedding-3-large",
    "dimensions": 3072,
    "chunkSize": 1000,
    "overlap": 200
  },
  "processing": {
    "watchDirectories": [
      "docs-consolidated/",
      ".cursor/rules/",
      ".taskmaster/",
      "src/meta-agents/"
    ],
    "excludePatterns": [
      "node_modules/",
      ".git/",
      "dist/",
      "*.tmp"
    ]
  }
}
```

## Testing Strategy
1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Vector DB operations and embeddings
3. **Performance Tests**: Query speed and memory usage
4. **Accuracy Tests**: Retrieval relevance and ranking
5. **End-to-End Tests**: Full workflow with real documentation

## Monitoring & Observability
- **Query Analytics**: Track search patterns and results
- **Performance Metrics**: Response times and resource usage
- **Accuracy Tracking**: Relevance scoring and user feedback
- **System Health**: Database status and embedding service
- **Usage Patterns**: Most accessed documentation and queries

## Security Considerations
- **API Key Management**: Secure storage of OpenAI keys
- **Access Control**: Limit vector DB access to authorized services
- **Data Privacy**: No sensitive information in embeddings
- **Audit Logging**: Track all queries and system changes

This RAG system will transform how AI agents interact with the project, providing instant access to all documentation and eliminating the frustrating context loss between sessions.