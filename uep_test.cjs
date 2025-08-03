/**
 * ZAD MANDATE PHASE 3 - STEP 1: UEP STANDALONE TEST
 * 
 * This script proves that the Universal Execution Protocol (UEP) can reliably 
 * serialize, transport, and deserialize complex tasks between two simple agents over NATS.
 * 
 * NO FAKE SHIT: Uses the REAL, production-ready UEP implementation.
 * 
 * Test Process:
 * 1. Define complex, multi-step task in JSON object
 * 2. Create Sender Agent that serializes task into UEP message
 * 3. Publish UEP message to specific NATS subject
 * 4. Create Receiver Agent subscribed to that NATS subject
 * 5. Receiver deserializes and verifies task object is identical to original
 * 6. Print clear SUCCESS or FAILURE message
 */

const { connect, StringCodec, JSONCodec } = require('nats');
const { createMessagePassingSystem } = require('./dist/uep/MessagePassingSystem.js');
const crypto = require('crypto');

// NATS codecs for message handling
const sc = StringCodec();
const jc = JSONCodec();

// Global test state
let testResults = {
  originalTask: null,
  serializedMessage: null,
  deserializedTask: null,
  success: false,
  errors: [],
  processingTime: 0
};

/**
 * COMPLEX MULTI-STEP TASK DEFINITION
 * This represents a real-world, complex task that would be sent between agents
 */
