/**
 * Git Integration - Automated Git Operations for PRD Parser Agent
 * 
 * Handles automated Git operations for committing generated tasks, documentation,
 * and tracking changes made by the PRD-Parser Agent.
 * 
 * Uses Context7 for current Git workflows and follows All-Purpose Pattern
 * for working with any Git repository structure.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class GitIntegration {
    constructor(config = {}) {
        this.config = {
            // Git command settings
            gitCmd: config.gitCmd || 'git',
            timeout: config.timeout || 30000, // 30 seconds
            
            // Commit message templates - All-Purpose Pattern (works for any agent)
            commitTemplates: config.commitTemplates || {
                taskGeneration: "Add TaskMaster tasks for {agentName} agent\n\n🤖 Generated with PRD-Parser Agent\n\nAgent: {agentName}\nRequirements: {requirementCount}\nTasks: {taskCount}\n\nFiles modified:\n{fileList}",
                prdUpdate: "Update PRD for {agentName} agent\n\n📝 PRD updated with new specifications\n\nAgent: {agentName}\nChanges: {changes}",
                documentation: "Update documentation for {agentName} agent\n\n📚 Documentation automatically updated\n\nAgent: {agentName}\nUpdated files: {fileList}"
            },
            
            // Branch strategy - UNLIMITED branch patterns
            branchStrategy: config.branchStrategy || {
                enabled: false, // Disabled by default to work with any workflow
                prefix: 'prd-parser',
                agentBranches: true // Create agent-specific branches
            },
            
            // Commit settings
            commitSettings: config.commitSettings || {
                addUntracked: true, // Add new files automatically
                signCommits: false, // Sign commits if GPG configured
                pushAfterCommit: false, // Push automatically (disabled by default)
                createPullRequest: false // Create PR (requires GitHub CLI)
            },
            
            // Context7 integration
            useContext7: config.useContext7 !== false,
            contextPrompts: config.contextPrompts || {
                gitWorkflow: "Use latest Git workflow patterns for automated commits. use context7",
                branchStrategy: "Apply modern Git branching strategies for automation. use context7"
            },

            ...config
        };

        // Git status cache
        this.statusCache = new Map();
        this.statusCacheTimeout = 5000; // 5 seconds
    }

    /**
     * Commit changes with descriptive message
     * Main entry point for Git operations
     */
    async commitChanges(filePaths, message, options = {}) {
        try {
            const startTime = Date.now();
            
            console.log(`📝 Committing changes: ${filePaths.length} files`);

            if (this.config.useContext7) {
                console.log('🔧 Using Context7 for Git workflow');
            }

            // Step 1: Validate Git repository
            await this.validateGitRepository();

            // Step 2: Check current Git status
            const status = await this.getGitStatus();

            // Step 3: Stage files for commit
            await this.stageFiles(filePaths);

            // Step 4: Create commit with message
            const commitHash = await this.createCommit(message, options);

            // Step 5: Post-commit actions (push, PR, etc.)
            await this.postCommitActions(commitHash, options);

            const processingTime = Date.now() - startTime;

            console.log(`✅ Git commit completed: ${commitHash.substring(0, 8)} (${processingTime}ms)`);

            return {
                success: true,
                commitHash,
                message,
                filePaths,
                processingTime,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`Git integration failed: ${error.message}`);
        }
    }

    /**
     * Generate commit message for task generation
     */
    generateTaskCommitMessage(agentName, requirementCount, taskCount, filePaths) {
        const template = this.config.commitTemplates.taskGeneration;
        const fileList = filePaths.map(fp => `- ${path.relative(process.cwd(), fp)}`).join('\n');
        
        return this.interpolateTemplate(template, {
            agentName,
            requirementCount,
            taskCount,
            fileList
        });
    }

    /**
     * Generate commit message for PRD updates
     */
    generatePRDCommitMessage(agentName, changes) {
        const template = this.config.commitTemplates.prdUpdate;
        
        return this.interpolateTemplate(template, {
            agentName,
            changes: Array.isArray(changes) ? changes.join(', ') : changes
        });
    }

    /**
     * Generate commit message for documentation updates
     */
    generateDocumentationCommitMessage(agentName, filePaths) {
        const template = this.config.commitTemplates.documentation;
        const fileList = filePaths.map(fp => path.basename(fp)).join(', ');
        
        return this.interpolateTemplate(template, {
            agentName,
            fileList
        });
    }

    /**
     * Validate that we're in a Git repository
     */
    async validateGitRepository() {
        try {
            await this.executeGitCommand(['rev-parse', '--git-dir']);
        } catch (error) {
            throw new Error('Not in a Git repository. Initialize Git first: git init');
        }
    }

    /**
     * Get current Git status with caching
     */
    async getGitStatus() {
        const cacheKey = 'git_status';
        const cached = this.statusCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.statusCacheTimeout) {
            return cached.status;
        }

        try {
            const output = await this.executeGitCommand(['status', '--porcelain']);
            const status = this.parseGitStatus(output);
            
            this.statusCache.set(cacheKey, {
                status,
                timestamp: Date.now()
            });
            
            return status;
            
        } catch (error) {
            throw new Error(`Failed to get Git status: ${error.message}`);
        }
    }

    /**
     * Parse Git status output
     */
    parseGitStatus(output) {
        const lines = output.trim().split('\n').filter(line => line.length > 0);
        const status = {
            modified: [],
            added: [],
            deleted: [],
            untracked: [],
            staged: [],
            unstaged: []
        };

        for (const line of lines) {
            const statusCode = line.substring(0, 2);
            const filePath = line.substring(3);

            // Parse Git status codes
            const indexStatus = statusCode[0];
            const workingTreeStatus = statusCode[1];

            if (indexStatus !== ' ' && indexStatus !== '?') {
                status.staged.push(filePath);
                
                if (indexStatus === 'A') status.added.push(filePath);
                else if (indexStatus === 'M') status.modified.push(filePath);
                else if (indexStatus === 'D') status.deleted.push(filePath);
            }

            if (workingTreeStatus !== ' ') {
                status.unstaged.push(filePath);
                
                if (workingTreeStatus === '?') status.untracked.push(filePath);
                else if (workingTreeStatus === 'M') status.modified.push(filePath);
                else if (workingTreeStatus === 'D') status.deleted.push(filePath);
            }
        }

        return status;
    }

    /**
     * Stage files for commit
     */
    async stageFiles(filePaths) {
        const validPaths = [];
        
        // Validate that files exist
        for (const filePath of filePaths) {
            try {
                await fs.access(filePath);
                validPaths.push(filePath);
            } catch (error) {
                console.warn(`⚠️  File not found, skipping: ${filePath}`);
            }
        }

        if (validPaths.length === 0) {
            throw new Error('No valid files to stage');
        }

        try {
            // Stage the valid files
            await this.executeGitCommand(['add', ...validPaths]);
            
            // Add untracked files if configured
            if (this.config.commitSettings.addUntracked) {
                const status = await this.getGitStatus();
                const untrackedInPaths = status.untracked.filter(untracked => 
                    validPaths.some(validPath => 
                        path.resolve(untracked) === path.resolve(validPath)
                    )
                );
                
                if (untrackedInPaths.length > 0) {
                    await this.executeGitCommand(['add', ...untrackedInPaths]);
                }
            }

            console.log(`📁 Staged ${validPaths.length} files for commit`);
            return validPaths;
            
        } catch (error) {
            throw new Error(`Failed to stage files: ${error.message}`);
        }
    }

    /**
     * Create Git commit
     */
    async createCommit(message, options = {}) {
        try {
            // Build commit command
            const commitArgs = ['commit', '-m', message];
            
            // Add commit options
            if (this.config.commitSettings.signCommits) {
                commitArgs.push('-S');
            }

            if (options.author) {
                commitArgs.push('--author', options.author);
            }

            // Execute commit
            const output = await this.executeGitCommand(commitArgs);
            
            // Extract commit hash
            const commitHash = await this.getLatestCommitHash();
            
            console.log(`📝 Created commit: ${commitHash.substring(0, 8)}`);
            console.log(`💬 Message: ${message.split('\n')[0]}`);
            
            return commitHash;
            
        } catch (error) {
            // Handle common commit errors
            if (error.message.includes('nothing to commit')) {
                throw new Error('No changes to commit');
            }
            
            throw new Error(`Failed to create commit: ${error.message}`);
        }
    }

    /**
     * Get latest commit hash
     */
    async getLatestCommitHash() {
        try {
            const output = await this.executeGitCommand(['rev-parse', 'HEAD']);
            return output.trim();
        } catch (error) {
            throw new Error(`Failed to get commit hash: ${error.message}`);
        }
    }

    /**
     * Post-commit actions (push, PR creation, etc.)
     */
    async postCommitActions(commitHash, options = {}) {
        const actions = [];

        try {
            // Push to remote if configured
            if (this.config.commitSettings.pushAfterCommit) {
                await this.pushToRemote();
                actions.push('pushed to remote');
            }

            // Create pull request if configured
            if (this.config.commitSettings.createPullRequest) {
                const prUrl = await this.createPullRequest(commitHash, options);
                if (prUrl) {
                    console.log(`🔄 Created pull request: ${prUrl}`);
                    actions.push('created pull request');
                }
            }

            if (actions.length > 0) {
                console.log(`📤 Post-commit actions: ${actions.join(', ')}`);
            }

        } catch (error) {
            console.warn(`⚠️  Post-commit actions failed: ${error.message}`);
            // Don't fail the entire operation for post-commit issues
        }
    }

    /**
     * Push to remote repository
     */
    async pushToRemote() {
        try {
            const currentBranch = await this.getCurrentBranch();
            await this.executeGitCommand(['push', 'origin', currentBranch]);
            console.log(`📤 Pushed to origin/${currentBranch}`);
        } catch (error) {
            throw new Error(`Failed to push to remote: ${error.message}`);
        }
    }

    /**
     * Get current branch name
     */
    async getCurrentBranch() {
        try {
            const output = await this.executeGitCommand(['branch', '--show-current']);
            return output.trim();
        } catch (error) {
            // Fallback for older Git versions
            const output = await this.executeGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
            return output.trim();
        }
    }

    /**
     * Create pull request using GitHub CLI (if available)
     */
    async createPullRequest(commitHash, options = {}) {
        try {
            // Check if GitHub CLI is available
            await this.executeCommand('gh', ['--version']);
            
            const currentBranch = await this.getCurrentBranch();
            const commitMessage = await this.getCommitMessage(commitHash);
            const title = commitMessage.split('\n')[0];
            const body = commitMessage.split('\n').slice(1).join('\n').trim();
            
            const args = [
                'pr', 'create',
                '--title', title,
                '--body', body || 'Automated PR created by PRD-Parser Agent',
                '--head', currentBranch
            ];

            const output = await this.executeCommand('gh', args);
            return this.extractPullRequestUrl(output);
            
        } catch (error) {
            console.warn('GitHub CLI not available or PR creation failed');
            return null;
        }
    }

    /**
     * Get commit message for a specific commit hash
     */
    async getCommitMessage(commitHash) {
        try {
            const output = await this.executeGitCommand(['log', '--format=%B', '-n', '1', commitHash]);
            return output.trim();
        } catch (error) {
            throw new Error(`Failed to get commit message: ${error.message}`);
        }
    }

    /**
     * Extract PR URL from GitHub CLI output
     */
    extractPullRequestUrl(output) {
        const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
        return urlMatch ? urlMatch[0] : null;
    }

    /**
     * Execute Git command with error handling
     */
    async executeGitCommand(args) {
        return this.executeCommand(this.config.gitCmd, args);
    }

    /**
     * Execute shell command with timeout and error handling
     */
    executeCommand(command, args) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            const timeout = setTimeout(() => {
                process.kill('SIGTERM');
                reject(new Error(`Command timeout: ${command} ${args.join(' ')}`));
            }, this.config.timeout);

            process.on('close', (code) => {
                clearTimeout(timeout);

                if (code === 0) {
                    resolve(stdout);
                } else {
                    const errorMessage = stderr || stdout || `Command failed with exit code ${code}`;
                    reject(new Error(errorMessage));
                }
            });

            process.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    /**
     * Branch management methods
     */

    /**
     * Create agent-specific branch if configured
     */
    async createAgentBranch(agentName) {
        if (!this.config.branchStrategy.enabled) return null;

        try {
            const branchName = `${this.config.branchStrategy.prefix}/${agentName}`;
            
            // Check if branch already exists
            const branches = await this.executeGitCommand(['branch', '--list', branchName]);
            if (branches.trim()) {
                console.log(`🌿 Using existing branch: ${branchName}`);
                await this.executeGitCommand(['checkout', branchName]);
                return branchName;
            }

            // Create and checkout new branch
            await this.executeGitCommand(['checkout', '-b', branchName]);
            console.log(`🌿 Created new branch: ${branchName}`);
            return branchName;

        } catch (error) {
            console.warn(`⚠️  Branch creation failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Utility methods
     */

    interpolateTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{${key}}`;
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }
        return result;
    }

    /**
     * Check if Git is available
     */
    async isGitAvailable() {
        try {
            await this.executeGitCommand(['--version']);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get repository information
     */
    async getRepositoryInfo() {
        try {
            const remoteUrl = await this.executeGitCommand(['remote', 'get-url', 'origin']);
            const currentBranch = await this.getCurrentBranch();
            const latestCommit = await this.getLatestCommitHash();
            
            return {
                remoteUrl: remoteUrl.trim(),
                currentBranch,
                latestCommit,
                shortCommit: latestCommit.substring(0, 8)
            };
        } catch (error) {
            throw new Error(`Failed to get repository info: ${error.message}`);
        }
    }

    /**
     * Validate files exist before operations
     */
    async validateFiles(filePaths) {
        const validFiles = [];
        const invalidFiles = [];

        for (const filePath of filePaths) {
            try {
                await fs.access(filePath);
                validFiles.push(filePath);
            } catch (error) {
                invalidFiles.push(filePath);
            }
        }

        return { validFiles, invalidFiles };
    }

    /**
     * Check if there are uncommitted changes
     */
    async hasUncommittedChanges() {
        try {
            const status = await this.getGitStatus();
            return status.staged.length > 0 || status.unstaged.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get file diff for specific files
     */
    async getFileDiff(filePaths) {
        try {
            const diffs = {};
            
            for (const filePath of filePaths) {
                try {
                    const output = await this.executeGitCommand(['diff', '--', filePath]);
                    if (output.trim()) {
                        diffs[filePath] = output;
                    }
                } catch (error) {
                    console.warn(`⚠️  Could not get diff for ${filePath}: ${error.message}`);
                }
            }
            
            return diffs;
        } catch (error) {
            throw new Error(`Failed to get file diff: ${error.message}`);
        }
    }

    /**
     * Clean up method to clear caches
     */
    cleanup() {
        this.statusCache.clear();
    }
}

module.exports = GitIntegration;