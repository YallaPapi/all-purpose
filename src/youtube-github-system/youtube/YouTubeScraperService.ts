/**
 * YouTube Tutorial Scraper Service
 * Scrapes Claude Code tutorials and extracts transcripts for analysis
 */

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  channelName: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  transcript?: string;
  extractedTopics: string[];
  technicalConcepts: string[];
  codeSnippets: string[];
}

interface SearchQuery {
  query: string;
  channelId?: string;
  publishedAfter?: string;
  maxResults?: number;
}

export class YouTubeScraperService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for Claude Code tutorials on YouTube
   */
  async searchClaudeCodeTutorials(options: SearchQuery): Promise<YouTubeVideo[]> {
    const { query, maxResults = 50 } = options;
    
    try {
      // Search for videos
      const searchResponse = await fetch(
        `${this.baseUrl}/search?` + new URLSearchParams({
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: maxResults.toString(),
          order: 'relevance',
          key: this.apiKey
        })
      );

      if (!searchResponse.ok) {
        throw new Error(`YouTube API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const videos: YouTubeVideo[] = [];

      // Get detailed video information
      for (const item of searchData.items) {
        const videoDetails = await this.getVideoDetails(item.id.videoId);
        if (videoDetails) {
          videos.push(videoDetails);
        }
      }

      return videos;
    } catch (error) {
      console.error('Error searching YouTube:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific video
   */
  async getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/videos?` + new URLSearchParams({
          part: 'snippet,statistics,contentDetails',
          id: videoId,
          key: this.apiKey
        })
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const video = data.items[0];

      if (!video) return null;

      const videoData: YouTubeVideo = {
        id: videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        channelName: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        duration: video.contentDetails.duration,
        viewCount: parseInt(video.statistics.viewCount || '0'),
        extractedTopics: [],
        technicalConcepts: [],
        codeSnippets: []
      };

      // Extract transcript if available
      try {
        videoData.transcript = await this.getVideoTranscript(videoId);
      } catch (error) {
        console.log(`Transcript not available for video ${videoId}`);
      }

      // Analyze content
      await this.analyzeVideoContent(videoData);

      return videoData;
    } catch (error) {
      console.error(`Error getting video details for ${videoId}:`, error);
      return null;
    }
  }

  /**
   * Extract transcript from YouTube video
   */
  async getVideoTranscript(videoId: string): Promise<string> {
    // Note: YouTube's official API doesn't provide transcripts directly
    // This would require either:
    // 1. YouTube Data API v3 captions endpoint (if captions are available)
    // 2. Third-party transcript services
    // 3. Speech-to-text processing of audio
    
    try {
      const captionsResponse = await fetch(
        `${this.baseUrl}/captions?` + new URLSearchParams({
          part: 'snippet',
          videoId: videoId,
          key: this.apiKey
        })
      );

      if (!captionsResponse.ok) {
        throw new Error('No captions available');
      }

      const captionsData = await captionsResponse.json();
      
      if (captionsData.items.length === 0) {
        throw new Error('No captions found');
      }

      // Get the first caption track (usually auto-generated or English)
      const captionTrack = captionsData.items[0];
      
      // Download the caption content
      const captionResponse = await fetch(
        `${this.baseUrl}/captions/${captionTrack.id}?` + new URLSearchParams({
          key: this.apiKey
        })
      );

      if (!captionResponse.ok) {
        throw new Error('Could not download caption track');
      }

      const transcript = await captionResponse.text();
      return this.cleanTranscript(transcript);
    } catch (error) {
      // Fallback: Return description as "transcript" if no real transcript available
      console.log(`Using description as transcript fallback for ${videoId}`);
      return '';
    }
  }

  /**
   * Clean and format transcript text
   */
  private cleanTranscript(rawTranscript: string): string {
    // Remove XML tags and timing information
    return rawTranscript
      .replace(/<[^>]*>/g, '') // Remove XML tags
      .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/g, '') // Remove timestamps
      .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
      .trim();
  }

  /**
   * Analyze video content to extract topics and technical concepts
   */
  async analyzeVideoContent(video: YouTubeVideo): Promise<void> {
    const content = `${video.title}\n${video.description}\n${video.transcript || ''}`;
    
    // Extract technical concepts using pattern matching
    video.technicalConcepts = this.extractTechnicalConcepts(content);
    
    // Extract topics using keyword analysis
    video.extractedTopics = this.extractTopics(content);
    
    // Extract code snippets from description
    video.codeSnippets = this.extractCodeSnippets(content);
  }

  /**
   * Extract technical concepts from video content
   */
  private extractTechnicalConcepts(content: string): string[] {
    const technicalPatterns = [
      // Programming languages
      /\b(javascript|typescript|python|java|go|rust|c\+\+|c#|php|ruby|swift|kotlin)\b/gi,
      // Frameworks and libraries
      /\b(react|vue|angular|next\.js|express|fastify|django|flask|spring|laravel)\b/gi,
      // Tools and platforms
      /\b(docker|kubernetes|aws|azure|gcp|github|gitlab|vercel|netlify|heroku)\b/gi,
      // Concepts
      /\b(api|rest|graphql|database|sql|nosql|microservices|serverless|devops|ci\/cd)\b/gi,
      // Claude Code specific
      /\b(claude|anthropic|ai|llm|prompt|automation|code generation|meta-agent)\b/gi
    ];

    const concepts = new Set<string>();
    
    for (const pattern of technicalPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => concepts.add(match.toLowerCase()));
      }
    }

    return Array.from(concepts);
  }

  /**
   * Extract main topics from video content
   */
  private extractTopics(content: string): string[] {
    const topicKeywords = [
      'tutorial', 'introduction', 'getting started', 'advanced', 'beginner',
      'deployment', 'configuration', 'setup', 'installation', 'debugging',
      'optimization', 'security', 'testing', 'integration', 'automation',
      'workflow', 'productivity', 'best practices', 'architecture', 'design patterns'
    ];

    const topics = new Set<string>();
    const lowerContent = content.toLowerCase();

    for (const keyword of topicKeywords) {
      if (lowerContent.includes(keyword)) {
        topics.add(keyword);
      }
    }

    return Array.from(topics);
  }

  /**
   * Extract code snippets from content
   */
  private extractCodeSnippets(content: string): string[] {
    const codePatterns = [
      /```[\s\S]*?```/g, // Markdown code blocks
      /`[^`]+`/g, // Inline code
      /\b\w+\(\)|\w+\.\w+/g // Function calls and method access
    ];

    const snippets = new Set<string>();

    for (const pattern of codePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 3 && match.length < 200) { // Filter reasonable code snippets
            snippets.add(match.trim());
          }
        });
      }
    }

    return Array.from(snippets);
  }

  /**
   * Batch process multiple Claude Code tutorial searches
   */
  async findAllClaudeCodeTutorials(): Promise<YouTubeVideo[]> {
    const searchQueries = [
      'Claude Code tutorial',
      'Claude AI coding',
      'Anthropic Claude development',
      'Claude Code automation',
      'Claude AI programming',
      'Claude Code workflow',
      'Claude AI software development',
      'Claude Code project setup'
    ];

    const allVideos: YouTubeVideo[] = [];
    const seenVideoIds = new Set<string>();

    for (const query of searchQueries) {
      try {
        const videos = await this.searchClaudeCodeTutorials({ 
          query, 
          maxResults: 25 
        });
        
        // Deduplicate videos
        for (const video of videos) {
          if (!seenVideoIds.has(video.id)) {
            seenVideoIds.add(video.id);
            allVideos.push(video);
          }
        }
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }
    }

    return allVideos;
  }
}

export type { YouTubeVideo, SearchQuery };