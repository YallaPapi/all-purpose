const express = require('express');
const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'domain-agents' });
});

// List available domain agents
app.get('/agents', (req, res) => {
  res.json({
    agents: [
      { name: 'backend-agent', status: 'ready' },
      { name: 'frontend-agent', status: 'ready' },
      { name: 'devops-agent', status: 'ready' },
      { name: 'qa-agent', status: 'ready' },
      { name: 'documentation-agent', status: 'ready' }
    ]
  });
});

// Execute agent task
app.post('/agents/:name/execute', (req, res) => {
  const { name } = req.params;
  const { task } = req.body;
  
  res.json({
    agent: name,
    task: task,
    status: 'completed',
    result: `${name} completed task: ${task.type}`
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Domain agents service running on port ${PORT}`);
});