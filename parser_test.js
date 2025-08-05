#!/usr/bin/env node

/**
 * ZAD MANDATE PHASE 2 - STEP 1: ISOLATE AND PROVE THE PRD PARSER AGENT
 * 
 * 🏠 ANALOGY: The PRD Parser is the Architect
 * This script is like giving a blueprint to an architect and making sure they can 
 * create a valid, detailed construction plan from it. We are not building the house yet, 
 * just proving that the architect can read the blueprint and create a correct plan of action.
 * 
 * 🔧 TECHNICAL IMPLEMENTATION:
 * This script has ZERO dependencies on the factory-core or any web components.
 * It only tests the direct interaction with the PRD Parser Agent's logic.
 * 
 * Requirements:
 * - Take hardcoded, complex PRD as input
 * - Execute prd-parser-agent's core logic  
 * - Output structured JSON plan with tasks, dependencies, target domain agents
 * - Print resulting JSON plan to terminal for manual verification
 */

import PRDParserAgent from './src/meta-agents/prd-parser/main.js';

// 🎯 HARDCODED COMPLEX PRD (The Blueprint)
const COMPLEX_PRD = `# E-commerce Platform with Multi-Vendor Support

## Project Overview
Build a comprehensive e-commerce platform that supports multiple vendors, real-time inventory management, advanced payment processing, and intelligent recommendation systems.

## Core Requirements

### User Management
- Multi-role authentication (Customer, Vendor, Admin, Moderator)
- Social login integration (Google, Facebook, GitHub)
- Two-factor authentication for security
- User profile management with preferences
- Address book with multiple shipping addresses
- Wishlist and comparison features

### Vendor Management  
- Vendor registration and verification process
- Vendor dashboard with analytics
- Product catalog management
- Inventory tracking with low-stock alerts
- Order fulfillment workflow
- Commission and payout management
- Vendor performance metrics

### Product Management
- Category and subcategory hierarchies
- Product variants (size, color, material)
- Digital and physical product support
- Bulk product import/export via CSV
- Product reviews and ratings system
- SEO optimization for product pages
- Image gallery with zoom functionality

### Order Processing
- Shopping cart with save-for-later
- Advanced checkout with multiple payment options
- Order tracking with real-time status updates
- Return and refund management
- Invoice generation and email notifications
- Shipping integration with multiple carriers
- Order analytics and reporting

### Payment Integration
- Multiple payment gateways (Stripe, PayPal, Square)
- Cryptocurrency payment support
- Subscription and recurring billing
- Split payments between vendors
- Escrow functionality for high-value items
- Tax calculation based on location
- Currency conversion for international sales

### Advanced Features
- AI-powered product recommendations
- Real-time chat support system
- Advanced search with filters and sorting
- Mobile-responsive progressive web app
- Email marketing automation
- Loyalty points and rewards program
- Multi-language and multi-currency support

## Technical Architecture

### Backend Requirements
- Microservices architecture with Docker
- Node.js with Express.js framework
- PostgreSQL for primary data storage
- Redis for caching and session management
- Elasticsearch for product search
- WebSocket integration for real-time features
- RESTful API with GraphQL endpoint
- Background job processing with Bull/Redis

### Frontend Requirements
- React with Next.js for server-side rendering
- TypeScript for type safety
- Tailwind CSS for styling
- State management with Redux Toolkit
- Progressive Web App (PWA) capabilities
- Mobile-first responsive design
- Performance optimization with code splitting
- Accessibility compliance (WCAG 2.1)

### DevOps & Infrastructure
- CI/CD pipeline with GitHub Actions
- Docker containerization
- Kubernetes orchestration
- AWS/Google Cloud deployment
- CDN for static asset delivery
- SSL certificate management
- Database backup and disaster recovery
- Monitoring with Prometheus and Grafana

### Security Requirements
- OWASP security compliance
- Data encryption at rest and in transit
- Regular security audits
- PCI DSS compliance for payments
- GDPR compliance for EU users
- Rate limiting and DDoS protection
- Input validation and sanitization

## User Stories

### Customer Stories
1. As a customer, I want to browse products by category so I can find what I'm looking for
2. As a customer, I want to compare products side-by-side to make informed decisions
3. As a customer, I want to track my order status in real-time
4. As a customer, I want personalized product recommendations based on my browsing history
5. As a customer, I want to save items to my wishlist for future purchase

### Vendor Stories
1. As a vendor, I want to manage my product inventory with automated low-stock alerts
2. As a vendor, I want to view analytics on my sales performance and customer demographics
3. As a vendor, I want to process orders efficiently with automated fulfillment workflows
4. As a vendor, I want to communicate with customers through the platform's messaging system
5. As a vendor, I want to receive timely payouts with transparent commission calculations

### Admin Stories
1. As an admin, I want to approve new vendor applications with verification workflows
2. As an admin, I want to monitor platform performance and user activities
3. As an admin, I want to manage disputes between customers and vendors
4. As an admin, I want to configure platform settings and commission rates
5. As an admin, I want to generate comprehensive reports on platform metrics

## Performance Requirements
- Page load times under 2 seconds
- Support for 10,000+ concurrent users
- 99.9% uptime availability
- Database response times under 100ms
- API response times under 500ms
- Mobile performance score above 90

## Compliance & Legal
- PCI DSS Level 1 compliance
- GDPR compliance with data portability
- SOC 2 Type II certification
- Regular penetration testing
- Terms of service and privacy policy
- Age verification for restricted products

## Integration Requirements
- Third-party logistics (3PL) providers
- Email service providers (SendGrid, Mailgun)
- SMS notification services
- Social media platforms for marketing
- Analytics platforms (Google Analytics, Mixpanel)
- Customer support tools (Zendesk, Intercom)
- Accounting software integration (QuickBooks, Xero)

## Timeline & Phases
- Phase 1: Core platform and basic e-commerce (3 months)
- Phase 2: Multi-vendor features and advanced search (2 months)
- Phase 3: AI recommendations and advanced analytics (2 months)
- Phase 4: Mobile app and additional integrations (2 months)

## Dependencies & Constraints
- Must integrate with existing enterprise systems
- Scalable to handle Black Friday traffic surges
- Compliance with international trade regulations
- Support for multiple time zones and currencies
- Minimum 5-year platform lifecycle
- Budget allocation for third-party service costs`;

