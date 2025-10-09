#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYZING 42 PACKAGE.JSON FILES...\n');

// Read all package.json files
const packages = fs.readFileSync('package-audit.txt', 'utf8').split('\n').filter(Boolean);
const analysis = {
  total: packages.length,
  deps: {},
  devDeps: {},
  types: {},
  conflicts: [],
  duplicates: {}
};

packages.forEach(pkgPath => {
  try {
    const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const name = content.name || path.dirname(pkgPath);
    
    // Track module types
    analysis.types[pkgPath] = content.type || 'commonjs';
    
    // Collect dependencies
    Object.entries(content.dependencies || {}).forEach(([dep, version]) => {
      if (!analysis.deps[dep]) analysis.deps[dep] = {};
      analysis.deps[dep][pkgPath] = version;
    });
    
    // Collect devDependencies  
    Object.entries(content.devDependencies || {}).forEach(([dep, version]) => {
      if (!analysis.devDeps[dep]) analysis.devDeps[dep] = {};
      analysis.devDeps[dep][pkgPath] = version;
    });
    
  } catch (error) {
    console.log(`❌ Error reading ${pkgPath}: ${error.message}`);
  }
});

// Find version conflicts
Object.entries(analysis.deps).forEach(([dep, locations]) => {
  const versions = Object.values(locations);
  const uniqueVersions = [...new Set(versions)];
  if (uniqueVersions.length > 1) {
    analysis.conflicts.push({
      dependency: dep,
      versions: uniqueVersions,
      locations: Object.keys(locations).length
    });
  }
  if (Object.keys(locations).length > 1) {
    analysis.duplicates[dep] = Object.keys(locations).length;
  }
});

// Report results
console.log(`📊 DEPENDENCY ANALYSIS RESULTS:`);
console.log(`Total package.json files: ${analysis.total}`);
console.log(`Unique dependencies: ${Object.keys(analysis.deps).length}`);
console.log(`Unique devDependencies: ${Object.keys(analysis.devDeps).length}`);
console.log(`Version conflicts: ${analysis.conflicts.length}`);
console.log(`Duplicate dependencies: ${Object.keys(analysis.duplicates).length}\n`);

// Module type breakdown
const moduleTypes = {};
Object.values(analysis.types).forEach(type => {
  moduleTypes[type] = (moduleTypes[type] || 0) + 1;
});
console.log(`📦 MODULE TYPES:`);
Object.entries(moduleTypes).forEach(([type, count]) => {
  console.log(`  ${type}: ${count} files`);
});
console.log();

// Top conflicts
if (analysis.conflicts.length > 0) {
  console.log(`⚠️  TOP VERSION CONFLICTS:`);
  analysis.conflicts
    .sort((a, b) => b.locations - a.locations)
    .slice(0, 10)
    .forEach(conflict => {
      console.log(`  ${conflict.dependency}: ${conflict.versions.join(' vs ')} (${conflict.locations} locations)`);
    });
  console.log();
}

// Most duplicated
if (Object.keys(analysis.duplicates).length > 0) {
  console.log(`🔁 MOST DUPLICATED DEPENDENCIES:`);
  Object.entries(analysis.duplicates)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([dep, count]) => {
      console.log(`  ${dep}: ${count} copies`);
    });
  console.log();
}

// Critical paths for consolidation
const criticalPaths = packages.filter(p => 
  p.includes('src/meta-agents') || 
  p.includes('packages/meta-agents') ||
  p === './package.json' ||
  p.includes('rag-system') ||
  p.includes('apps/lead-generation')
);

console.log(`🎯 CRITICAL PATHS FOR PHASE 0 (${criticalPaths.length} files):`);
criticalPaths.forEach(p => console.log(`  ${p}`));

// Save detailed analysis
fs.writeFileSync('dependency-analysis.json', JSON.stringify(analysis, null, 2));
console.log(`\n💾 Detailed analysis saved to dependency-analysis.json`);