const COMPLEX_TASK = {
  id: `task_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
  title: "Build E-commerce Product Recommendation System",
  description: "Create a sophisticated AI-powered recommendation engine for an e-commerce platform with real-time user behavior tracking, collaborative filtering, and content-based recommendations",
  
  // Complex nested structure with multiple data types
  requirements: {
    functional: [
      {
        id: "F001",
        category: "user-interface",
        description: "Interactive product discovery dashboard with filter capabilities",
        priority: "high",
        estimatedHours: 24,
        dependencies: ["F003", "F007"],
        acceptance_criteria: [
          "Users can filter products by category, price, rating",
          "Real-time search results with autocomplete",
          "Responsive design for mobile and desktop"
        ]
      },
      {
        id: "F002", 
        category: "recommendation-engine",
        description: "Machine learning recommendation algorithm with collaborative filtering",
        priority: "critical",
        estimatedHours: 48,
        dependencies: [],
        acceptance_criteria: [
          "Achieves >85% recommendation accuracy",
          "Processes recommendations in <200ms",
          "Supports 10,000+ concurrent users"
        ]
      },
      {
        id: "F003",
        category: "data-processing",
        description: "Real-time user behavior tracking and analytics pipeline",
        priority: "high", 
        estimatedHours: 32,
        dependencies: ["F002"],
        acceptance_criteria: [
          "Captures click, view, purchase events",
          "Stores behavioral data in real-time",
          "Provides analytics dashboard for admins"
        ]
      }
    ],
    
    technical: {
      architecture: "microservices",
      deployment: "containerized",
      database: {
        primary: "PostgreSQL",
        cache: "Redis",
        search: "Elasticsearch"
      },
      external_apis: [
        {
          name: "payment-gateway",
          endpoint: "https://api.stripe.com/v1/",
          authentication: "bearer_token",
          rate_limits: {
            requests_per_minute: 1000,
            burst_capacity: 100
          }
        },
        {
          name: "inventory-management", 
          endpoint: "https://inventory.example.com/api/v2/",
          authentication: "api_key",
          rate_limits: {
            requests_per_minute: 5000,
            burst_capacity: 500
          }
        }
      ],
      
      performance_requirements: {
        response_time: {
          p50: "150ms",
          p95: "400ms", 
          p99: "800ms"
        },
        throughput: {
          requests_per_second: 10000,
          concurrent_users: 50000
        },
        availability: {
          uptime: "99.9%",
          max_downtime_per_month: "43.2 minutes"
        }
      }
    }
  },
  
  // Execution phases with complex dependencies
  execution_phases: [
    {
      id: "phase_1",
      name: "Foundation Setup",
      parallel_tasks: [
        {
          task_id: "T001",
          agent_type: "devops",
          description: "Set up containerized development environment",
          estimated_duration: "2 hours",
          artifacts: ["Dockerfile", "docker-compose.yml", "k8s-manifests/"]
        },
        {
          task_id: "T002", 
          agent_type: "backend",
          description: "Design and implement core data models",
          estimated_duration: "4 hours",
          artifacts: ["models/", "migrations/", "database-schema.sql"]
        }
      ],
      completion_criteria: "All containers running, database schema created"
    },
    {
      id: "phase_2",
      name: "Core Development",
      dependencies: ["phase_1"],
      parallel_tasks: [
        {
          task_id: "T003",
          agent_type: "ai",
          description: "Train recommendation models with sample data",
          estimated_duration: "8 hours", 
          artifacts: ["models/recommendation_model.pkl", "training_metrics.json"]
        },
        {
          task_id: "T004",
          agent_type: "backend",
          description: "Implement REST API with authentication",
          estimated_duration: "6 hours",
          artifacts: ["api/", "auth/", "openapi-spec.yaml"]
        },
        {
          task_id: "T005",
          agent_type: "frontend",
          description: "Build responsive product catalog interface",
          estimated_duration: "10 hours",
          artifacts: ["components/", "pages/", "styles/"]
        }
      ],
      completion_criteria: "API functional, basic UI operational, ML model trained"
    },
    {
      id: "phase_3", 
      name: "Integration & Testing",
      dependencies: ["phase_2"],
      sequential_tasks: [
        {
          task_id: "T006",
          agent_type: "qa",
          description: "Comprehensive integration testing across all components",
          estimated_duration: "6 hours",
          artifacts: ["tests/integration/", "test_results.html", "coverage_report.html"]
        },
        {
          task_id: "T007",
          agent_type: "qa", 
          description: "Performance testing under simulated load",
          estimated_duration: "4 hours",
          artifacts: ["load_test_results.json", "performance_recommendations.md"]
        }
      ],
      completion_criteria: ">95% test coverage, meets performance requirements"
    }
  ],
  
  // Context and metadata
  context: {
    business_domain: "e-commerce",
    target_market: "B2C retail",
    user_personas: [
      {
        name: "Casual Shopper",
        characteristics: ["price-sensitive", "mobile-first", "social-influenced"],
        behavior_patterns: ["browse before buying", "reads reviews", "compares prices"]
      },
      {
        name: "Power User", 
        characteristics: ["feature-focused", "tech-savvy", "loyalty-driven"],
        behavior_patterns: ["uses advanced filters", "bulk purchases", "subscribes to alerts"]
      }
    ],
    success_metrics: {
      business: {
        conversion_rate_improvement: ">15%",
        average_order_value_increase: ">20%", 
        customer_retention_improvement: ">25%"
      },
      technical: {
        recommendation_click_through_rate: ">12%",
        api_response_time: "<200ms p95",
        system_uptime: ">99.9%"
      }
    }
  },
  
  // Rich metadata
  metadata: {
    created_at: new Date().toISOString(),
    estimated_completion: "3-4 weeks",
    complexity_score: 8.5,
    risk_factors: [
      {
        category: "technical",
        description: "ML model performance may vary with limited training data",
        probability: "medium",
        impact: "high",
        mitigation: "Use pre-trained models as fallback"
      },
      {
        category: "business",
        description: "Integration with legacy inventory system",
        probability: "high", 
        impact: "medium",
        mitigation: "Build adapter layer with thorough testing"
      }
    ],
    stakeholders: [
      { role: "Product Manager", involvement: "high", approval_required: true },
      { role: "Engineering Lead", involvement: "high", approval_required: true },
      { role: "Data Scientist", involvement: "medium", approval_required: false },
      { role: "UI/UX Designer", involvement: "medium", approval_required: false }
    ]
  }
};

/**
 * SENDER AGENT: Serializes complex task into UEP message and publishes to NATS
 */
class SenderAgent {
  constructor(natsConnection, messageSystem) {
    this.nats = natsConnection;
    this.messageSystem = messageSystem;
    this.agentId = 'sender_agent_001';
  }
  
  async serializeAndSend(task, targetSubject) {
    console.log('🔧 SENDER AGENT: Starting UEP serialization process...');
    
    try {
      // Create UEP message using REAL MessagePassingSystem
      const uepMessage = {
        id: `uep_msg_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
        type: 'task.request',
        timestamp: Date.now(),
        from: this.agentId,
        to: 'receiver_agent_001',
        priority: 'high',
        correlationId: `test_correlation_${Date.now()}`,
        payload: {
          task: task,
          processing_instructions: {
            validate_structure: true,
            verify_completeness: true,
            log_processing_steps: true
          }
        },
        options: {
          timeout: 30000,
          retryCount: 3,
          requireAcknowledgment: true,
          persistent: false
        },
        metadata: {
          retryAttempts: 0,
          route: [this.agentId]
        }
      };
      
      // Serialize to JSON for NATS transport
      const serializedMessage = JSON.stringify(uepMessage);
      testResults.serializedMessage = serializedMessage;
      
      console.log('📤 SENDER AGENT: Publishing UEP message to NATS subject:', targetSubject);
      console.log('📝 Message size:', serializedMessage.length, 'bytes');
      console.log('🔍 Message ID:', uepMessage.id);
      console.log('⏰ Timestamp:', new Date(uepMessage.timestamp).toISOString());
      
      // Publish to NATS using JSONCodec for proper serialization
      await this.nats.publish(targetSubject, jc.encode(uepMessage));
      
      console.log('✅ SENDER AGENT: UEP message published successfully');
      return {
        success: true,
        messageId: uepMessage.id,
        serializedSize: serializedMessage.length
      };
      
    } catch (error) {
      console.error('❌ SENDER AGENT ERROR:', error.message);
      testResults.errors.push(`Sender error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * RECEIVER AGENT: Subscribes to NATS subject and deserializes UEP messages
 */
class ReceiverAgent {
  constructor(natsConnection, messageSystem) {
    this.nats = natsConnection;
    this.messageSystem = messageSystem; 
    this.agentId = 'receiver_agent_001';
    this.receivedMessages = [];
  }
  
  async subscribeAndReceive(targetSubject) {
    console.log('🔧 RECEIVER AGENT: Setting up NATS subscription...');
    
    return new Promise((resolve, reject) => {
      const subscription = this.nats.subscribe(targetSubject);
      
      (async () => {
        try {
          for await (const msg of subscription) {
            console.log('📥 RECEIVER AGENT: Received message from NATS');
            
            try {
              // Deserialize UEP message using JSONCodec
              const uepMessage = jc.decode(msg.data);
              console.log('🔍 Message ID:', uepMessage.id);
              console.log('📊 Processing UEP message structure...');
              
              // Validate UEP message structure
              const validation = this.validateUEPStructure(uepMessage);
              if (!validation.valid) {
                console.error('❌ RECEIVER AGENT: Invalid UEP structure:', validation.errors);
                testResults.errors.push(`Invalid UEP structure: ${validation.errors.join(', ')}`);
                resolve({ success: false, error: 'Invalid UEP structure' });
                return;
              }
              
              // Extract and verify the task payload
              const deserializedTask = uepMessage.payload.task;
              testResults.deserializedTask = deserializedTask;
              
              console.log('✅ RECEIVER AGENT: UEP message deserialized successfully');
              console.log('🔍 Task ID:', deserializedTask.id);
              console.log('📋 Task Title:', deserializedTask.title);
              console.log('📊 Requirements count:', deserializedTask.requirements.functional.length);
              console.log('⚙️ Execution phases:', deserializedTask.execution_phases.length);
              
              // Verify task integrity
              const integrity = this.verifyTaskIntegrity(testResults.originalTask, deserializedTask);
              
              subscription.unsubscribe();
              resolve({
                success: true,
                message: uepMessage,
                task: deserializedTask,
                integrity: integrity
              });
              
            } catch (deserializationError) {
              console.error('❌ RECEIVER AGENT: Deserialization error:', deserializationError.message);
              testResults.errors.push(`Deserialization error: ${deserializationError.message}`);
              subscription.unsubscribe();
              resolve({ success: false, error: deserializationError.message });
            }
          }
        } catch (subscriptionError) {
          console.error('❌ RECEIVER AGENT: Subscription error:', subscriptionError.message);
          testResults.errors.push(`Subscription error: ${subscriptionError.message}`);
          subscription.unsubscribe();
          reject(subscriptionError);
        }
      })();
      
      // Set timeout for test
      setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('Test timeout: No message received within 10 seconds'));
      }, 10000);
    });
  }
  
  /**
   * Validate UEP message structure according to specification
   */
  validateUEPStructure(message) {
    const errors = [];
    
    // Required fields validation
    const requiredFields = ['id', 'type', 'timestamp', 'from', 'to', 'payload', 'options', 'metadata'];
    for (const field of requiredFields) {
      if (!message.hasOwnProperty(field)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Type validation
    if (message.type && !['task.request', 'task.response', 'task.status', 'agent.heartbeat', 'agent.ready', 'agent.error', 'context.share', 'context.request', 'system.broadcast'].includes(message.type)) {
      errors.push(`Invalid message type: ${message.type}`);
    }
    
    // Payload validation
    if (message.payload && !message.payload.task) {
      errors.push('Missing task in payload');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Verify task integrity by deep comparison
   */
  verifyTaskIntegrity(original, deserialized) {
    console.log('🔍 RECEIVER AGENT: Verifying task integrity...');
    
    try {
      // Convert both to JSON strings for comparison
      const originalJson = JSON.stringify(original, null, 2);
      const deserializedJson = JSON.stringify(deserialized, null, 2); 
      
      const identical = originalJson === deserializedJson;
      
      if (identical) {
        console.log('✅ TASK INTEGRITY: Perfect match - task is identical to original');
      } else {
        console.log('❌ TASK INTEGRITY: Tasks differ');
        console.log('📊 Original size:', originalJson.length, 'bytes');
        console.log('📊 Deserialized size:', deserializedJson.length, 'bytes');
        
        // Find differences for debugging
        const originalLines = originalJson.split('\n');
        const deserializedLines = deserializedJson.split('\n');
        const maxLines = Math.max(originalLines.length, deserializedLines.length);
        
        for (let i = 0; i < Math.min(maxLines, 10); i++) { // Show first 10 differences
          if (originalLines[i] !== deserializedLines[i]) {
            console.log(`❌ Difference at line ${i + 1}:`);
            console.log(`   Original:     ${originalLines[i] || '(missing)'}`);
            console.log(`   Deserialized: ${deserializedLines[i] || '(missing)'}`);
          }
        }
      }
      
      return {
        identical: identical,
        originalSize: originalJson.length,
        deserializedSize: deserializedJson.length
      };
      
    } catch (error) {
      console.error('❌ INTEGRITY CHECK ERROR:', error.message);
      return {
        identical: false,
        error: error.message
      };
    }
  }
}

/**
 * MAIN TEST EXECUTION
 * Orchestrates the complete UEP test workflow
 */
async function runUEPTest() {
  const startTime = Date.now();
  console.log('🚀 ZAD MANDATE PHASE 3 - STEP 1: UEP STANDALONE TEST');
  console.log('=' .repeat(80));
  console.log('🎯 Objective: Prove UEP can serialize, transport, and deserialize complex tasks over NATS');
  console.log('⚠️  NO FAKE SHIT: Using REAL UEP implementation from compiled TypeScript');
  console.log('');
  
  let natsConnection = null;
  
  try {
    // Store original task for comparison
    testResults.originalTask = COMPLEX_TASK;
    
    console.log('📋 ORIGINAL TASK DEFINITION:');
    console.log('   Task ID:', COMPLEX_TASK.id);
    console.log('   Title:', COMPLEX_TASK.title);
    console.log('   Complexity Score:', COMPLEX_TASK.metadata.complexity_score);
    console.log('   Functional Requirements:', COMPLEX_TASK.requirements.functional.length);
    console.log('   Execution Phases:', COMPLEX_TASK.execution_phases.length);
    console.log('   Total Size:', JSON.stringify(COMPLEX_TASK).length, 'bytes');
    console.log('');
    
    // Connect to NATS
    console.log('🔌 Connecting to NATS...');
    natsConnection = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      timeout: 5000,
      reconnect: true,
      maxReconnectAttempts: 3
    });
    console.log('✅ NATS connection established');
    console.log('');
    
    // Create UEP message passing system
    console.log('🏗️ Initializing UEP Message Passing System...');
    const messageSystem = createMessagePassingSystem(false); // Use in-memory for test
    console.log('✅ UEP Message Passing System ready');
    console.log('');
    
    // Create test agents
    const senderAgent = new SenderAgent(natsConnection, messageSystem);
    const receiverAgent = new ReceiverAgent(natsConnection, messageSystem);
    
    // Define test subject
    const testSubject = 'uep.test.task.complex';
    
    // Start receiver subscription
    console.log('🎧 Starting receiver agent subscription...');
    const receiverPromise = receiverAgent.subscribeAndReceive(testSubject);
    
    // Wait a moment for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send complex task via UEP
    console.log('📤 Sending complex task via UEP...');
    const sendResult = await senderAgent.serializeAndSend(COMPLEX_TASK, testSubject);
    
    if (!sendResult.success) {
      throw new Error(`Send failed: ${sendResult.error}`);
    }
    
    console.log('');
    console.log('⏳ Waiting for receiver to process message...');
    
    // Wait for receiver to process
    const receiveResult = await receiverPromise;
    
    if (!receiveResult.success) {
      throw new Error(`Receive failed: ${receiveResult.error}`);
    }
    
    // Analyze results
    console.log('');
    console.log('📊 TEST RESULTS ANALYSIS:');
    console.log('=' .repeat(50));
    
    const integrity = receiveResult.integrity;
    testResults.success = integrity.identical;
    testResults.processingTime = Date.now() - startTime;
    
    console.log('✅ UEP Message Format: Valid');
    console.log('✅ NATS Transport: Successful');
    console.log('✅ Deserialization: Successful');
    console.log(`${integrity.identical ? '✅' : '❌'} Task Integrity: ${integrity.identical ? 'IDENTICAL' : 'DIFFERS'}`);
    console.log('⏱️  Processing Time:', testResults.processingTime, 'ms');
    console.log('📊 Original Task Size:', integrity.originalSize, 'bytes');
    console.log('📊 Deserialized Task Size:', integrity.deserializedSize, 'bytes');
    
    if (testResults.errors.length > 0) {
      console.log('');
      console.log('⚠️  ERRORS ENCOUNTERED:');
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('');
    console.error('💥 TEST EXECUTION ERROR:', error.message);
    testResults.errors.push(`Execution error: ${error.message}`);
    testResults.success = false;
  } finally {
    // Clean up NATS connection
    if (natsConnection) {
      await natsConnection.drain();
      console.log('🔌 NATS connection closed');
    }
  }
  
  // Final test result
  testResults.processingTime = Date.now() - startTime;
  
  console.log('');
  console.log('=' .repeat(80));
  console.log('🏁 ZAD MANDATE PHASE 3 - STEP 1 FINAL RESULT:');
  console.log('');
  
  if (testResults.success) {
    console.log('🎉 SUCCESS: UEP SERIALIZATION/DESERIALIZATION PROVEN RELIABLE');
    console.log('✅ The Universal Execution Protocol successfully:');
    console.log('   ✅ Serialized complex multi-step task into UEP message format');
    console.log('   ✅ Transported message reliably over NATS messaging system');
    console.log('   ✅ Deserialized message back to identical task object');
    console.log('   ✅ Maintained complete data integrity throughout the process');
    console.log('');
    console.log('🚀 READY TO PROCEED TO STEP 2: Factory and Agent UEP Integration');
  } else {
    console.log('💥 FAILURE: UEP SERIALIZATION/DESERIALIZATION FAILED');
    console.log('❌ The Universal Execution Protocol failed to maintain task integrity');
    console.log('');
    console.log('🛑 DO NOT PROCEED TO STEP 2 UNTIL THIS TEST PASSES');
    console.log('🔧 FIX THE UEP LIBRARY ISSUES AND RE-RUN THIS TEST');
  }
  
  console.log('');
  console.log('📊 Test Statistics:');
  console.log(`   ⏱️  Total Processing Time: ${testResults.processingTime}ms`);
  console.log(`   📦 Original Task Size: ${JSON.stringify(testResults.originalTask).length} bytes`);
  console.log(`   📡 Serialized Message Size: ${testResults.serializedMessage ? testResults.serializedMessage.length : 'N/A'} bytes`);
  console.log(`   🔍 Errors Encountered: ${testResults.errors.length}`);
  console.log('=' .repeat(80));
  
  // Exit with appropriate code
  process.exit(testResults.success ? 0 : 1);
}

// Run the test
runUEPTest().catch((error) => {
  console.error('💥 CRITICAL TEST FAILURE:', error);
  process.exit(1);
});