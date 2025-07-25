#!/usr/bin/env node

/**
 * UEP Verification Script
 * 
 * Quick check to verify your Universal Execution Protocol is working correctly.
 * Run this after setup to ensure everything is functional.
 */

const fs = require('fs').promises;
const path = require('path');

async function verifyUEP() {
  console.log('🔍 Verifying Universal Execution Protocol Setup...\n');

  let score = 0;
  const checks = [];

  // Check 1: TypeScript Compilation
  console.log('1. Checking TypeScript compilation...');
  try {
    await fs.access('dist/uep/cli.js');
    await fs.access('dist/uep/UEPAgentWrapper.js');
    await fs.access('dist/uep/ProtocolProcessor.js');
    console.log('✅ UEP TypeScript modules compiled');
    score += 20;
    checks.push({ name: 'TypeScript Compilation', status: '✅ PASS' });
  } catch (error) {
    console.log('❌ UEP TypeScript modules not found');
    console.log('   Run: npx tsc src/uep/*.ts --outDir dist');
    checks.push({ name: 'TypeScript Compilation', status: '❌ FAIL', fix: 'npx tsc src/uep/*.ts --outDir dist' });
  }

  // Check 2: Dependencies
  console.log('\n2. Checking dependencies...');
  try {
    require('dotenv');
    require('fs-extra');
    require('zod');
    console.log('✅ Required dependencies available');
    score += 15;
    checks.push({ name: 'Dependencies', status: '✅ PASS' });
  } catch (error) {
    console.log('❌ Missing dependencies');
    console.log('   Run: npm install dotenv fs-extra zod');
    checks.push({ name: 'Dependencies', status: '❌ FAIL', fix: 'npm install dotenv fs-extra zod' });
  }

  // Check 3: UEP Module Import
  console.log('\n3. Checking UEP module import...');
  try {
    const { createUEPMetaAgentFactory } = require('./src/meta-agents/UEPMetaAgentFactory');
    console.log('✅ UEP factory module imports successfully');
    score += 20;
    checks.push({ name: 'UEP Module Import', status: '✅ PASS' });
  } catch (error) {
    console.log('❌ UEP factory module import failed');
    console.log(`   Error: ${error.message}`);
    checks.push({ name: 'UEP Module Import', status: '❌ FAIL', error: error.message });
  }

  // Check 4: CLI Availability
  console.log('\n4. Checking CLI availability...');
  try {
    await fs.access('dist/uep/cli.js');
    // Test CLI help (basic check)
    const { spawn } = require('child_process');
    const cliTest = new Promise((resolve, reject) => {
      const proc = spawn('node', ['dist/uep/cli.js', '--help'], { timeout: 5000 });
      let output = '';
      proc.stdout.on('data', data => output += data.toString());
      proc.on('close', code => {
        if (output.includes('Universal Execution Protocol CLI')) {
          resolve(true);
        } else {
          reject(new Error('CLI output unexpected'));
        }
      });
      proc.on('error', reject);
    });
    
    await cliTest;
    console.log('✅ UEP CLI is functional');
    score += 20;
    checks.push({ name: 'CLI Availability', status: '✅ PASS' });
  } catch (error) {
    console.log('❌ UEP CLI not working properly');
    console.log(`   Error: ${error.message}`);
    checks.push({ name: 'CLI Availability', status: '❌ FAIL', error: error.message });
  }

  // Check 5: Enhanced Agents
  console.log('\n5. Checking enhanced agents...');
  try {
    const EnhancedPRDParser = require('./src/meta-agents/enhanced-prd-parser');
    const { EnhancedScaffoldGenerator } = require('./src/meta-agents/enhanced-scaffold-generator');
    console.log('✅ Enhanced agents available');
    score += 15;
    checks.push({ name: 'Enhanced Agents', status: '✅ PASS' });
  } catch (error) {
    console.log('❌ Enhanced agents not available');
    console.log(`   Error: ${error.message}`);
    checks.push({ name: 'Enhanced Agents', status: '❌ FAIL', error: error.message });
  }

  // Check 6: Basic UEP Factory Test
  console.log('\n6. Testing UEP factory creation...');
  try {
    const { createUEPMetaAgentFactory } = require('./src/meta-agents/UEPMetaAgentFactory');
    const factory = await createUEPMetaAgentFactory({
      enableUEP: true,
      logLevel: 'silent'
    });
    
    // Quick test
    const isInitialized = factory.isInitialized;
    await factory.cleanup();
    
    if (isInitialized) {
      console.log('✅ UEP factory creation successful');
      score += 10;
      checks.push({ name: 'UEP Factory Test', status: '✅ PASS' });
    } else {
      throw new Error('Factory not properly initialized');
    }
  } catch (error) {
    console.log('❌ UEP factory creation failed');
    console.log(`   Error: ${error.message}`);
    checks.push({ name: 'UEP Factory Test', status: '❌ FAIL', error: error.message });
  }

  // Results Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 UEP Verification Results');
  console.log('═'.repeat(60));
  
  checks.forEach(check => {
    console.log(`${check.status} ${check.name}`);
    if (check.fix) {
      console.log(`    Fix: ${check.fix}`);
    }
    if (check.error && !check.fix) {
      console.log(`    Error: ${check.error.substring(0, 80)}...`);
    }
  });

  console.log('═'.repeat(60));
  console.log(`Overall Score: ${score}/100`);
  
  if (score >= 85) {
    console.log('🎉 UEP is fully functional and ready to use!');
    console.log('\n💡 Next steps:');
    console.log('   1. Try: node dist/uep/cli.js --interactive');
    console.log('   2. Create a PRD file in docs/ folder');
    console.log('   3. Start enhanced agents with UEP benefits');
    return true;
  } else if (score >= 60) {
    console.log('⚠️ UEP is partially functional but needs fixes');
    console.log('\n🔧 Priority fixes needed:');
    checks.filter(c => c.status.includes('❌')).forEach(c => {
      if (c.fix) console.log(`   - ${c.fix}`);
    });
    return false;
  } else {
    console.log('❌ UEP needs significant setup work');
    console.log('\n🆘 Start with these commands:');
    console.log('   1. npx tsc src/uep/*.ts --outDir dist');
    console.log('   2. npm install dotenv fs-extra zod');
    console.log('   3. node verify-uep.js (run this again)');
    return false;
  }
}

