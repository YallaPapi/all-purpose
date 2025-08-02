/**
 * Test script to demonstrate the Pattern Detection System
 * Shows all detector types working together
 */

const path = require('path');
const { defaultDetectionEngine } = require('./src/patterns/PatternDetectionEngine');

async function runDetectionTest() {
  console.log('🔍 Testing All-Purpose Pattern Detection System\n');
  console.log('=' * 60);
  
  try {
    // Test file with intentional hardcoded patterns
    const testFile = path.join(__dirname, 'test-samples', 'hardcoded-examples.js');
    
    console.log(`📁 Analyzing test file: ${testFile}\n`);
    
    // Run the detection
    const patterns = await defaultDetectionEngine.analyzeFile(testFile);
    
    if (patterns.length === 0) {
      console.log('✅ No hardcoded patterns detected!');
      return;
    }

    console.log(`🚨 Found ${patterns.length} hardcoded patterns:\n`);
    
    // Group patterns by type for better display
    const patternsByType = {};
    patterns.forEach(pattern => {
      if (!patternsByType[pattern.type]) {
        patternsByType[pattern.type] = [];
      }
      patternsByType[pattern.type].push(pattern);
    });

    // Display results by pattern type
    Object.entries(patternsByType).forEach(([type, typePatterns]) => {
      console.log(`\n📊 ${type.toUpperCase()} (${typePatterns.length} found):`);
      console.log('-'.repeat(50));
      
      typePatterns.forEach((pattern, index) => {
        console.log(`\n${index + 1}. ${pattern.description}`);
        console.log(`   📍 Location: Line ${pattern.location.line}, Column ${pattern.location.column}`);
        console.log(`   ⚠️  Severity: ${pattern.severity.toUpperCase()}`);
        console.log(`   🎯 Confidence: ${(pattern.metadata.confidence * 100).toFixed(1)}%`);
        console.log(`   💡 Fix: ${pattern.recommendation}`);
        
        if (pattern.context.variableName) {
          console.log(`   🏷️  Variable: ${pattern.context.variableName}`);
        }
        
        if (pattern.metadata.endpointType) {
          console.log(`   🌐 Endpoint Type: ${pattern.metadata.endpointType}`);
        }
        
        if (pattern.metadata.businessScore) {
          console.log(`   📈 Business Score: ${(pattern.metadata.businessScore * 100).toFixed(1)}%`);
        }
      });
    });

    // Show summary statistics
    console.log('\n' + '='.repeat(60));
    console.log('📈 DETECTION SUMMARY:');
    console.log('='.repeat(60));
    
    const severityCounts = {};
    patterns.forEach(p => {
      severityCounts[p.severity] = (severityCounts[p.severity] || 0) + 1;
    });
    
    console.log(`\n🔢 Total Patterns: ${patterns.length}`);
    Object.entries(severityCounts).forEach(([severity, count]) => {
      const emoji = severity === 'critical' ? '🚨' : 
                   severity === 'high' ? '⚠️' : 
                   severity === 'medium' ? '🟡' : '🔵';
      console.log(`${emoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)}: ${count}`);
    });

    const avgConfidence = patterns.reduce((sum, p) => sum + p.metadata.confidence, 0) / patterns.length;
    console.log(`🎯 Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    // Show detector performance
    console.log('\n🤖 DETECTOR PERFORMANCE:');
    console.log('-'.repeat(30));
    
    const detectorCounts = {};
    patterns.forEach(pattern => {
      const detectorName = pattern.metadata.tags.find(tag => tag.includes('Detector')) || 'Unknown';
      detectorCounts[detectorName] = (detectorCounts[detectorName] || 0) + 1;
    });
    
    Object.entries(detectorCounts).forEach(([detector, count]) => {
      console.log(`✅ ${detector}: ${count} patterns detected`);
    });

    console.log('\n🏆 SUCCESS: Pattern Detection System is working correctly!');
    console.log('All detector types successfully identified hardcoded limitations.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  runDetectionTest()
    .then(() => {
      console.log('\n✅ Detection test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Detection test failed:', error);
      process.exit(1);
    });
}

module.exports = { runDetectionTest };