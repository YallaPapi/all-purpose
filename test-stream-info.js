#!/usr/bin/env node

async function checkStreams() {
  try {
    const res = await fetch('http://localhost:8222/jsz?streams=true');
    const data = await res.json();
    
    console.log('=== NATS JetStream Streams ===\n');
    
    if (data.account_details && data.account_details[0]) {
      const streams = data.account_details[0].stream_detail;
      
      streams.forEach(stream => {
        console.log(`Stream: ${stream.name}`);
        console.log(`  State: ${JSON.stringify(stream.state, null, 2)}`);
        console.log();
      });
    }
    
    // Now get stream info via API
    const streamNames = ['META_AGENT_EVENTS', 'META_AGENT_COMMANDS', 'FACTORY_COORDINATION'];
    
    for (const name of streamNames) {
      const streamRes = await fetch(`http://localhost:8222/jsz/account/$G/stream/${name}`);
      if (streamRes.ok) {
        const streamData = await streamRes.json();
        console.log(`\n=== ${name} Configuration ===`);
        console.log(JSON.stringify(streamData.config, null, 2));
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkStreams();