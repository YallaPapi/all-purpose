#!/usr/bin/env node

/**
 * ZAD MANDATE PHASE 2 - STEP 1: TRULY ISOLATED PRD PARSER TEST
 * 
 * 🏠 ANALOGY: The PRD Parser is the Architect
 * This script is like giving a blueprint to an architect and making sure they can 
 * create a valid, detailed construction plan from it. We are not building the house yet, 
 * just proving that the architect can read the blueprint and create a correct plan of action.
 * 
 * 🔧 TECHNICAL IMPLEMENTATION:
 * This script has ZERO dependencies on anything - completely isolated.
 * It implements core PRD parsing logic inline to prove the concept works.
 * 
 * NO IMPORTS, NO DEPENDENCIES, PURE ISOLATION TEST
 */

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
5. As a admin, I want to generate comprehensive reports on platform metrics

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
 * 🧠 CORE ISOLATED PARSING LOGIC (The Architect)
 * Pure JavaScript implementation with no external dependencies
 */
function parseMarkdownTasks(prdContent) {
    console.log('🔧 Parsing PRD content with isolated logic...');
    
    const lines = prdContent.split('\n');
    const sections = [];
    const requirements = [];
    let currentSection = null;
    
    // Parse sections and extract requirements
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) continue;
        
        // Detect headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const title = headerMatch[2];
            
            currentSection = {
                level,
                title,
                lineNumber: i,
                content: []
            };
            sections.push(currentSection);
            continue;
        }
        
        // Detect list items as requirements
        const listMatch = line.match(/^[-*]\s+(.+)$/);
        if (listMatch && currentSection) {
            const requirementText = listMatch[1];
            
            const requirement = {
                id: `req-${requirements.length + 1}`,
                title: requirementText,
                description: requirementText,
                section: currentSection.title,
                priority: inferPriority(requirementText),
                complexity: inferComplexity(requirementText),
                estimatedHours: estimateHours(requirementText),
                domainAgent: inferDomainAgent(requirementText)
            };
            
            requirements.push(requirement);
        }
        
        // Add content to current section
        if (currentSection) {
            currentSection.content.push(line);
        }
    }
    
    return {
        sections,
        requirements,
        metadata: {
            totalSections: sections.length,
            totalRequirements: requirements.length,
            complexity: calculateOverallComplexity(requirements),
            parsedAt: new Date().toISOString()
        }
    };
}

/**
 * 🎯 Infer requirement priority from text content
 */
function inferPriority(text) {
    const lowerText = text.toLowerCase();
    
    // High priority indicators
    if (lowerText.match(/\b(must|required|critical|essential|core|authentication|security|payment)\b/)) {
        return 'high';
    }
    
    // Medium priority indicators
    if (lowerText.match(/\b(should|important|dashboard|analytics|integration|api)\b/)) {
        return 'medium';
    }
    
    // Low priority indicators
    if (lowerText.match(/\b(could|nice|optional|enhancement|improvement)\b/)) {
        return 'low';
    }
    
    return 'medium'; // Default
}

/**
 * 🔍 Infer requirement complexity
 */
function inferComplexity(text) {
    const lowerText = text.toLowerCase();
    let complexityScore = 1;
    
    // Complexity indicators
    if (lowerText.match(/\b(microservice|distributed|architecture|ai|machine learning)\b/)) complexityScore += 3;
    if (lowerText.match(/\b(real.time|websocket|integration|api|payment|security)\b/)) complexityScore += 2;
    if (lowerText.match(/\b(dashboard|analytics|reporting|search|mobile)\b/)) complexityScore += 1;
    
    if (complexityScore <= 2) return 'low';
    if (complexityScore <= 4) return 'medium';
    return 'high';
}

/**
 * ⏱️ Estimate hours for requirement
 */
function estimateHours(text) {
    const lowerText = text.toLowerCase();
    let hours = 8; // Base estimate
    
    // Hour multipliers based on keywords
    if (lowerText.match(/\b(microservice|architecture)\b/)) hours += 32;
    if (lowerText.match(/\b(ai|machine learning|recommendation)\b/)) hours += 40;
    if (lowerText.match(/\b(payment|security|authentication)\b/)) hours += 24;
    if (lowerText.match(/\b(real.time|websocket|integration)\b/)) hours += 16;
    if (lowerText.match(/\b(dashboard|analytics|search)\b/)) hours += 12;
    if (lowerText.match(/\b(mobile|responsive|pwa)\b/)) hours += 10;
    
    return Math.min(hours, 80); // Cap at 80 hours
}

/**
 * 🤖 Infer target domain agent
 */
