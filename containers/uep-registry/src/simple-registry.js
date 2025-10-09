const express = require('express');
const app = express();

app.use(express.json());

const registry = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'uep-registry' });
});

// Register service
app.post('/register', (req, res) => {
  const { service, endpoint, metadata } = req.body;
  registry.set(service, { endpoint, metadata, registered: new Date() });
  res.json({ 
    success: true, 
    service, 
    message: 'Service registered successfully' 
  });
});

// List services
app.get('/services', (req, res) => {
  const services = Array.from(registry.entries()).map(([name, data]) => ({
    name,
    ...data
  }));
  res.json({ services });
});

// Get service
app.get('/services/:name', (req, res) => {
  const { name } = req.params;
  const service = registry.get(name);
  if (service) {
    res.json({ name, ...service });
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`UEP Registry running on port ${PORT}`);
});