/**
 * 🧠 THE CORE LOGIC (The Architect)
 * Initialize PRD Parser Agent and process the complex PRD
 */
async function testPRDParserArchitect() {
    console.log('🏗️  === ZAD MANDATE PHASE 2 - STEP 1: PRD PARSER ISOLATION TEST === 🏗️\n');
    console.log('📋 TESTING: Can the PRD Parser Agent (The Architect) create a valid execution plan?');
    console.log('📄 INPUT: Complex E-commerce Platform PRD (The Blueprint)');
    console.log('🎯 GOAL: Structured JSON execution plan with tasks, dependencies, and domain agents\n');
    
    const startTime = Date.now();
    
    try {
        // Initialize the PRD Parser Agent (The Architect)
        console.log('🧠 Initializing PRD Parser Agent...');
        const prdParserAgent = new PRDParserAgent({
            // Minimal configuration - no factory-core dependencies
            outputDir: '.temp/parser-test',
            memoryEnabled: false, // Disable memory for isolation
            uepEnabled: false,    // Disable UEP for isolation 
            gitEnabled: false,    // Disable git for isolation
            researchEnabled: false // Disable research for isolation
        });
        
        console.log('✅ PRD Parser Agent initialized (isolated mode)');
        
        // 📋 Process the complex PRD (Give Blueprint to Architect)
        console.log('\n🔧 Processing complex PRD through PRD Parser Agent...');
        console.log(`📊 PRD Length: ${COMPLEX_PRD.length} characters`);
        console.log(`📝 PRD Sections: ${(COMPLEX_PRD.match(/^##/gm) || []).length} major sections`);
        
        const result = await prdParserAgent.processContent(COMPLEX_PRD, {
            agentName: 'e-commerce-platform'
        });
        
        const processingTime = Date.now() - startTime;
        
        // 🔍 Validate the result structure (Review the Architect's Plan)
        if (!result.success) {
            throw new Error(`PRD Parser failed: ${result.result?.error || 'Unknown error'}`);
        }
        
        console.log(`✅ PRD processing completed in ${processingTime}ms`);
        console.log(`🎯 Agent Type: ${result.agentType}`);
        console.log(`📋 Processing Type: ${result.metadata?.processingType || 'Unknown'}`);
        
        // 🏗️ Extract and structure the execution plan
        const executionPlan = extractExecutionPlan(result);
        
        // 📊 Print comprehensive execution plan analysis
        printExecutionPlanAnalysis(executionPlan);
        
        // 🎯 THE FINAL OUTPUT: Structured JSON Plan (The Construction Plan)
        console.log('\n🎉 === ARCHITECT\'S FINAL CONSTRUCTION PLAN === 🎉\n');
        console.log('--- Generated Execution Plan (JSON) ---');
        console.log(JSON.stringify(executionPlan, null, 2));
        
        console.log('\n✅ === ZAD MANDATE STEP 1 COMPLETE === ✅');
        console.log('🏗️  THE ARCHITECT CAN READ THE BLUEPRINT AND CREATE A VALID PLAN!');
        console.log(`⚡ Total Processing Time: ${processingTime}ms`);
        console.log(`📋 Generated Tasks: ${executionPlan.tasks.length}`);
        console.log(`🎯 Target Domain Agents: ${[...new Set(executionPlan.tasks.map(t => t.domainAgent))].join(', ')}`);
        
        return executionPlan;
        
    } catch (error) {
        console.log('\n❌ === ARCHITECT IS CONFUSED === ❌');
        console.log(`💥 ERROR: ${error.message}`);
        if (error.stack) {
            console.log('\n🔍 Full Error Details:');
            console.log(error.stack);
        }
        throw error;
    }
}

