require('dotenv').config();
const { createContextAPI } = require('./rag-system/dist/api/contextAPI');
const fs = require('fs');

async function updateRAGWithNewDocs() {
  console.log('🔄 Updating RAG system with latest documentation...');
  
  const contextAPI = createContextAPI();
  
  // Read updated documentation files
  console.log('📝 Adding updated SYSTEM_DOCUMENTATION.md to RAG...');
  const systemDoc = fs.readFileSync('./SYSTEM_DOCUMENTATION.md', 'utf-8');
  await contextAPI.addContext(systemDoc, 'SYSTEM_DOCUMENTATION.md');
  
  console.log('📝 Adding updated COMPREHENSIVE_PROJECT_STATUS.md to RAG...');
  const statusDoc = fs.readFileSync('./COMPREHENSIVE_PROJECT_STATUS.md', 'utf-8');
  await contextAPI.addContext(statusDoc, 'COMPREHENSIVE_PROJECT_STATUS.md');
  
  console.log('📝 Adding Meta-Agent Factory visual progress info...');
  const metaAgentFactoryInfo = `# Meta-Agent Factory Visual Progress System

## Overview
The Meta-Agent Factory now includes a visual progress interface at /meta-agent-factory that allows users to:
- Submit work requests via an intuitive form
- Watch real-time ASCII art visualizations of the build process
- Track progress with Server-Sent Events (SSE) streaming
- See emoji-based operation indicators and architecture diagrams

## Features
- 6 work types: scaffold, fix-patterns, generate-docs, create-templates, integrate-systems, debug-system
- Real-time visual feedback with ASCII art project structures
- JWT authentication flow diagrams
- Test result displays with coverage percentages
- Production deployment visualization

## API Endpoints
- POST /api/meta-agent-factory - Submit work requests
- GET /api/meta-agent-factory/progress/[requestId]?format=sse - SSE progress stream
- GET /api/meta-agent-factory/status/[requestId] - Status polling

## 10 Meta-Agents
The system now includes 10 specialized meta-agents:
1. All-Purpose Pattern Agent
2. Five-Document Framework Agent
3. Infrastructure Orchestrator Agent
4. Parameter Flow Agent
5. PRD-Parser Agent
6. Scaffold Generator Agent
7. Template Engine Factory Agent
8. Thirty-Minute Rule Agent
9. Vercel-Native Architecture Agent (NEW)
10. Research and Development Agent (integrated)
`;
  await contextAPI.addContext(metaAgentFactoryInfo, 'meta-agent-factory-visual-progress.md');
  
  console.log('✅ RAG system successfully updated with latest documentation changes');
}

updateRAGWithNewDocs().catch(console.error);