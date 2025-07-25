# PRD: YouTube Tutorial GitHub Repo Cross-Reference System

## Product Overview
Build a comprehensive system that scrapes YouTube for Claude Code tutorials, extracts transcripts, and cross-references with GitHub repositories using semantic search to help developers discover relevant code examples.

## Core Objectives
1. **YouTube Data Collection**: Scrape YouTube tutorials related to Claude Code and development
2. **Transcript Processing**: Extract and process video transcripts for semantic analysis  
3. **GitHub Integration**: Index and analyze relevant GitHub repositories
4. **Semantic Cross-Reference**: Connect tutorial content with code examples
5. **Web Interface**: Provide searchable interface for exploration

## Technical Requirements

### Framework & Infrastructure
- **Frontend**: Next.js 15+ with TypeScript
- **Database**: Upstash Vector for embeddings + Redis for caching
- **APIs**: YouTube Data API v3, GitHub API v4 (GraphQL)
- **Deployment**: Vercel with serverless functions
- **Search**: Semantic search using OpenAI embeddings

### Core Features

#### 1. YouTube Tutorial Scraper
- Search YouTube API for Claude Code related content
- Extract video metadata (title, description, duration, views)
- Download and process video transcripts using YouTube Transcript API
- Store processed data with semantic embeddings
- Real-time data updates with configurable intervals

#### 2. GitHub Repository Analyzer
- Search GitHub for repositories matching tutorial topics
- Extract README content, code samples, and documentation
- Index repository metadata (stars, forks, language, updated date)
- Generate semantic embeddings for code content
- Cross-reference with tutorial content

#### 3. Semantic Search Engine
- Generate embeddings for all text content using OpenAI
- Store embeddings in Upstash Vector database
- Implement similarity search between tutorials and repositories
- Provide relevance scoring and ranking
- Support complex queries and filtering

#### 4. Web Interface
- Search interface with filters (language, topic, difficulty)
- Tutorial player with synchronized code examples
- Repository browser with highlighted relevant sections
- Bookmark and favorites system
- Export functionality for discovered resources

#### 5. API Endpoints
- `/api/youtube/search` - Search YouTube content
- `/api/github/repos` - Repository data
- `/api/search` - Combined semantic search
- `/api/cross-reference` - Link tutorials to repositories
- `/api/analytics` - Usage statistics

### Data Models

#### Tutorial Model
```typescript
interface Tutorial {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  transcript: string;
  duration: number;
  publishedAt: Date;
  channelId: string;
  channelName: string;
  viewCount: number;
  embeddings: number[];
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
```

#### Repository Model  
```typescript
interface Repository {
  id: string;
  githubId: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  starCount: number;
  forkCount: number;
  updatedAt: Date;
  readmeContent: string;
  codeExamples: CodeExample[];
  embeddings: number[];
  topics: string[];
}
```

#### Cross-Reference Model
```typescript
interface CrossReference {
  id: string;
  tutorialId: string;
  repositoryId: string;
  relevanceScore: number;
  matchingTopics: string[];
  codeSnippets: string[];
  timestamp: Date;
}
```

### Performance Requirements
- **Response Time**: < 2s for search queries
- **Data Freshness**: Update YouTube content daily, GitHub weekly
- **Scalability**: Support 10,000+ tutorials and 50,000+ repositories
- **Availability**: 99.9% uptime target
- **Rate Limits**: Respect YouTube (10,000 req/day) and GitHub (5,000 req/hour) limits

### Security & Compliance
- API key rotation and secure storage
- HTTPS only communication
- Input validation and sanitization
- Data retention policy (30 days for temporary data)
- User privacy protection (no personal data storage)

### Integration Points
- **TaskMaster**: For project management and task tracking
- **Context7**: For up-to-date documentation and API patterns
- **Meta-Agent Coordination**: Interface with other agents
- **RAG System**: Knowledge base integration
- **Observability**: Monitoring and logging

## Acceptance Criteria

### Must Have
1. ✅ Successfully scrape YouTube tutorials with transcripts
2. ✅ Index GitHub repositories with semantic search
3. ✅ Provide cross-reference matching with relevance scores
4. ✅ Responsive web interface for search and exploration
5. ✅ API endpoints for programmatic access
6. ✅ Real-time data updates and caching

### Should Have
1. Advanced filtering and sorting options
2. Tutorial recommendation engine
3. Code snippet extraction and highlighting
4. Analytics dashboard for usage insights
5. Export functionality (JSON, CSV)
6. Integration with development tools

### Could Have
1. Video annotation and bookmarking
2. Community features (ratings, comments)
3. Machine learning for content categorization
4. Mobile app development
5. Third-party integrations (Slack, Discord)
6. Advanced analytics and insights

## Development Phases

### Phase 1: Foundation (Week 1)
- Set up Next.js project structure
- Configure Upstash Vector and Redis
- Implement basic YouTube API integration
- Create database schemas and models

### Phase 2: Core Features (Week 2)
- Build YouTube scraper and transcript processor
- Implement GitHub repository analyzer
- Develop semantic search functionality
- Create basic web interface

### Phase 3: Enhancement (Week 3)
- Add cross-reference matching algorithm
- Implement advanced search filters
- Build analytics and monitoring
- Performance optimization

### Phase 4: Production (Week 4)
- Comprehensive testing and bug fixes
- Documentation and deployment guides
- Production deployment on Vercel
- Monitoring and observability setup

## Success Metrics
- **Content Coverage**: Index 1,000+ relevant tutorials
- **Repository Coverage**: 5,000+ GitHub repositories
- **Search Accuracy**: 85%+ relevance score
- **User Engagement**: 70%+ query success rate
- **Performance**: 95% of queries under 2s response time

## Risk Mitigation
- **API Rate Limits**: Implement intelligent caching and batching
- **Data Quality**: Validation and cleaning pipelines
- **Performance**: CDN, caching, and optimization strategies
- **Compliance**: Regular security audits and updates
- **Scalability**: Horizontal scaling and load balancing

## Stakeholders
- **Development Team**: Implementation and maintenance
- **Content Creators**: YouTube tutorial creators
- **Developer Community**: End users and feedback providers
- **Product Owner**: Requirements and acceptance criteria