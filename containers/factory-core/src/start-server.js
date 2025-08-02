// Simple wrapper to start the factory server with real agents
import('./factory-core.ts').then(module => {
  console.log('Factory server starting...');
}).catch(err => {
  console.error('Failed to start factory server:', err);
  process.exit(1);
});