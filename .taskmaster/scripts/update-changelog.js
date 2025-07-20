#!/usr/bin/env node

/**
 * Simple changelog updater script
 * Run with: node .taskmaster/scripts/update-changelog.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
};

const getCurrentBranch = () => {
  try {
    const { execSync } = require('child_process');
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'unknown';
  }
};

async function updateChangelog() {
  console.log('🚀 Solar Lead System - Changelog Updater\n');

  try {
    // Get version info
    const version = await ask('Version (e.g., v1.2.0): ');
    const description = await ask('Brief description: ');
    const status = await ask('Status (✅ WORKING / 🔶 PARTIAL / 🔴 BROKEN): ');
    
    console.log('\n📝 What changed?');
    const bugsFix = await ask('Bugs fixed (or press Enter to skip): ');
    const newFeatures = await ask('New features (or press Enter to skip): ');
    const improvements = await ask('Improvements (or press Enter to skip): ');
    const knownIssues = await ask('Known issues (or press Enter to skip): ');
    const lessonsLearned = await ask('Lessons learned (or press Enter to skip): ');

    // Build the changelog entry
    const date = getCurrentDate();
    const branch = getCurrentBranch();
    
    let entry = `\n### ${version} - ${date} (${description.toUpperCase()})\n`;
    entry += `**Status**: ${status}\n`;
    entry += `**Branch**: \`${branch}\`\n\n`;

    if (bugsFix) {
      entry += `#### 🐛 BUGS FIXED\n- ${bugsFix}\n\n`;
    }

    if (newFeatures) {
      entry += `#### ✨ NEW FEATURES\n- ${newFeatures}\n\n`;
    }

    if (improvements) {
      entry += `#### 🔧 IMPROVEMENTS\n- ${improvements}\n\n`;
    }

    if (knownIssues) {
      entry += `#### 🚨 KNOWN ISSUES\n- ${knownIssues}\n\n`;
    }

    if (lessonsLearned) {
      entry += `#### 🧠 LESSONS LEARNED\n- ${lessonsLearned}\n\n`;
    }

    entry += `---\n`;

    // Read current changelog
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    const changelog = fs.readFileSync(changelogPath, 'utf8');

    // Find where to insert (after the VERSION HISTORY header)
    const insertPoint = changelog.indexOf('## 🏷️ VERSION HISTORY') + '## 🏷️ VERSION HISTORY'.length;
    const newChangelog = changelog.slice(0, insertPoint) + '\n' + entry + changelog.slice(insertPoint + 1);

    // Write back to file
    fs.writeFileSync(changelogPath, newChangelog);

    console.log('\n✅ Changelog updated successfully!');
    console.log('📁 Updated: CHANGELOG.md');
    
    const shouldCommit = await ask('\n🔄 Commit changes to git? (y/n): ');
    if (shouldCommit.toLowerCase() === 'y') {
      const { execSync } = require('child_process');
      try {
        execSync('git add CHANGELOG.md');
        execSync(`git commit -m "Update changelog: ${version} - ${description}"`);
        console.log('✅ Changes committed to git!');
      } catch (error) {
        console.log('❌ Git commit failed:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error updating changelog:', error.message);
  } finally {
    rl.close();
  }
}

// Run the updater
updateChangelog(); 