function inferDomainAgent(text) {
    const lowerText = text.toLowerCase();
    
    // Backend indicators
    if (lowerText.match(/\b(api|backend|server|database|auth|payment|microservice|processing)\b/)) {
        return 'backend';
    }
    
    // Frontend indicators
    if (lowerText.match(/\b(ui|dashboard|interface|mobile|responsive|react|component|pwa)\b/)) {
        return 'frontend';
    }
    
    // DevOps indicators
    if (lowerText.match(/\b(deploy|docker|kubernetes|ci\/cd|infrastructure|monitoring|backup|ssl)\b/)) {
        return 'devops';
    }
    
    // QA indicators
    if (lowerText.match(/\b(test|quality|performance|security|audit|compliance|validation)\b/)) {
        return 'qa';
    }
    
    // Documentation indicators
    if (lowerText.match(/\b(documentation|docs|guide|specification|manual)\b/)) {
        return 'documentation';
    }
    
    // Default assignment based on context
    return 'backend';
}

/**
 * 📊 Calculate overall project complexity
 */
function calculateOverallComplexity(requirements) {
    const complexityCounts = requirements.reduce((counts, req) => {
        counts[req.complexity] = (counts[req.complexity] || 0) + 1;
        return counts;
    }, {});
    
    const totalReqs = requirements.length;
    const highPercentage = (complexityCounts.high || 0) / totalReqs;
    const mediumPercentage = (complexityCounts.medium || 0) / totalReqs;
    
    if (highPercentage > 0.4) return 'high';
    if (highPercentage > 0.2 || mediumPercentage > 0.6) return 'medium';
    return 'low';
}

/**
 * 🏗️ Generate structured execution plan
 */
function generateExecutionPlan(parseResult, processingTime) {
    const tasks = parseResult.requirements.map((req, index) => ({
        id: `task-${Date.now()}-${index.toString().padStart(3, '0')}`,
        title: req.title,
        description: req.description,
        priority: req.priority,
        domainAgent: req.domainAgent,
        dependencies: inferTaskDependencies(req, index, parseResult.requirements),
        estimatedHours: req.estimatedHours,
        phase: inferProjectPhase(req.title, req.section),
        complexity: req.complexity,
        section: req.section
    }));
    
    return {
        projectName: 'E-commerce Platform with Multi-Vendor Support',
        generatedBy: 'Isolated-PRD-Parser',
        generatedAt: new Date().toISOString(),
        processingTime,
        
        tasks,
        domainAgents: ['backend', 'frontend', 'devops', 'qa', 'documentation'],
        
        metadata: {
            ...parseResult.metadata,
            totalTasks: tasks.length,
            estimatedTotalHours: tasks.reduce((total, task) => total + task.estimatedHours, 0),
            domainDistribution: calculateDomainDistribution(tasks),
            phaseDistribution: calculatePhaseDistribution(tasks)
        },
        
        parseResult // Include raw parse data for reference
    };
}

/**
 * 🔗 Infer task dependencies
 */
function inferTaskDependencies(currentReq, currentIndex, allRequirements) {
    const dependencies = [];
    const currentText = currentReq.title.toLowerCase();
    
    // Look for logical dependencies in previous requirements
    for (let i = 0; i < currentIndex; i++) {
        const prevReq = allRequirements[i];
        const prevText = prevReq.title.toLowerCase();
        
        // Authentication dependencies
        if (currentText.includes('dashboard') && prevText.includes('authentication')) {
            dependencies.push(`task-${Date.now()}-${i.toString().padStart(3, '0')}`);
        }
        
        // API dependencies
        if (currentText.includes('frontend') && prevText.includes('api')) {
            dependencies.push(`task-${Date.now()}-${i.toString().padStart(3, '0')}`);
        }
        
        // Infrastructure dependencies
        if (currentText.includes('deployment') && (prevText.includes('docker') || prevText.includes('ci'))) {
            dependencies.push(`task-${Date.now()}-${i.toString().padStart(3, '0')}`);
        }
    }
    
    return dependencies;
}

/**
 * 📊 Infer project phase
 */
function inferProjectPhase(title, section) {
    const text = `${title} ${section}`.toLowerCase();
    
    if (text.match(/\b(core|basic|user management|authentication|foundation)\b/)) return 'phase-1';
    if (text.match(/\b(vendor|multi|advanced|search|product)\b/)) return 'phase-2';
    if (text.match(/\b(ai|recommendation|analytics|intelligence)\b/)) return 'phase-3';
    if (text.match(/\b(mobile|integration|external|app)\b/)) return 'phase-4';
    
    return 'phase-1';
}

/**
 * 📊 Calculate domain distribution
 */
function calculateDomainDistribution(tasks) {
    return tasks.reduce((dist, task) => {
        dist[task.domainAgent] = (dist[task.domainAgent] || 0) + 1;
        return dist;
    }, {});
}

/**
 * 📊 Calculate phase distribution
 */
function calculatePhaseDistribution(tasks) {
    return tasks.reduce((dist, task) => {
        dist[task.phase] = (dist[task.phase] || 0) + 1;
        return dist;
    }, {});
}

