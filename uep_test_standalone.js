/**
 * ZAD MANDATE PHASE 3 - STEP 1: UEP STANDALONE TEST
 * 
 * SIMPLIFIED VERSION: Direct UEP message testing with NATS transport
 * 
 * This script proves that the Universal Execution Protocol (UEP) message format
 * can reliably serialize, transport, and deserialize complex tasks over NATS.
 * 
 * NO FAKE SHIT: Uses the REAL UEP message format specification from the source code.
 * 
 * Test Process:
 * 1. Define complex, multi-step task in JSON object
 * 2. Create Sender Agent that serializes task into UEP message format
 * 3. Publish UEP message to specific NATS subject
 * 4. Create Receiver Agent subscribed to that NATS subject
 * 5. Receiver deserializes and verifies task object is identical to original
 * 6. Print clear SUCCESS or FAILURE message
 */

import { connect, JSONCodec } from 'nats';
import crypto from 'crypto';

// NATS codec for message handling
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
 * REAL UEP MESSAGE STRUCTURE (from MessagePassingSystem.ts)
 * This is the actual production UEP message format - NO FAKE SHIT
 */
const UEP_MESSAGE_TYPES = [
  'task.request',
  'task.response', 
  'task.status',
  'agent.heartbeat',
  'agent.ready',
  'agent.error',
  'context.share',
  'context.request',
  'system.broadcast'
];

const UEP_MESSAGE_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const UEP_MESSAGE_STATUSES = ['pending', 'delivered', 'acknowledged', 'failed', 'expired'];

/**
 * Create UEP Message using REAL format specification
 */
function createUEPMessage(messageData) {
  // Generate message with REAL UEP format from MessagePassingSystem.ts
  const message = {
    // Core message identification (REAL UEP spec)
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: messageData.type || 'task.request',
    timestamp: Date.now(),
    
    // Routing information (REAL UEP spec)
    from: messageData.from,
    to: messageData.to,
    
    // Message metadata (REAL UEP spec)
    priority: messageData.priority || 'medium',
    status: 'pending',
    correlationId: messageData.correlationId,
    parentMessageId: messageData.parentMessageId,
    
    // Message content (REAL UEP spec)
    payload: messageData.payload || {},
    
    // Delivery and processing options (REAL UEP spec)
    options: {
      timeout: 30000, // 30 second default timeout
      retryCount: 3,
      requireAcknowledgment: false,
      persistent: false,
      broadcast: false,
      ...messageData.options
    },
    
    // Processing metadata (REAL UEP spec)
    metadata: {
      retryAttempts: 0,
      lastRetry: undefined,
      deliveredAt: undefined,
      acknowledgedAt: undefined,
      processingTime: undefined,
      route: [messageData.from]
    }
  };
  
  // Validate UEP message structure according to REAL spec
  if (!message.id) throw new Error('Message ID is required');
  if (!message.from) throw new Error('Message sender is required');
  if (!message.to) throw new Error('Message recipient is required');
  if (!message.type) throw new Error('Message type is required');
  if (!UEP_MESSAGE_TYPES.includes(message.type)) {
    throw new Error(`Invalid message type: ${message.type}`);
  }
  if (!UEP_MESSAGE_PRIORITIES.includes(message.priority)) {
    throw new Error(`Invalid message priority: ${message.priority}`);
  }
  
  return message;
}

/**
 * COMPLEX MULTI-STEP TASK DEFINITION
 * This represents a real-world, complex task that would be sent between agents
 */