// Quick Usage Guide
function showQuickGuide() {
  console.log('\n📚 Quick UEP Usage Guide:');
  console.log('─'.repeat(40));
  
  console.log('\n🧠 For Enhanced Human Prompts:');
  console.log('   node dist/uep/cli.js --interactive');
  console.log('   (Then type your development questions)');
  
  console.log('\n🤖 For Enhanced Meta-Agents:');
  console.log('   const factory = await createUEPMetaAgentFactory();');
  console.log('   const agent = await factory.createAgent("prd-parser", "my-parser");');
  
  console.log('\n📋 For PRD Processing:');
  console.log('   1. Put PRD in docs/prd_my-agent.md');
  console.log('   2. node src/meta-agents/enhanced-prd-parser.js');
  
  console.log('\n🏗️ For Agent Creation:');
  console.log('   node src/meta-agents/enhanced-scaffold-generator.js \\');
  console.log('     generate ./my-prd.json --collision-detection');
  
  console.log('\n📖 Full documentation: UEP_QUICK_START.md');
}

// Main execution
if (require.main === module) {
  verifyUEP().then(success => {
    if (success) {
      showQuickGuide();
      console.log('\n✨ UEP verification completed successfully!');
      process.exit(0);
    } else {
      console.log('\n🔧 Please fix the issues above and run verify-uep.js again');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Verification failed:', error.message);
    console.log('\n🆘 If problems persist, check UEP_QUICK_START.md for troubleshooting');
    process.exit(1);
  });
}

module.exports = { verifyUEP };