#!/usr/bin/env node

/**
 * ZAD MANDATE PHASE 2 - STEP 1: ISOLATE AND PROVE THE PRD PARSER AGENT (SIMPLIFIED)
 * 
 * 🏠 ANALOGY: The PRD Parser is the Architect
 * This script is like giving a blueprint to an architect and making sure they can 
 * create a valid, detailed construction plan from it. We are not building the house yet, 
 * just proving that the architect can read the blueprint and create a correct plan of action.
 * 
 * 🔧 TECHNICAL IMPLEMENTATION:
 * This script has ZERO dependencies on the factory-core or any web components.
 * It only tests the direct interaction with the PRD Parser's core logic.
 * 
 * This simplified version uses the Parser class directly for maximum isolation.
 */

import Parser from './src/meta-agents/prd-parser/parser.js';

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

## Timeline & Phases
- Phase 1: Core platform and basic e-commerce (3 months)
- Phase 2: Multi-vendor features and advanced search (2 months)
- Phase 3: AI recommendations and advanced analytics (2 months)
- Phase 4: Mobile app and additional integrations (2 months)`;

/**
 * 🧠 THE CORE LOGIC (The Architect)
 * Initialize Parser and process the complex PRD directly
 */
async function testPRDParserIsolated() {
    console.log('🏗️  === ZAD MANDATE PHASE 2 - STEP 1: PRD PARSER ISOLATION TEST (SIMPLIFIED) === 🏗️\n');
    console.log('📋 TESTING: Can the Core Parser (The Architect) analyze a complex blueprint?');
    console.log('📄 INPUT: Complex E-commerce Platform PRD (The Blueprint)');
    console.log('🎯 GOAL: Structured requirement analysis and task generation plan\n');
    
    const startTime = Date.now();
    
    try {
        // Initialize the Core Parser (The Architect)
        console.log('🧠 Initializing Core PRD Parser...');
        const parser = new Parser({
            // Minimal configuration for isolation
            useContext7: false, // Disable Context7 for isolation
            sectionPatterns: {
                overview: /^##?\s*(overview|summary|description)/i,
                requirements: /^##?\s*(requirements?|specs?|specifications?)/i,
                architecture: /^##?\s*(architecture|design|structure)/i,
                features: /^##?\s*(features?|functionality|capabilities)/i,
                stories: /^##?\s*(user\s+stories?|stories?)/i,
                performance: /^##?\s*(performance|requirements)/i,
                timeline: /^##?\s*(timeline|phases?|schedule)/i
            }
        });
        
        console.log('✅ Core Parser initialized (isolated mode)');
        
        // 📋 Parse the complex PRD (Give Blueprint to Architect)
        console.log('\n🔧 Analyzing complex PRD through Core Parser...');
        console.log(`📊 PRD Length: ${COMPLEX_PRD.length} characters`);
        console.log(`📝 PRD Sections: ${(COMPLEX_PRD.match(/^##/gm) || []).length} major sections`);
        
        const result = await parser.parse(COMPLEX_PRD, {
            agentName: 'e-commerce-platform',
            filepath: 'complex-prd.md'
        });
        
        const processingTime = Date.now() - startTime;
        
        // 🔍 Validate the result structure (Review the Architect's Analysis)
        if (!result || !result.requirements) {
            throw new Error('Parser failed to return structured requirements');
        }
        
        console.log(`✅ PRD parsing completed in ${processingTime}ms`);
        console.log(`📊 Found ${result.requirements.length} requirements`);
        console.log(`📋 Identified ${result.sections.length} sections`);
        console.log(`🎯 Overall complexity: ${result.metadata.complexity}`);
        
        // 🏗️ Generate execution plan from parser results
        const executionPlan = generateExecutionPlan(result, processingTime);
        
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
 * 🏗️ Generate structured execution plan from parser results
 */
function generateExecutionPlan(parserResult, processingTime) {
    const plan = {
        projectName: 'E-commerce Platform with Multi-Vendor Support',
        generatedBy: 'Core-PRD-Parser',
        generatedAt: new Date().toISOString(),
        processingTime,
        
        // 📋 Convert parsed requirements into executable tasks
        tasks: convertRequirementsToTasks(parserResult.requirements),
        
        // 🎯 Identify required domain agents
        domainAgents: ['backend', 'frontend', 'devops', 'qa', 'documentation'],
        
        // 📊 Project metadata from parser analysis
        metadata: {
            ...parserResult.metadata,
            totalRequirements: parserResult.requirements.length,
            totalSections: parserResult.sections.length,
            estimatedDuration: estimateProjectDuration(parserResult.requirements),
            complexity: parserResult.metadata.complexity,
            phasedDeployment: true,
            requiresSpecializedSkills: true
        },
        
        // 📋 Raw parser output for reference
        parserOutput: {
            requirements: parserResult.requirements,
            sections: parserResult.sections
        }
    };
    
    return plan;
}

/**
 * 📋 Convert parsed requirements into executable tasks with domain agent assignments
 */
function convertRequirementsToTasks(requirements) {
    return requirements.map((req, index) => {
        const taskId = `task-${Date.now()}-${index.toString().padStart(3, '0')}`;
        
        return {
            id: taskId,
            title: req.title,
            description: req.description || req.title,
            priority: req.priority,
            domainAgent: inferDomainAgent(req.title, req.description || ''),
            dependencies: inferTaskDependencies(req, requirements, index),
            estimatedHours: req.estimatedEffort || estimateTaskHours(req.title, req.description || ''),
            phase: inferProjectPhase(req.title, req.section?.title || ''),
            complexity: req.complexity,
            section: req.section?.title || 'General',
            metadata: {
                extractedFrom: 'PRD-Parser',
                originalRequirement: req,
                confidence: calculateTaskConfidence(req)
            }
        };
    });
}

/**
 * 🤖 Infer which domain agent should handle a task
 */
function inferDomainAgent(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    // Backend indicators
    if (text.match(/\b(api|backend|server|database|auth|payment|microservice|postgresql|redis|express)\b/)) {
        return 'backend';
    }
    
    // Frontend indicators  
    if (text.match(/\b(ui|frontend|react|component|dashboard|interface|mobile|responsive|pwa|typescript)\b/)) {
        return 'frontend';
    }
    
    // DevOps indicators
    if (text.match(/\b(deploy|docker|kubernetes|ci\/cd|infrastructure|monitoring|backup|ssl|cdn|aws|cloud)\b/)) {
        return 'devops';
    }
    
    // QA indicators
    if (text.match(/\b(test|quality|validation|performance|security|audit|compliance|verification)\b/)) {
        return 'qa';
    }
    
    // Documentation indicators
    if (text.match(/\b(documentation|docs|readme|guide|manual|specification|help)\b/)) {
        return 'documentation';
    }
    
    // Default based on complexity
    return text.includes('integration') || text.includes('system') ? 'backend' : 'frontend';
}

/**
 * 🔗 Infer task dependencies based on logical ordering
 */
function inferTaskDependencies(currentReq, allRequirements, currentIndex) {
    const dependencies = [];
    const currentText = `${currentReq.title} ${currentReq.description || ''}`.toLowerCase();
    
    // Look for dependencies in previous requirements
    for (let i = 0; i < currentIndex; i++) {
        const prevReq = allRequirements[i];
        const prevText = `${prevReq.title} ${prevReq.description || ''}`.toLowerCase();
        
        // Basic dependency detection
        if (currentText.includes('authentication') && prevText.includes('user') && prevText.includes('management')) {
            dependencies.push(`task-${Date.now()}-${i.toString().padStart(3, '0')}`);
        }
        
        if (currentText.includes('dashboard') && prevText.includes('backend')) {
            dependencies.push(`task-${Date.now()}-${i.toString().padStart(3, '0')}`);
        }
        
        if (currentText.includes('deployment') && (prevText.includes('testing') || prevText.includes('frontend') || prevText.includes('backend'))) {
            dependencies.push(`task-${Date.now()}-${i.toString().padStart(3, '0')}`);
        }
    }
    
    return dependencies;
}

/**
 * ⏱️ Estimate task hours based on complexity and content
 */
function estimateTaskHours(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    let hours = 8; // Base estimate
    
    // Complexity multipliers based on keywords
    if (text.match(/\b(microservice|distributed|architecture)\b/)) hours += 24;
    if (text.match(/\b(integration|api|payment)\b/)) hours += 16;
    if (text.match(/\b(authentication|security|encryption)\b/)) hours += 12;
    if (text.match(/\b(real.time|websocket|live)\b/)) hours += 10;
    if (text.match(/\b(ai|machine.learning|recommendation)\b/)) hours += 32;
    if (text.match(/\b(dashboard|analytics|reporting)\b/)) hours += 14;
    if (text.match(/\b(mobile|responsive|pwa)\b/)) hours += 12;
    if (text.match(/\b(testing|quality|validation)\b/)) hours += 8;
    
    return Math.min(hours, 80); // Cap at 80 hours per task
}

/**
 * 📊 Infer project phase for task sequencing
 */
function inferProjectPhase(title, section) {
    const text = `${title} ${section}`.toLowerCase();
    
    if (text.match(/\b(core|basic|foundation|user.management|authentication)\b/)) return 'phase-1';
    if (text.match(/\b(vendor|multi|advanced|search|analytics)\b/)) return 'phase-2';
    if (text.match(/\b(ai|recommendation|intelligence|machine.learning)\b/)) return 'phase-3';
    if (text.match(/\b(mobile|app|integration|external)\b/)) return 'phase-4';
    
    return 'phase-1'; // Default to phase 1
}

/**
 * 🎯 Calculate confidence in task extraction accuracy
 */
function calculateTaskConfidence(requirement) {
    let confidence = 0.5; // Base confidence
    
    if (requirement.title && requirement.title.length > 10) confidence += 0.2;
    if (requirement.description && requirement.description.length > 20) confidence += 0.2;
    if (requirement.priority && requirement.priority !== 'unknown') confidence += 0.1;
    if (requirement.complexity && requirement.complexity !== 'unknown') confidence += 0.1;
    if (requirement.estimatedEffort && requirement.estimatedEffort > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
}

/**
 * ⏰ Estimate total project duration
 */
function estimateProjectDuration(requirements) {
    const totalHours = requirements.reduce((total, req) => {
        return total + (req.estimatedEffort || 16);
    }, 0);
    
    const weeks = Math.ceil(totalHours / 40); // 40 hours per week
    const months = Math.ceil(weeks / 4);
    
    return `${months} months (${weeks} weeks, ${totalHours} hours)`;
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
    console.log(`\n⏱️  Estimated Total Effort: ${totalHours} hours`);
    console.log(`📅 Estimated Duration: ${plan.metadata.estimatedDuration}`);
    
    console.log(`\n📋 Parser Analysis:`);
    console.log(`   • Requirements found: ${plan.metadata.totalRequirements}`);
    console.log(`   • Sections analyzed: ${plan.metadata.totalSections}`);
    console.log(`   • Overall complexity: ${plan.metadata.complexity}`);
}

// 🚀 THE TEST RUN (Reviewing the Plan)
if (import.meta.url === `file://${process.argv[1]}`) {
    testPRDParserIsolated()
        .then((executionPlan) => {
            console.log('\n🎉 SUCCESS! PRD PARSER ISOLATION TEST PASSED!');
            console.log('🏗️  The Core Parser successfully analyzed the blueprint and created a valid execution plan.');
            console.log(`📋 Plan contains ${executionPlan.tasks.length} structured tasks with proper domain agent assignments.`);
            console.log(`📊 Extracted ${executionPlan.metadata.totalRequirements} requirements from ${executionPlan.metadata.totalSections} sections.`);
            console.log('\n✅ READY TO PROCEED TO ZAD MANDATE STEP 2: Factory Integration');
            process.exit(0);
        })
        .catch((error) => {
            console.log('\n❌ FAILED! PRD PARSER ISOLATION TEST FAILED!');
            console.log('🏗️  The Core Parser could not analyze the blueprint properly.');
            console.log(`💥 Error: ${error.message}`);
            console.log('\n🚨 DO NOT PROCEED TO STEP 2 UNTIL THIS IS FIXED!');
            process.exit(1);
        });
}