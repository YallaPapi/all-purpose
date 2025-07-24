/**
 * GitHub Repository Analysis Service
 * Analyzes GitHub repositories to extract technical concepts, technologies, and patterns
 */

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  language: string;
  topics: string[];
  starCount: number;
  forkCount: number;
  lastUpdated: string;
  readmeContent?: string;
  packageJson?: any;
  technologies: string[];
  frameworks: string[];
  patterns: string[];
  codeComplexity: 'simple' | 'medium' | 'complex';
  hasDocumentation: boolean;
  hasTests: boolean;
  hasCI: boolean;
  projectType: string;
  relevanceScore?: number;
}

interface RepositoryFile {
  name: string;
  path: string;
  content: string;
  type: string;
  size: number;
}

interface CodeAnalysis {
  technologies: string[];
  frameworks: string[];
  patterns: string[];
  dependencies: string[];
  complexity: 'simple' | 'medium' | 'complex';
  concepts: string[];
}

export class GitHubAnalysisService {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Search for repositories based on Claude Code related topics
   */
  async searchClaudeCodeRepositories(): Promise<GitHubRepository[]> {
    const searchQueries = [
      'claude+code+tutorial',
      'anthropic+claude+project',
      'claude+ai+automation',
      'claude+development+workflow',
      'claude+api+integration',
      'claude+coding+assistant',
      'ai+coding+anthropic',
      'claude+prompt+engineering'
    ];

    const allRepos: GitHubRepository[] = [];
    const seenRepoIds = new Set<number>();

    for (const query of searchQueries) {
      try {
        const repos = await this.searchRepositories(query);
        
        for (const repo of repos) {
          if (!seenRepoIds.has(repo.id)) {
            seenRepoIds.add(repo.id);
            allRepos.push(repo);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }
    }

    return allRepos;
  }

  /**
   * Search repositories with a specific query
   */
  async searchRepositories(query: string, maxResults = 30): Promise<GitHubRepository[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search/repositories?` + new URLSearchParams({
          q: query,
          sort: 'stars',
          order: 'desc',
          per_page: maxResults.toString()
        }),
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const repositories: GitHubRepository[] = [];

      for (const item of data.items) {
        const repo = await this.analyzeRepository(item);
        if (repo) {
          repositories.push(repo);
        }
      }

      return repositories;
    } catch (error) {
      console.error('Error searching GitHub repositories:', error);
      throw error;
    }
  }

  /**
   * Analyze a specific repository in detail
   */
  async analyzeRepository(repoData: any): Promise<GitHubRepository | null> {
    try {
      const repo: GitHubRepository = {
        id: repoData.id,
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description || '',
        url: repoData.html_url,
        language: repoData.language || 'Unknown',
        topics: repoData.topics || [],
        starCount: repoData.stargazers_count,
        forkCount: repoData.forks_count,
        lastUpdated: repoData.updated_at,
        technologies: [],
        frameworks: [],
        patterns: [],
        codeComplexity: 'medium',
        hasDocumentation: false,
        hasTests: false,
        hasCI: false,
        projectType: 'Unknown'
      };

      // Analyze repository contents
      await this.analyzeRepositoryContents(repo);

      return repo;
    } catch (error) {
      console.error(`Error analyzing repository ${repoData.full_name}:`, error);
      return null;
    }
  }

  /**
   * Analyze repository contents to extract detailed information
   */
  async analyzeRepositoryContents(repo: GitHubRepository): Promise<void> {
    try {
      // Get repository tree
      const files = await this.getRepositoryFiles(repo.fullName);
      
      // Analyze key files
      await this.analyzeKeyFiles(repo, files);
      
      // Determine project type and complexity
      this.determineProjectCharacteristics(repo, files);
      
      // Calculate relevance score
      repo.relevanceScore = this.calculateRelevanceScore(repo);
    } catch (error) {
      console.error(`Error analyzing contents for ${repo.fullName}:`, error);
    }
  }

  /**
   * Get list of files in repository
   */
  async getRepositoryFiles(fullName: string): Promise<RepositoryFile[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${fullName}/git/trees/main?recursive=1`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        // Try 'master' branch if 'main' doesn't exist
        const masterResponse = await fetch(
          `${this.baseUrl}/repos/${fullName}/git/trees/master?recursive=1`,
          {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (!masterResponse.ok) {
          throw new Error(`Could not get file tree for ${fullName}`);
        }
        
        const data = await masterResponse.json();
        return this.parseFileTree(data.tree);
      }

      const data = await response.json();
      return this.parseFileTree(data.tree);
    } catch (error) {
      console.error(`Error getting files for ${fullName}:`, error);
      return [];
    }
  }

  /**
   * Parse GitHub file tree into RepositoryFile objects
   */
  private parseFileTree(tree: any[]): RepositoryFile[] {
    return tree
      .filter(item => item.type === 'blob')
      .map(item => ({
        name: item.path.split('/').pop() || '',
        path: item.path,
        content: '', // Will be fetched separately if needed
        type: this.getFileType(item.path),
        size: item.size || 0
      }));
  }

  /**
   * Determine file type based on extension
   */
  private getFileType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    
    const typeMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'json': 'config',
      'yaml': 'config',
      'yml': 'config',
      'toml': 'config',
      'md': 'documentation',
      'txt': 'documentation',
      'dockerfile': 'config',
      'sql': 'database'
    };

    return typeMap[extension || ''] || 'other';
  }

