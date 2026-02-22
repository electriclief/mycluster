#!/usr/bin/env node
/**
 * Auto-generate release notes from git commits
 * 
 * Usage: node scripts/generate-release-notes.js v0.0.2
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

const version = process.argv[2] || 'v0.0.2';
const rootDir = import.meta.dirname.replace('/scripts', '');

function getCommitsSinceTag(tag) {
  try {
    // Try to get commits since last tag
    const result = execSync(`git log ${tag}..HEAD --pretty=format:"%h|%s|%b"`, {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    return result.trim().split('\n').filter(line => line);
  } catch {
    // If tag doesn't exist, get last 50 commits
    const result = execSync('git log -50 --pretty=format:"%h|%s|%b"', {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    return result.trim().split('\n').filter(line => line);
  }
}

function parseCommit(line) {
  const [hash, ...messageParts] = line.split('|');
  const subject = messageParts[0] || '';
  const body = messageParts.slice(1).join('\n') || '';
  
  // Parse conventional commit type
  const match = subject.match(/^(feat|fix|docs|style|refactor|test|chore)(?:\(([^)]+)\))?:\s*(.+)/);
  
  if (match) {
    return {
      hash,
      type: match[1],
      scope: match[2],
      subject: match[3],
      body,
    };
  }
  
  return {
    hash,
    type: 'other',
    scope: null,
    subject,
    body,
  };
}

function generateReleaseNotes(version, commits) {
  const parsed = commits.map(parseCommit);
  
  const sections = {
    feat: [],
    fix: [],
    docs: [],
    refactor: [],
    test: [],
    other: [],
  };
  
  parsed.forEach(commit => {
    if (sections[commit.type]) {
      sections[commit.type].push(commit);
    } else {
      sections.other.push(commit);
    }
  });
  
  let notes = `# MyCluster ${version}\n\n`;
  notes += `**Release Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  
  // Features
  if (sections.feat.length > 0) {
    notes += `## 🚀 New Features\n\n`;
    sections.feat.forEach(c => {
      notes += `- ${c.subject} ([${c.hash.substring(0, 7)}](https://github.com/electriclief/mycluster/commit/${c.hash}))\n`;
      if (c.scope) notes += `  - *Scope:* ${c.scope}\n`;
    });
    notes += '\n';
  }
  
  // Fixes
  if (sections.fix.length > 0) {
    notes += `## 🐛 Bug Fixes\n\n`;
    sections.fix.forEach(c => {
      notes += `- ${c.subject} ([${c.hash.substring(0, 7)}](https://github.com/electriclief/mycluster/commit/${c.hash}))\n`;
    });
    notes += '\n';
  }
  
  // Documentation
  if (sections.docs.length > 0) {
    notes += `## 📚 Documentation\n\n`;
    sections.docs.forEach(c => {
      notes += `- ${c.subject} ([${c.hash.substring(0, 7)}](https://github.com/electriclief/mycluster/commit/${c.hash}))\n`;
    });
    notes += '\n';
  }
  
  // Refactoring
  if (sections.refactor.length > 0) {
    notes += `## ♻️ Refactoring\n\n`;
    sections.refactor.forEach(c => {
      notes += `- ${c.subject} ([${c.hash.substring(0, 7)}](https://github.com/electriclief/mycluster/commit/${c.hash}))\n`;
    });
    notes += '\n';
  }
  
  // Tests
  if (sections.test.length > 0) {
    notes += `## ✅ Tests\n\n`;
    sections.test.forEach(c => {
      notes += `- ${c.subject} ([${c.hash.substring(0, 7)}](https://github.com/electriclief/mycluster/commit/${c.hash}))\n`;
    });
    notes += '\n';
  }
  
  // Other
  if (sections.other.length > 0) {
    notes += `## 📦 Other Changes\n\n`;
    sections.other.forEach(c => {
      notes += `- ${c.subject} ([${c.hash.substring(0, 7)}](https://github.com/electriclief/mycluster/commit/${c.hash}))\n`;
    });
    notes += '\n';
  }
  
  // Installation
  notes += `## 📥 Installation\n\n`;
  notes += `### Windows\n\n`;
  notes += `- **Installer:** Download \`MyCluster Setup ${version.substring(1)}.exe\`\n`;
  notes += `- **Portable:** Download \`MyCluster ${version.substring(1)}.exe\`\n\n`;
  
  // What's new summary
  notes += `## ⭐ Highlights\n\n`;
  notes += `- Phase R8 Production Hardening COMPLETE\n`;
  notes += `- File storage & results management\n`;
  notes += `- Service plugin architecture\n`;
  notes += `- Automatic API key authentication\n`;
  notes += `- Comprehensive audit logging\n`;
  notes += `- Docker & systemd deployment\n`;
  notes += `- E2E testing with Playwright\n`;
  notes += `- Performance benchmarks\n\n`;
  
  return notes;
}

// Main execution
console.log(`📝 Generating release notes for ${version}...\n`);

const commits = getCommitsSinceTag('v0.0.1');
console.log(`Found ${commits.length} commits since v0.0.1\n`);

const notes = generateReleaseNotes(version, commits);

// Write to file
const outputPath = join(rootDir, 'RELEASE_NOTES.md');
writeFileSync(outputPath, notes, 'utf-8');

console.log(`✅ Release notes written to: ${outputPath}\n`);
console.log('--- Preview ---\n');
console.log(notes);