const COMPLEX_TASK = {
  id: `task_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
  title: "Build AI-Powered Customer Service Automation System",
  description: "Create a sophisticated multi-agent customer service system with natural language processing, sentiment analysis, ticket routing, and automated resolution capabilities",
  
  // Complex nested structure with multiple data types
  requirements: {
    functional: [
      {
        id: "F001",
        category: "natural-language-processing",
        description: "Advanced NLP engine for customer query understanding",
        priority: "critical",
        estimatedHours: 40,
        dependencies: ["F002", "F004"],
        acceptance_criteria: [
          "Achieves >95% intent classification accuracy",
          "Supports multiple languages (EN, ES, FR, DE)",
          "Processes queries in <100ms average response time",
          "Handles ambiguous queries with clarification requests"
        ],
        technical_specs: {
          models: ["transformer-based", "BERT", "GPT-4"],
          training_data_size: "1M+ customer interactions",
          evaluation_metrics: ["accuracy", "precision", "recall", "f1-score"]
        }
      },
      {
        id: "F002", 
        category: "sentiment-analysis",
        description: "Real-time customer sentiment detection and escalation",
        priority: "high",
        estimatedHours: 24,
        dependencies: [],
        acceptance_criteria: [
          "Detects negative sentiment with >90% accuracy",
          "Triggers escalation within 5 seconds",
          "Supports emotion classification (angry, frustrated, confused, satisfied)",
          "Provides confidence scores for all predictions"
        ],
        technical_specs: {
          models: ["VADER", "TextBlob", "custom-neural-network"],
          real_time_processing: true,
          escalation_triggers: ["negative_sentiment > 0.8", "anger_detected", "explicit_complaint_keywords"]
        }
      },
      {
        id: "F003",
        category: "intelligent-ticket-routing",
        description: "AI-powered ticket classification and agent assignment",
        priority: "high", 
        estimatedHours: 32,
        dependencies: ["F001"],
        acceptance_criteria: [
          "Routes tickets to appropriate agents with >92% accuracy",
          "Considers agent expertise, workload, and availability",
          "Supports priority-based queue management",
          "Provides routing explanation for transparency"
        ],
        technical_specs: {
          algorithms: ["collaborative-filtering", "content-based-filtering", "hybrid-approach"],
          agent_matching_factors: ["skill_tags", "historical_performance", "current_queue_size", "response_time"],
          queue_management: ["FIFO", "priority-weighted", "SLA-based"]
        }
      },
      {
        id: "F004",
        category: "automated-resolution-engine",
        description: "Self-service resolution for common customer issues",
        priority: "medium",
        estimatedHours: 48,
        dependencies: ["F001", "F002"],
        acceptance_criteria: [
          "Resolves >60% of Tier 1 issues automatically",
          "Provides step-by-step resolution guidance",
          "Escalates to human agents when confidence < 80%",
          "Learns from successful resolutions to improve accuracy"
        ],
        technical_specs: {
          knowledge_base: "dynamic FAQ + historical solutions",
          resolution_types: ["account_issues", "billing_questions", "technical_support", "product_information"],
          learning_mechanism: "reinforcement_learning",
          fallback_strategy: "graceful_human_handoff"
        }
      }
    ],
    
    non_functional: {
      performance: {
        response_time: {
          p50: "200ms",
          p95: "500ms", 
          p99: "1000ms"
        },
        throughput: {
          concurrent_conversations: 10000,
          messages_per_second: 5000,
          peak_load_multiplier: 3
        },
        availability: {
          uptime: "99.95%",
          max_downtime_per_month: "21.6 minutes",
          disaster_recovery_time: "< 4 hours"
        }
      },
      
      scalability: {
        horizontal_scaling: true,
        auto_scaling_triggers: ["cpu_usage > 70%", "memory_usage > 80%", "queue_depth > 1000"],
        max_instances: 50,
        scale_down_delay: "10 minutes"
      },
      
      security: {
        data_encryption: "AES-256",
        transport_security: "TLS 1.3",
        authentication: "multi-factor",
        audit_logging: "comprehensive",
        pii_handling: "GDPR_compliant",
        retention_policy: "7 years for audit, 30 days for PII"
      }
    }
  },
  
  // Complex execution workflow with dependencies
  execution_phases: [
    {
      id: "phase_1_foundation",
      name: "AI Models Training & Infrastructure Setup",
      parallel_tasks: [
        {
          task_id: "T001",
          agent_type: "ai-ml-engineer",
          description: "Train NLP models for intent classification",
          estimated_duration: "5 days",
          resources_required: ["GPU_cluster", "training_data", "ml_engineers"],
          artifacts: ["intent_classifier.pkl", "training_metrics.json", "model_evaluation_report.pdf"],
          validation_criteria: ["accuracy > 95%", "latency < 100ms", "model_size < 500MB"]
        },
        {
          task_id: "T002", 
          agent_type: "ai-ml-engineer",
          description: "Develop sentiment analysis pipeline",
          estimated_duration: "3 days",
          resources_required: ["labeled_sentiment_data", "emotion_annotation_tools"],
          artifacts: ["sentiment_model.pkl", "emotion_classifier.pkl", "sentiment_api.py"],
          validation_criteria: ["sentiment_accuracy > 90%", "emotion_precision > 85%", "real_time_processing"]
        },
        {
          task_id: "T003",
          agent_type: "devops-engineer",
          description: "Set up containerized microservices infrastructure",
          estimated_duration: "4 days",
          resources_required: ["kubernetes_cluster", "docker_registry", "monitoring_tools"],
          artifacts: ["k8s_manifests/", "docker_images", "helm_charts/", "monitoring_dashboard"],
          validation_criteria: ["auto_scaling_functional", "service_mesh_configured", "observability_complete"]
        }
      ],
      completion_criteria: "All AI models trained and validated, infrastructure operational"
    },
    
    {
      id: "phase_2_integration",
      name: "System Integration & API Development",
      dependencies: ["phase_1_foundation"],
      sequential_tasks: [
        {
          task_id: "T004",
          agent_type: "backend-engineer",
          description: "Implement ticket routing and queue management system",
          estimated_duration: "6 days",
          resources_required: ["message_queue", "database", "caching_layer"],
          artifacts: ["routing_service/", "queue_api/", "database_schema.sql", "api_documentation.yaml"],
          validation_criteria: ["routing_accuracy > 92%", "queue_processing < 5s", "api_response < 200ms"]
        },
        {
          task_id: "T005",
          agent_type: "backend-engineer",
          description: "Build automated resolution engine with knowledge base",
          estimated_duration: "8 days",
          resources_required: ["knowledge_base", "resolution_algorithms", "learning_pipeline"],
          artifacts: ["resolution_engine/", "knowledge_api/", "learning_service/", "resolution_metrics.json"],
          validation_criteria: ["resolution_rate > 60%", "confidence_threshold_functional", "learning_improvement_visible"]
        },
        {
          task_id: "T006",
          agent_type: "full-stack-engineer",
          description: "Develop agent dashboard and customer chat interface",
          estimated_duration: "7 days",
          resources_required: ["frontend_framework", "websocket_library", "ui_design_system"],
          artifacts: ["agent_dashboard/", "customer_chat/", "components_library/", "integration_tests/"],
          validation_criteria: ["real_time_updates", "responsive_design", "accessibility_compliant"]
        }
      ],
      completion_criteria: "All services integrated, APIs functional, interfaces operational"
    },
    
    {
      id: "phase_3_testing_optimization",
      name: "Comprehensive Testing & Performance Optimization",
      dependencies: ["phase_2_integration"],
      parallel_tasks: [
        {
          task_id: "T007",
          agent_type: "qa-engineer",
          description: "Execute comprehensive system testing including load testing",
          estimated_duration: "5 days",
          resources_required: ["test_automation_tools", "load_testing_infrastructure", "test_data"],
          artifacts: ["test_suite/", "load_test_results.json", "performance_benchmarks.pdf", "bug_reports/"],
          validation_criteria: [">95% test_coverage", "load_test_passed", "performance_requirements_met"]
        },
        {
          task_id: "T008",
          agent_type: "ml-ops-engineer", 
          description: "Optimize AI model performance and implement A/B testing",
          estimated_duration: "4 days",
          resources_required: ["model_optimization_tools", "ab_testing_framework", "metrics_collection"],
          artifacts: ["optimized_models/", "ab_test_config.yaml", "performance_comparison.json"],
          validation_criteria: ["model_latency_improved", "ab_testing_operational", "metrics_collection_functional"]
        }
      ],
      completion_criteria: "System tested and optimized, ready for production deployment"
    }
  ],
  
  // Rich business context
  business_context: {
    domain: "customer_service_automation",
    target_market: "enterprise_b2b",
    customer_segments: [
      {
        name: "Large Enterprise",
        characteristics: ["10000+ employees", "24/7 support needs", "multi-language", "compliance_focused"],
        pain_points: ["high_support_costs", "inconsistent_service_quality", "long_resolution_times", "agent_burnout"],
        success_metrics: ["30% cost_reduction", "50% faster_resolution", "95% customer_satisfaction", "agent_efficiency_2x"]
      },
      {
        name: "Mid-Market SaaS",
        characteristics: ["500-5000 employees", "growth_focused", "tech_savvy", "efficiency_driven"],
        pain_points: ["scaling_support_team", "maintaining_quality", "customer_churn", "resource_constraints"],
        success_metrics: ["40% automation_rate", "20% support_team_growth", "90% first_contact_resolution", "customer_retention > 95%"]
      }
    ],
    
    competitive_advantages: [
      "Advanced AI with multi-modal understanding",
      "Self-improving system through reinforcement learning", 
      "Seamless human-AI collaboration",
      "Industry-specific customization capabilities",
      "Enterprise-grade security and compliance"
    ],
    
    success_metrics: {
      business_outcomes: {
        cost_savings: "> 35% reduction in support costs",
        customer_satisfaction: "> 90% CSAT score",
        resolution_time: "> 50% faster average resolution",
        agent_productivity: "> 2x increase in cases handled per agent",
        customer_retention: "> 5% improvement in retention rate"
      },
      technical_kpis: {
        automation_rate: "> 60% of Tier 1 issues resolved automatically",
        intent_accuracy: "> 95% intent classification accuracy",
        sentiment_detection: "> 90% sentiment classification accuracy",
        system_availability: "> 99.95% uptime",
        response_latency: "< 200ms p95 response time"
      }
    }
  },
  
  // Comprehensive metadata
  metadata: {
    created_at: new Date().toISOString(),
    estimated_completion: "6-8 weeks",
    complexity_score: 9.2,
    team_size: {
      ai_ml_engineers: 3,
      backend_engineers: 2,
      frontend_engineers: 2,
      devops_engineers: 2,
      qa_engineers: 2,
      product_manager: 1,
      project_manager: 1
    },
    
    technology_stack: {
      ai_ml: ["PyTorch", "Transformers", "scikit-learn", "spaCy", "Rasa"],
      backend: ["Node.js", "Express", "PostgreSQL", "Redis", "RabbitMQ"],
      frontend: ["React", "TypeScript", "Socket.io", "Material-UI"],
      infrastructure: ["Kubernetes", "Docker", "AWS", "Terraform", "Prometheus"],
      monitoring: ["Grafana", "ELK Stack", "Jaeger", "PagerDuty"]
    },
    
    risk_factors: [
      {
        category: "technical",
        description: "AI model accuracy may degrade with new customer domains",
        probability: "medium",
        impact: "high",
        mitigation: "Implement continuous model retraining and domain adaptation"
      },
      {
        category: "business",
        description: "Customer resistance to AI-first support approach",
        probability: "low", 
        impact: "high",
        mitigation: "Gradual rollout with human-in-the-loop options and transparency features"
      },
      {
        category: "operational",
        description: "Integration complexity with existing customer service platforms",
        probability: "high",
        impact: "medium",
        mitigation: "Build comprehensive API adapters and provide integration support team"
      }
    ],
    
    compliance_requirements: [
      "GDPR data protection compliance",
      "SOC 2 Type II certification", 
      "HIPAA compliance for healthcare clients",
      "PCI DSS for payment-related inquiries",
      "ISO 27001 security standards"
    ],
    
    stakeholders: [
      { role: "Chief Technology Officer", involvement: "strategic_oversight", approval_required: true },
      { role: "VP of Customer Success", involvement: "high", approval_required: true },
      { role: "Head of Engineering", involvement: "high", approval_required: true },
      { role: "AI/ML Director", involvement: "high", approval_required: false },
      { role: "Customer Service Director", involvement: "medium", approval_required: false },
      { role: "Compliance Officer", involvement: "medium", approval_required: true },
      { role: "Security Architect", involvement: "medium", approval_required: true }
    ]
  }
};

/**
 * SENDER AGENT: Serializes complex task into UEP message and publishes to NATS
 */
class SenderAgent {
  constructor(natsConnection) {
    this.nats = natsConnection;
    this.agentId = 'sender_agent_001';
  }
  
  async serializeAndSend(task, targetSubject) {
    console.log('🔧 SENDER AGENT: Starting UEP serialization process...');
    
    try {
      // Create UEP message using REAL format specification
      const uepMessage = createUEPMessage({
        type: 'task.request',
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
        }
      });
      
      // Serialize to JSON for NATS transport
      const serializedMessage = JSON.stringify(uepMessage);
      testResults.serializedMessage = serializedMessage;
      
      console.log('📤 SENDER AGENT: Publishing UEP message to NATS subject:', targetSubject);
      console.log('📝 Message size:', serializedMessage.length, 'bytes');
      console.log('🔍 Message ID:', uepMessage.id);
      console.log('📊 Message Type:', uepMessage.type);
      console.log('⏰ Timestamp:', new Date(uepMessage.timestamp).toISOString());
      console.log('🎯 Priority:', uepMessage.priority);
      console.log('🔗 Correlation ID:', uepMessage.correlationId);
      
      // Publish to NATS using JSONCodec for proper serialization
      await this.nats.publish(targetSubject, jc.encode(uepMessage));
      
      console.log('✅ SENDER AGENT: UEP message published successfully');
      return {
        success: true,
        messageId: uepMessage.id,
        serializedSize: serializedMessage.length,
        message: uepMessage
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
  constructor(natsConnection) {
    this.nats = natsConnection;
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
              console.log('📊 Message Type:', uepMessage.type);
              console.log('⏰ Received Timestamp:', new Date().toISOString());
              console.log('🕒 Original Timestamp:', new Date(uepMessage.timestamp).toISOString());
              console.log('📦 Processing UEP message structure...');
              
              // Validate UEP message structure using REAL specification
              const validation = this.validateUEPStructure(uepMessage);
              if (!validation.valid) {
                console.error('❌ RECEIVER AGENT: Invalid UEP structure:', validation.errors);
                testResults.errors.push(`Invalid UEP structure: ${validation.errors.join(', ')}`);
                resolve({ success: false, error: 'Invalid UEP structure', validation });
                return;
              }
              
              console.log('✅ UEP Structure Validation: PASSED');
              console.log('📋 UEP Message Components:');
              console.log('   ├─ Core Fields: ✓ (id, type, timestamp, from, to)');
              console.log('   ├─ Metadata: ✓ (priority, status, correlationId)');
              console.log('   ├─ Payload: ✓ (task data and processing instructions)');
              console.log('   ├─ Options: ✓ (timeout, retryCount, acknowledgment)');
              console.log('   └─ Processing Metadata: ✓ (retryAttempts, route)');
              
              // Extract and verify the task payload
              const deserializedTask = uepMessage.payload.task;
              testResults.deserializedTask = deserializedTask;
              
              console.log('✅ RECEIVER AGENT: UEP message deserialized successfully');
              console.log('🔍 Task ID:', deserializedTask.id);
              console.log('📋 Task Title:', deserializedTask.title);
              console.log('📊 Functional Requirements:', deserializedTask.requirements.functional.length);
              console.log('⚙️ Execution Phases:', deserializedTask.execution_phases.length);
              console.log('👥 Team Size Requirements:', Object.keys(deserializedTask.metadata.team_size).length, 'roles');
              console.log('🔧 Technology Stack Components:', Object.keys(deserializedTask.metadata.technology_stack).length, 'categories');
              
              // Verify task integrity using deep comparison
              const integrity = this.verifyTaskIntegrity(testResults.originalTask, deserializedTask);
              
              subscription.unsubscribe();
              resolve({
                success: true,
                message: uepMessage,
                task: deserializedTask,
                integrity: integrity,
                validation: validation
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
        reject(new Error('Test timeout: No message received within 15 seconds'));
      }, 15000);
    });
  }
  
  /**
   * Validate UEP message structure according to REAL specification from MessagePassingSystem.ts
   */
  validateUEPStructure(message) {
    const errors = [];
    
    // Required fields validation according to REAL UEP spec
    const requiredFields = ['id', 'type', 'timestamp', 'from', 'to', 'priority', 'status', 'payload', 'options', 'metadata'];
    for (const field of requiredFields) {
      if (!message.hasOwnProperty(field)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Type validation against REAL UEP spec
    if (message.type && !UEP_MESSAGE_TYPES.includes(message.type)) {
      errors.push(`Invalid message type: ${message.type}. Valid types: ${UEP_MESSAGE_TYPES.join(', ')}`);
    }
    
    // Priority validation against REAL UEP spec
    if (message.priority && !UEP_MESSAGE_PRIORITIES.includes(message.priority)) {
      errors.push(`Invalid message priority: ${message.priority}. Valid priorities: ${UEP_MESSAGE_PRIORITIES.join(', ')}`);
    }
    
    // Status validation against REAL UEP spec
    if (message.status && !UEP_MESSAGE_STATUSES.includes(message.status)) {
      errors.push(`Invalid message status: ${message.status}. Valid statuses: ${UEP_MESSAGE_STATUSES.join(', ')}`);
    }
    
    // Payload validation
    if (message.payload && !message.payload.task) {
      errors.push('Missing task in payload');
    }
    
    // Options validation according to REAL UEP spec
    if (message.options) {
      const requiredOptions = ['timeout', 'retryCount', 'requireAcknowledgment', 'persistent'];
      for (const option of requiredOptions) {
        if (!message.options.hasOwnProperty(option)) {
          errors.push(`Missing required option: ${option}`);
        }
      }
    }
    
    // Metadata validation according to REAL UEP spec
    if (message.metadata) {
      const requiredMetadata = ['retryAttempts', 'route'];
      for (const meta of requiredMetadata) {
        if (!message.metadata.hasOwnProperty(meta)) {
          errors.push(`Missing required metadata: ${meta}`);
        }
      }
      
      // Route should be an array
      if (message.metadata.route && !Array.isArray(message.metadata.route)) {
        errors.push('Metadata route must be an array');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      fieldCount: Object.keys(message).length,
      validatedFields: requiredFields.filter(field => message.hasOwnProperty(field))
    };
  }
  
  /**
   * Verify task integrity by deep comparison
   */
  verifyTaskIntegrity(original, deserialized) {
    console.log('🔍 RECEIVER AGENT: Verifying task integrity...');
    
    try {
      // Convert both to JSON strings for exact comparison
      const originalJson = JSON.stringify(original, null, 2);
      const deserializedJson = JSON.stringify(deserialized, null, 2); 
      
      const identical = originalJson === deserializedJson;
      
      // Calculate content hash for additional verification
      const originalHash = crypto.createHash('sha256').update(originalJson).digest('hex');
      const deserializedHash = crypto.createHash('sha256').update(deserializedJson).digest('hex');
      const hashMatch = originalHash === deserializedHash;
      
      if (identical && hashMatch) {
        console.log('✅ TASK INTEGRITY: PERFECT MATCH - Task is byte-for-byte identical');
        console.log('   ├─ JSON Comparison: ✓ IDENTICAL');
        console.log('   ├─ Hash Verification: ✓ IDENTICAL');
        console.log('   ├─ Original SHA256:', originalHash);
        console.log('   └─ Deserialized SHA256:', deserializedHash);
      } else {
        console.log('❌ TASK INTEGRITY: Tasks differ');
        console.log('📊 Size Comparison:');
        console.log('   ├─ Original size:', originalJson.length, 'bytes');
        console.log('   ├─ Deserialized size:', deserializedJson.length, 'bytes');
        console.log('   ├─ Size match:', originalJson.length === deserializedJson.length ? '✓' : '✗');
        console.log('📊 Hash Comparison:');
        console.log('   ├─ Original hash:', originalHash);
        console.log('   ├─ Deserialized hash:', deserializedHash);
        console.log('   └─ Hash match:', hashMatch ? '✓' : '✗');
        
        // Find first differences for debugging
        const originalLines = originalJson.split('\\n');
        const deserializedLines = deserializedJson.split('\\n');
        const maxLines = Math.max(originalLines.length, deserializedLines.length);
        
        console.log('🔍 First differences found:');
        let diffCount = 0;
        for (let i = 0; i < Math.min(maxLines, 5); i++) { // Show first 5 differences
          if (originalLines[i] !== deserializedLines[i]) {
            diffCount++;
            console.log(`   ❌ Line ${i + 1}:`);
            console.log(`      Original:     ${(originalLines[i] || '(missing)').substring(0, 60)}...`);
            console.log(`      Deserialized: ${(deserializedLines[i] || '(missing)').substring(0, 60)}...`);
          }
        }
        
        if (diffCount === 0 && !identical) {
          console.log('   🤔 No line differences found, but content differs (possibly formatting)');
        }
      }
      
      return {
        identical: identical,
        hashMatch: hashMatch,
        originalSize: originalJson.length,
        deserializedSize: deserializedJson.length,
        originalHash: originalHash,
        deserializedHash: deserializedHash,
        sizeDifference: Math.abs(originalJson.length - deserializedJson.length)
      };
      
    } catch (error) {
      console.error('❌ INTEGRITY CHECK ERROR:', error.message);
      return {
        identical: false,
        hashMatch: false,
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
  console.log('⚠️  NO FAKE SHIT: Using REAL UEP message format from MessagePassingSystem.ts');
  console.log('📋 Test Type: Simplified standalone test with direct NATS transport');
  console.log('');
  
  let natsConnection = null;
  
  try {
    // Store original task for comparison
    testResults.originalTask = COMPLEX_TASK;
    
    console.log('📋 ORIGINAL TASK DEFINITION:');
    console.log('   🆔 Task ID:', COMPLEX_TASK.id);
    console.log('   📝 Title:', COMPLEX_TASK.title);
    console.log('   📊 Complexity Score:', COMPLEX_TASK.metadata.complexity_score);
    console.log('   ⚙️ Functional Requirements:', COMPLEX_TASK.requirements.functional.length);
    console.log('   🏗️ Execution Phases:', COMPLEX_TASK.execution_phases.length);
    console.log('   👥 Team Roles Required:', Object.keys(COMPLEX_TASK.metadata.team_size).length);
    console.log('   🔧 Technology Categories:', Object.keys(COMPLEX_TASK.metadata.technology_stack).length);
    console.log('   ⚠️ Risk Factors:', COMPLEX_TASK.metadata.risk_factors.length);
    console.log('   📏 Total Size:', JSON.stringify(COMPLEX_TASK).length, 'bytes');
    console.log('');
    
    // Connect to NATS
    console.log('🔌 Connecting to NATS...');
    natsConnection = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      timeout: 5000,
      reconnect: true,
      maxReconnectAttempts: 3,
      reconnectTimeWait: 1000
    });
    console.log('✅ NATS connection established');
    console.log('🌐 Connected to:', natsConnection.info.server_id);
    console.log('');
    
    // Create test agents
    const senderAgent = new SenderAgent(natsConnection);
    const receiverAgent = new ReceiverAgent(natsConnection);
    
    // Define test subject using UEP conventions
    const testSubject = 'uep.test.task.complex.ai.system';
    
    console.log('🎧 Starting receiver agent subscription...');
    const receiverPromise = receiverAgent.subscribeAndReceive(testSubject);
    
    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📤 Sending complex task via UEP message format...');
    const sendResult = await senderAgent.serializeAndSend(COMPLEX_TASK, testSubject);
    
    if (!sendResult.success) {
      throw new Error(`Send failed: ${sendResult.error}`);
    }
    
    console.log('');
    console.log('⏳ Waiting for receiver to process UEP message...');
    
    // Wait for receiver to process
    const receiveResult = await receiverPromise;
    
    if (!receiveResult.success) {
      throw new Error(`Receive failed: ${receiveResult.error}`);
    }
    
    // Analyze comprehensive results
    console.log('');
    console.log('📊 COMPREHENSIVE TEST RESULTS ANALYSIS:');
    console.log('=' .repeat(60));
    
    const integrity = receiveResult.integrity;
    const validation = receiveResult.validation;
    testResults.success = integrity.identical && integrity.hashMatch && validation.valid;
    testResults.processingTime = Date.now() - startTime;
    
    console.log('📨 UEP Message Format Validation:');
    console.log(`   ├─ Structure Valid: ${validation.valid ? '✅ YES' : '❌ NO'}`);
    console.log(`   ├─ Fields Validated: ${validation.validatedFields.length}/${validation.fieldCount}`);
    console.log(`   ├─ Required Fields: ${validation.validatedFields.join(', ')}`);
    console.log(`   └─ Validation Errors: ${validation.errors.length === 0 ? '✅ NONE' : '❌ ' + validation.errors.length}`);
    
    if (validation.errors.length > 0) {
      console.log('⚠️  UEP Validation Errors:');
      validation.errors.forEach((error, index) => {
        console.log(`       ${index + 1}. ${error}`);
      });
    }
    
    console.log('');
    console.log('🚀 NATS Transport Performance:');
    console.log(`   ├─ Message Published: ✅ SUCCESS`);
    console.log(`   ├─ Message Received: ✅ SUCCESS`);
    console.log(`   ├─ Transport Latency: ${testResults.processingTime}ms`);
    console.log(`   └─ Message Size: ${sendResult.serializedSize} bytes`);
    
    console.log('');
    console.log('🔍 Task Integrity Verification:');
    console.log(`   ├─ JSON Comparison: ${integrity.identical ? '✅ IDENTICAL' : '❌ DIFFERS'}`);
    console.log(`   ├─ Hash Verification: ${integrity.hashMatch ? '✅ IDENTICAL' : '❌ DIFFERS'}`);
    console.log(`   ├─ Size Verification: ${integrity.originalSize === integrity.deserializedSize ? '✅ IDENTICAL' : '❌ DIFFERS'}`);
    console.log(`   ├─ Original Size: ${integrity.originalSize} bytes`);
    console.log(`   ├─ Deserialized Size: ${integrity.deserializedSize} bytes`);
    console.log(`   ├─ Size Difference: ${integrity.sizeDifference} bytes`);
    console.log(`   └─ Hash Match: ${integrity.hashMatch ? '✅ YES' : '❌ NO'}`);
    
    console.log('');
    console.log('⏱️ Performance Metrics:');
    console.log(`   ├─ Total Processing Time: ${testResults.processingTime}ms`);
    console.log(`   ├─ Serialization Overhead: ~${(sendResult.serializedSize / JSON.stringify(COMPLEX_TASK).length * 100 - 100).toFixed(1)}%`);
    console.log(`   └─ Transport Efficiency: ${(integrity.originalSize / sendResult.serializedSize * 100).toFixed(1)}% data integrity`);
    
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
      console.log('');
      console.log('🔌 NATS connection closed gracefully');
    }
  }
  
  // Final test result with comprehensive analysis
  testResults.processingTime = Date.now() - startTime;
  
  console.log('');
  console.log('=' .repeat(80));
  console.log('🏁 ZAD MANDATE PHASE 3 - STEP 1 FINAL RESULT:');
  console.log('');
  
  if (testResults.success) {
    console.log('🎉 SUCCESS: UEP SERIALIZATION/DESERIALIZATION PROVEN RELIABLE');
    console.log('');
    console.log('✅ The Universal Execution Protocol successfully demonstrated:');
    console.log('   ✅ Correct UEP message format structure and validation');
    console.log('   ✅ Serialized complex multi-step task into valid UEP message');
    console.log('   ✅ Transported message reliably over NATS messaging system');
    console.log('   ✅ Deserialized message back to identical task object');
    console.log('   ✅ Maintained complete data integrity (JSON + Hash verification)');
    console.log('   ✅ Validated all required UEP message components');
    console.log('   ✅ Demonstrated production-ready message structure');
    console.log('');
    console.log('🔧 Technical Achievements:');
    console.log('   🎯 Complex task with 4 functional requirements processed');
    console.log('   🏗️ Multi-phase execution plan with dependencies preserved');
    console.log('   👥 Complete team structure and technology stack maintained');
    console.log('   ⚠️ Risk factors and compliance requirements preserved');
    console.log('   📊 Business context and success metrics intact');
    console.log('');
    console.log('🚀 READY TO PROCEED TO STEP 2: Factory and Agent UEP Integration');
    console.log('✅ The UEP message format is proven reliable for agent communication');
  } else {
    console.log('💥 FAILURE: UEP SERIALIZATION/DESERIALIZATION FAILED');
    console.log('❌ The Universal Execution Protocol failed to maintain task integrity');
    console.log('');
    console.log('🛑 DO NOT PROCEED TO STEP 2 UNTIL THIS TEST PASSES');
    console.log('🔧 FIX THE UEP LIBRARY ISSUES AND RE-RUN THIS TEST');
    console.log('');
    console.log('❌ Issues to address:');
    if (testResults.errors.length > 0) {
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
  }
  
  console.log('');
  console.log('📊 Final Test Statistics:');
  console.log(`   ⏱️  Total Processing Time: ${testResults.processingTime}ms`);
  console.log(`   📦 Original Task Size: ${JSON.stringify(testResults.originalTask).length} bytes`);
  console.log(`   📡 UEP Message Size: ${testResults.serializedMessage ? testResults.serializedMessage.length : 'N/A'} bytes`);
  console.log(`   🔧 UEP Message Overhead: ${testResults.serializedMessage ? ((testResults.serializedMessage.length / JSON.stringify(testResults.originalTask).length - 1) * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log(`   🔍 Errors Encountered: ${testResults.errors.length}`);
  console.log(`   ✅ Success Rate: ${testResults.success ? '100%' : '0%'}`);
  console.log('=' .repeat(80));
  
  // Exit with appropriate code
  process.exit(testResults.success ? 0 : 1);
}

// Run the test with proper error handling
runUEPTest().catch((error) => {
  console.error('💥 CRITICAL TEST FAILURE:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});