  /**
   * Analyze key files to extract technologies and patterns
   */
  async analyzeKeyFiles(repo: GitHubRepository, files: RepositoryFile[]): Promise<void> {
    const keyFiles = files.filter(file => 
      ['package.json', 'requirements.txt', 'Cargo.toml', 'pom.xml', 'go.mod', 'README.md', 'Dockerfile'].includes(file.name) ||
      file.path.includes('.github/workflows')
    );

    for (const file of keyFiles) {
      try {
        const content = await this.getFileContent(repo.fullName, file.path);
        if (content) {
          file.content = content;
          this.analyzeFileContent(repo, file);
        }
      } catch (error) {
        console.log(`Could not fetch content for ${file.path}`);
      }
    }
  }

  /**
   * Get content of a specific file
   */
  async getFileContent(fullName: string, filePath: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${fullName}/contents/${filePath}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.content && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze file content to extract technologies and patterns
   */
  private analyzeFileContent(repo: GitHubRepository, file: RepositoryFile): void {
    const content = file.content.toLowerCase();

    switch (file.name) {
      case 'package.json':
        this.analyzePackageJson(repo, file.content);
        break;
      case 'requirements.txt':
        this.analyzePythonRequirements(repo, file.content);
        break;
      case 'Cargo.toml':
        this.analyzeRustCargo(repo, file.content);
        break;
      case 'README.md':
        repo.readmeContent = file.content;
        this.analyzeReadme(repo, file.content);
        break;
      case 'Dockerfile':
        this.analyzeDockerfile(repo, file.content);
        break;
      default:
        if (file.path.includes('.github/workflows')) {
          repo.hasCI = true;
        }
    }
  }

  /**
   * Analyze package.json for JavaScript/TypeScript projects
   */
  private analyzePackageJson(repo: GitHubRepository, content: string): void {
    try {
      const packageData = JSON.parse(content);
      repo.packageJson = packageData;

      // Extract dependencies
      const allDeps = {
        ...packageData.dependencies,
        ...packageData.devDependencies
      };

      // Identify frameworks and technologies
      const frameworks = [];
      const technologies = ['javascript'];

      if (allDeps.typescript || allDeps['@types/node']) {
        technologies.push('typescript');
      }

      if (allDeps.react) frameworks.push('react');
      if (allDeps.vue) frameworks.push('vue');
      if (allDeps.angular || allDeps['@angular/core']) frameworks.push('angular');
      if (allDeps['next'] || allDeps.next) frameworks.push('nextjs');
      if (allDeps.express) frameworks.push('express');
      if (allDeps.fastify) frameworks.push('fastify');
      if (allDeps.nodejs) technologies.push('nodejs');

      // Testing frameworks
      if (allDeps.jest || allDeps.mocha || allDeps.vitest) {
        repo.hasTests = true;
        technologies.push('testing');
      }

      repo.technologies.push(...technologies);
      repo.frameworks.push(...frameworks);

      // Determine project type
      if (frameworks.includes('react') || frameworks.includes('vue') || frameworks.includes('angular')) {
        repo.projectType = 'Frontend';
      } else if (frameworks.includes('express') || frameworks.includes('fastify')) {
        repo.projectType = 'Backend API';
      } else if (frameworks.includes('nextjs')) {
        repo.projectType = 'Full-Stack';
      } else {
        repo.projectType = 'JavaScript Library';
      }

    } catch (error) {
      console.log('Error parsing package.json');
    }
  }

  /**
   * Analyze Python requirements.txt
   */
  private analyzePythonRequirements(repo: GitHubRepository, content: string): void {
    repo.technologies.push('python');
    
    const lines = content.split('\n');
    const frameworks = [];

    for (const line of lines) {
      const pkg = line.trim().split('==')[0].split('>=')[0].toLowerCase();
      
      if (pkg.includes('django')) frameworks.push('django');
      if (pkg.includes('flask')) frameworks.push('flask');
      if (pkg.includes('fastapi')) frameworks.push('fastapi');
      if (pkg.includes('pytorch') || pkg.includes('torch')) frameworks.push('pytorch');
      if (pkg.includes('tensorflow')) frameworks.push('tensorflow');
      if (pkg.includes('pytest')) repo.hasTests = true;
    }

    repo.frameworks.push(...frameworks);
    
    if (frameworks.some(f => ['django', 'flask', 'fastapi'].includes(f))) {
      repo.projectType = 'Python Web App';
    } else if (frameworks.some(f => ['pytorch', 'tensorflow'].includes(f))) {
      repo.projectType = 'Machine Learning';
    } else {
      repo.projectType = 'Python Script';
    }
  }

  /**
   * Analyze Rust Cargo.toml
   */
  private analyzeRustCargo(repo: GitHubRepository, content: string): void {
    repo.technologies.push('rust');
    repo.projectType = 'Rust Application';

    if (content.includes('tokio')) {
      repo.frameworks.push('tokio');
    }
    if (content.includes('actix-web')) {
      repo.frameworks.push('actix-web');
      repo.projectType = 'Rust Web Service';
    }
  }

  /**
   * Analyze README for additional context
   */
  private analyzeReadme(repo: GitHubRepository, content: string): void {
    repo.hasDocumentation = content.length > 500; // Basic documentation check

    const lowerContent = content.toLowerCase();
    
    // Look for Claude/AI related content
    const claudeTerms = ['claude', 'anthropic', 'ai assistant', 'llm', 'chatbot', 'automation'];
    const hasClaudeContent = claudeTerms.some(term => lowerContent.includes(term));
    
    if (hasClaudeContent) {
      repo.relevanceScore = (repo.relevanceScore || 0) + 20;
    }

    // Look for tutorial indicators
    const tutorialTerms = ['tutorial', 'guide', 'example', 'demo', 'sample', 'template'];
    const isTutorial = tutorialTerms.some(term => lowerContent.includes(term));
    
    if (isTutorial) {
      repo.projectType = repo.projectType + ' (Tutorial)';
      repo.relevanceScore = (repo.relevanceScore || 0) + 15;
    }
  }

  /**
   * Analyze Dockerfile
   */
  private analyzeDockerfile(repo: GitHubRepository, content: string): void {
    repo.technologies.push('docker');
    
    if (content.includes('FROM node')) {
      repo.technologies.push('nodejs');
    }
    if (content.includes('FROM python')) {
      repo.technologies.push('python');
    }
  }

  /**
   * Determine project characteristics
   */
  private determineProjectCharacteristics(repo: GitHubRepository, files: RepositoryFile[]): void {
    const fileCount = files.length;
    const codeFiles = files.filter(f => ['javascript', 'typescript', 'python', 'java', 'go', 'rust'].includes(f.type));
    
    // Determine complexity
    if (fileCount < 10 && codeFiles.length < 5) {
      repo.codeComplexity = 'simple';
    } else if (fileCount > 100 || codeFiles.length > 50) {
      repo.codeComplexity = 'complex';
    } else {
      repo.codeComplexity = 'medium';
    }

    // Check for test files
    const testFiles = files.filter(f => 
      f.name.includes('test') || 
      f.name.includes('spec') || 
      f.path.includes('test') || 
      f.path.includes('__tests__')
    );
    
    if (testFiles.length > 0) {
      repo.hasTests = true;
    }

    // Check for CI/CD
    const ciFiles = files.filter(f => 
      f.path.includes('.github/workflows') || 
      f.name === '.gitlab-ci.yml' || 
      f.name === 'Jenkinsfile'
    );
    
    if (ciFiles.length > 0) {
      repo.hasCI = true;
    }
  }

  /**
   * Calculate relevance score for Claude Code tutorials
   */
  private calculateRelevanceScore(repo: GitHubRepository): number {
    let score = 0;

    // Base score from stars and activity
    score += Math.min(repo.starCount / 10, 20);
    
    // Recency bonus
    const lastUpdate = new Date(repo.lastUpdated);
    const monthsOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld < 6) score += 10;
    else if (monthsOld < 12) score += 5;

    // Technology relevance
    const relevantTechs = ['typescript', 'javascript', 'python', 'nodejs', 'react', 'nextjs'];
    const matchingTechs = repo.technologies.filter(tech => relevantTechs.includes(tech));
    score += matchingTechs.length * 5;

    // Documentation and testing bonus
    if (repo.hasDocumentation) score += 10;
    if (repo.hasTests) score += 10;
    if (repo.hasCI) score += 5;

    // Tutorial project bonus
    if (repo.projectType.includes('Tutorial')) score += 20;

    return Math.round(score);
  }

  /**
   * Get top repositories by relevance score
   */
  async getTopRelevantRepositories(limit = 50): Promise<GitHubRepository[]> {
    const repos = await this.searchClaudeCodeRepositories();
    
    return repos
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit);
  }
}

export type { GitHubRepository, RepositoryFile, CodeAnalysis };