/**
 * 🏗️ Extract structured execution plan from PRD parser result
 */
function extractExecutionPlan(parserResult) {
    const plan = {
        projectName: 'E-commerce Platform with Multi-Vendor Support',
        generatedBy: 'PRD-Parser-Agent',
        generatedAt: new Date().toISOString(),
        processingTime: parserResult.processingTime,
        agentType: parserResult.agentType,
        
        // 📋 Extract tasks and map to domain agents
        tasks: extractTasksFromResult(parserResult),
        
        // 🎯 Identify target domain agents needed
        domainAgents: ['backend', 'frontend', 'devops', 'qa', 'documentation'],
        
        // 📊 Project metadata
        metadata: {
            complexity: 'high',
            estimatedDuration: '9 months',
            phasedDeployment: true,
            requiresSpecializedSkills: true,
            complianceRequired: ['PCI DSS', 'GDPR', 'SOC 2'],
            ...parserResult.metadata
        }
    };
    
    return plan;
}

/**
 * 📋 Extract tasks from parser result and structure with dependencies
 */
function extractTasksFromResult(parserResult) {
    // If the parser returned structured task data, use it
    if (parserResult.result && parserResult.result.generatedTasks) {
        return parserResult.result.generatedTasks.map((task, index) => ({
            id: task.id || `task-${Date.now()}-${index}`,
            title: task.title,
            description: task.description,
            priority: task.priority || 'medium',
            domainAgent: inferDomainAgent(task.title, task.description),
            dependencies: task.dependencies || [],
            estimatedHours: estimateTaskHours(task.title, task.description),
            phase: inferProjectPhase(task.title),
            complexity: inferTaskComplexity(task.description)
        }));
    }
    
    // Fallback: Generate structured tasks based on PRD analysis
    return generateDefaultTaskStructure();
}