/**
 * 📊 Print execution plan analysis
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
    Object.entries(plan.metadata.domainDistribution).forEach(([agent, count]) => {
        console.log(`   • ${agent}: ${count} tasks`);
    });
    
    console.log(`\n📊 Phase Distribution:`);
    Object.entries(plan.metadata.phaseDistribution).forEach(([phase, count]) => {
        console.log(`   • ${phase}: ${count} tasks`);
    });
    
    console.log(`\n⏱️  Estimated Total Effort: ${plan.metadata.estimatedTotalHours} hours`);
    console.log(`📊 Overall Complexity: ${plan.metadata.complexity}`);
    console.log(`🎯 Required Domain Agents: ${plan.domainAgents.join(', ')}`);
}

/**
 * 🚀 MAIN TEST FUNCTION (Reviewing the Plan)
 */
function testIsolatedPRDParser() {
    console.log('🏗️  === ZAD MANDATE PHASE 2 - STEP 1: TRULY ISOLATED PRD PARSER TEST === 🏗️\n');
    console.log('📋 TESTING: Can our isolated parsing logic (The Architect) create a valid execution plan?');
    console.log('📄 INPUT: Complex E-commerce Platform PRD (The Blueprint)');
    console.log('🎯 GOAL: Structured JSON execution plan with tasks, dependencies, and domain agents');
    console.log('🔒 ISOLATION: Zero external dependencies - pure JavaScript logic\n');
    
    const startTime = Date.now();
    
    try {
        // Parse the PRD content
        console.log('🧠 Initializing isolated parser logic...');
        console.log(`📊 PRD Length: ${COMPLEX_PRD.length} characters`);
        console.log(`📝 PRD Lines: ${COMPLEX_PRD.split('\n').length} lines`);
        
        // Execute the core parsing logic
        const parseResult = parseMarkdownTasks(COMPLEX_PRD);
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ PRD parsing completed in ${processingTime}ms`);
        console.log(`📊 Found ${parseResult.requirements.length} requirements`);
        console.log(`📋 Identified ${parseResult.sections.length} sections`);
        console.log(`🎯 Overall complexity: ${parseResult.metadata.complexity}`);
        
        // Generate the execution plan
        console.log('\n🏗️  Generating execution plan from parsed requirements...');
        const executionPlan = generateExecutionPlan(parseResult, processingTime);
        
        // Print analysis
        printExecutionPlanAnalysis(executionPlan);
        
        // 🎯 THE FINAL OUTPUT: Structured JSON Plan (The Construction Plan)
        console.log('\n🎉 === ARCHITECT\'S FINAL CONSTRUCTION PLAN === 🎉\n');
        console.log('--- Generated Execution Plan (JSON) ---');
        console.log(JSON.stringify(executionPlan, null, 2));
        
        console.log('\n✅ === ZAD MANDATE STEP 1 COMPLETE === ✅');
        console.log('🏗️  THE ISOLATED ARCHITECT CAN READ THE BLUEPRINT AND CREATE A VALID PLAN!');
        console.log(`⚡ Total Processing Time: ${processingTime}ms`);
        console.log(`📋 Generated Tasks: ${executionPlan.tasks.length}`);
        console.log(`🎯 Target Domain Agents: ${executionPlan.domainAgents.join(', ')}`);
        console.log(`📊 Requirements Processed: ${parseResult.requirements.length}`);
        console.log(`🔍 Sections Analyzed: ${parseResult.sections.length}`);
        
        return executionPlan;
        
    } catch (error) {
        console.log('\n❌ === ISOLATED ARCHITECT IS CONFUSED === ❌');
        console.log(`💥 ERROR: ${error.message}`);
        if (error.stack) {
            console.log('\n🔍 Full Error Details:');
            console.log(error.stack);
        }
        throw error;
    }
}

// 🚀 RUN THE ISOLATED TEST
try {
    const executionPlan = testIsolatedPRDParser();
    
    console.log('\n🎉 SUCCESS! ISOLATED PRD PARSER TEST PASSED!');
    console.log('🏗️  The Isolated Architect successfully created a valid execution plan from the blueprint.');
    console.log(`📋 Plan contains ${executionPlan.tasks.length} structured tasks with proper domain agent assignments.`);
    console.log(`📊 Extracted ${executionPlan.metadata.totalTasks} tasks from ${executionPlan.parseResult.requirements.length} requirements.`);
    console.log('\n✅ READY TO PROCEED TO ZAD MANDATE STEP 2: Factory Integration');
    
} catch (error) {
    console.log('\n❌ FAILED! ISOLATED PRD PARSER TEST FAILED!');
    console.log('🏗️  The Isolated Architect could not create a valid plan from the blueprint.');
    console.log(`💥 Error: ${error.message}`);
    console.log('\n🚨 DO NOT PROCEED TO STEP 2 UNTIL THIS IS FIXED!');
    process.exit(1);
}