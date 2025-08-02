// Check backend agent export
async function check() {
  const module = await import('./src/meta-agents/backend-agent/dist/core/BackendAgent.js');
  console.log('Module keys:', Object.keys(module));
  console.log('Default:', module.default);
  console.log('Type of default:', typeof module.default);
  
  if (module.BackendAgent) {
    console.log('Has BackendAgent export');
    console.log('Type:', typeof module.BackendAgent);
  }
}

check();