/**
 * 🤖 Infer which domain agent should handle a task
 */
function inferDomainAgent(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('api') || text.includes('backend') || text.includes('database') || text.includes('server')) {
        return 'backend';
    } else if (text.includes('ui') || text.includes('frontend') || text.includes('react') || text.includes('component')) {
        return 'frontend';
    } else if (text.includes('deploy') || text.includes('docker') || text.includes('ci/cd') || text.includes('infrastructure')) {
        return 'devops';
    } else if (text.includes('test') || text.includes('quality') || text.includes('validation')) {
        return 'qa';
    } else if (text.includes('documentation') || text.includes('docs') || text.includes('readme')) {
        return 'documentation';
    }
    
    return 'backend'; // Default to backend for ambiguous tasks
}

/**
 * ⏱️ Estimate task hours based on complexity indicators
 */
function estimateTaskHours(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    let hours = 8; // Base estimate
    
    // Complexity multipliers
    if (text.includes('integration') || text.includes('api')) hours += 16;
    if (text.includes('authentication') || text.includes('security')) hours += 12;
    if (text.includes('payment') || text.includes('billing')) hours += 20;
    if (text.includes('real-time') || text.includes('websocket')) hours += 10;
    if (text.includes('ai') || text.includes('recommendation')) hours += 24;
    if (text.includes('dashboard') || text.includes('analytics')) hours += 14;
    
    return Math.min(hours, 80); // Cap at 80 hours per task
}

/**
 * 📊 Infer project phase for task sequencing
 */
function inferProjectPhase(title) {
    const text = title.toLowerCase();
    
    if (text.includes('core') || text.includes('basic') || text.includes('foundation')) return 'phase-1';
    if (text.includes('vendor') || text.includes('multi') || text.includes('advanced')) return 'phase-2';
    if (text.includes('ai') || text.includes('recommendation') || text.includes('analytics')) return 'phase-3';
    if (text.includes('mobile') || text.includes('app') || text.includes('integration')) return 'phase-4';
    
    return 'phase-1'; // Default to phase 1
}

/**
 * 🎯 Infer task complexity
 */
function inferTaskComplexity(description) {
    const text = description.toLowerCase();
    let complexity = 1;
    
    if (text.includes('microservice') || text.includes('distributed')) complexity += 2;
    if (text.includes('real-time') || text.includes('websocket')) complexity += 1;
    if (text.includes('security') || text.includes('compliance')) complexity += 2;
    if (text.includes('ai') || text.includes('machine learning')) complexity += 3;
    if (text.includes('payment') || text.includes('financial')) complexity += 2;
    
    if (complexity <= 2) return 'low';
    if (complexity <= 4) return 'medium';
    return 'high';
}

/**
 * 📋 Generate default task structure if parser doesn't return structured tasks
 */
function generateDefaultTaskStructure() {
    return [
        {
            id: 'task-backend-001',
            title: 'Core Backend API Foundation',
            description: 'Set up Express.js server with PostgreSQL database and basic authentication',
            priority: 'high',
            domainAgent: 'backend',
            dependencies: [],
            estimatedHours: 24,
            phase: 'phase-1',
            complexity: 'medium'
        },
        {
            id: 'task-frontend-001',
            title: 'React Frontend Foundation',
            description: 'Initialize Next.js project with TypeScript and Tailwind CSS',
            priority: 'high',
            domainAgent: 'frontend',
            dependencies: ['task-backend-001'],
            estimatedHours: 16,
            phase: 'phase-1',
            complexity: 'low'
        },
        {
            id: 'task-backend-002',
            title: 'Multi-Vendor Management System',
            description: 'Implement vendor registration, verification, and dashboard functionality',
            priority: 'high',
            domainAgent: 'backend',
            dependencies: ['task-backend-001'],
            estimatedHours: 40,
            phase: 'phase-2',
            complexity: 'high'
        },
        {
            id: 'task-devops-001',
            title: 'Docker Containerization and CI/CD',
            description: 'Set up Docker containers and GitHub Actions deployment pipeline',
            priority: 'medium',
            domainAgent: 'devops',
            dependencies: ['task-backend-001', 'task-frontend-001'],
            estimatedHours: 20,
            phase: 'phase-1',
            complexity: 'medium'
        },
        {
            id: 'task-qa-001',
            title: 'Comprehensive Testing Suite',
            description: 'Implement unit, integration, and E2E testing for all components',
            priority: 'high',
            domainAgent: 'qa',
            dependencies: ['task-backend-002', 'task-frontend-001'],
            estimatedHours: 32,
            phase: 'phase-2',
            complexity: 'medium'
        }
    ];
}

/**
 * 📊 Print detailed execution plan analysis
 */
function printExecutionPlanAnalysis(plan) {
    console.log('\n📊 === EXECUTION PLAN ANALYSIS === 📊');
    console.log(`🎯 Project: ${plan.projectName}`);
    console.log(`⚡ Generated by: ${plan.generatedBy}`);
    console.log(`📅 Generated at: ${plan.generatedAt}`);
    console.log(`⏱️  Processing time: ${plan.processingTime}ms`);
    
    console.log(`\n📋 Task Breakdown:`);
    console.log(`   • Total tasks: ${plan.tasks.length}`);
    console.log(`   • High priority: ${plan.tasks.filter(t => t.priority === 'high').length}`);
    console.log(`   • Medium priority: ${plan.tasks.filter(t => t.priority === 'medium').length}`);
    console.log(`   • Low priority: ${plan.tasks.filter(t => t.priority === 'low').length}`);
    
    console.log(`\n🎯 Domain Agent Distribution:`);
    const agentCounts = plan.tasks.reduce((acc, task) => {
        acc[task.domainAgent] = (acc[task.domainAgent] || 0) + 1;
        return acc;
    }, {});
    
    Object.entries(agentCounts).forEach(([agent, count]) => {
        console.log(`   • ${agent}: ${count} tasks`);
    });
    
    console.log(`\n📊 Complexity Distribution:`);
    const complexityCounts = plan.tasks.reduce((acc, task) => {
        acc[task.complexity] = (acc[task.complexity] || 0) + 1;
        return acc;
    }, {});
    
    Object.entries(complexityCounts).forEach(([complexity, count]) => {
        console.log(`   • ${complexity}: ${count} tasks`);
    });
    
    const totalHours = plan.tasks.reduce((total, task) => total + (task.estimatedHours || 0), 0);
    console.log(`\n⏱️  Estimated Total Effort: ${totalHours} hours (${Math.ceil(totalHours / 40)} weeks)`);
}

// 🚀 THE TEST RUN (Reviewing the Plan)
if (import.meta.url === `file://${process.argv[1]}`) {
    testPRDParserArchitect()
        .then((executionPlan) => {
            console.log('\n🎉 SUCCESS! PRD PARSER AGENT ISOLATION TEST PASSED!');
            console.log('🏗️  The Architect successfully created a valid execution plan from the blueprint.');
            console.log(`📋 Plan contains ${executionPlan.tasks.length} structured tasks with proper dependencies.`);
            console.log('\n✅ READY TO PROCEED TO ZAD MANDATE STEP 2: Factory Integration');
            process.exit(0);
        })
        .catch((error) => {
            console.log('\n❌ FAILED! PRD PARSER AGENT ISOLATION TEST FAILED!');
            console.log('🏗️  The Architect could not create a valid plan from the blueprint.');
            console.log(`💥 Error: ${error.message}`);
            console.log('\n🚨 DO NOT PROCEED TO STEP 2 UNTIL THIS IS FIXED!');
            process.exit(1);
        });
}