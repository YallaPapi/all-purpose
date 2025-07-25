import { NextRequest, NextResponse } from 'next/server';
import { Vector } from '@upstash/vector';
import { Redis } from '@upstash/redis';
import OpenAI from 'openai';

// Cross-reference matching between tutorials and repositories
export async function POST(request: NextRequest) {
  try {
    const { tutorialId, repositoryId, threshold = 0.7 } = await request.json();

    // Initialize services
    const vector = new Vector({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    let crossReferences = [];

    if (tutorialId && repositoryId) {
      // Specific cross-reference between tutorial and repository
      const crossRef = await findSpecificCrossReference(tutorialId, repositoryId, vector, redis);
      if (crossRef) crossReferences.push(crossRef);
    } else if (tutorialId) {
      // Find repositories matching a tutorial
      crossReferences = await findMatchingRepositories(tutorialId, threshold, vector, redis);
    } else if (repositoryId) {
      // Find tutorials matching a repository
      crossReferences = await findMatchingTutorials(repositoryId, threshold, vector, redis);
    } else {
      // Generate all cross-references above threshold
      crossReferences = await generateAllCrossReferences(threshold, vector, redis);
    }

    return NextResponse.json({
      success: true,
      threshold,
      totalMatches: crossReferences.length,
      crossReferences,
    });

  } catch (error: any) {
    console.error('Cross-reference error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate cross-references',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

async function findSpecificCrossReference(tutorialId: string, repositoryId: string, vector: Vector, redis: Redis) {
  try {
    // Get embeddings for both items
    const tutorialVector = await vector.fetch(`tutorial:${tutorialId}`);
    const repoVector = await vector.fetch(`repository:${repositoryId}`);

    if (!tutorialVector || !repoVector) {
      return null;
    }

    // Calculate similarity
    const similarity = calculateSimilarity(tutorialVector.vector!, repoVector.vector!);

    // Get cached data
    const tutorialData = await redis.get(`tutorial:${tutorialId}`);
    const repoData = await redis.get(`repository:${repositoryId}`);

    // Analyze content for specific matches
    const contentAnalysis = analyzeContentSimilarity(
      JSON.parse(tutorialData as string),
      JSON.parse(repoData as string)
    );

    return {
      tutorialId,
      repositoryId,
      similarityScore: similarity,
      contentAnalysis,
      matchingTopics: extractMatchingTopics(contentAnalysis),
      relevanceLevel: getRelevanceLevel(similarity),
      createdAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Error finding specific cross-reference:', error);
    return null;
  }
}

async function findMatchingRepositories(tutorialId: string, threshold: number, vector: Vector, redis: Redis) {
  try {
    // Get tutorial embedding
    const tutorialVector = await vector.fetch(`tutorial:${tutorialId}`);
    if (!tutorialVector) return [];

    // Search for similar repositories
    const searchResults = await vector.query({
      vector: tutorialVector.vector!,
      topK: 20,
      includeMetadata: true,
      filter: 'type = "repository"'
    });

    const matches = [];
    for (const result of searchResults) {
      if (result.score >= threshold) {
        const repoData = await redis.get(`repository:${result.metadata?.id}`);
        const tutorialData = await redis.get(`tutorial:${tutorialId}`);
        
        const contentAnalysis = analyzeContentSimilarity(
          JSON.parse(tutorialData as string),
          JSON.parse(repoData as string)
        );

        matches.push({
          tutorialId,
          repositoryId: result.metadata?.id,
          similarityScore: result.score,
          contentAnalysis,
          matchingTopics: extractMatchingTopics(contentAnalysis),
          relevanceLevel: getRelevanceLevel(result.score),
          repository: {
            name: result.metadata?.title,
            description: result.metadata?.description,
            url: result.metadata?.url,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    return matches;

  } catch (error) {
    console.error('Error finding matching repositories:', error);
    return [];
  }
}

async function findMatchingTutorials(repositoryId: string, threshold: number, vector: Vector, redis: Redis) {
  try {
    // Get repository embedding
    const repoVector = await vector.fetch(`repository:${repositoryId}`);
    if (!repoVector) return [];

    // Search for similar tutorials
    const searchResults = await vector.query({
      vector: repoVector.vector!,
      topK: 20,
      includeMetadata: true,
      filter: 'type = "tutorial"'
    });

    const matches = [];
    for (const result of searchResults) {
      if (result.score >= threshold) {
        const tutorialData = await redis.get(`tutorial:${result.metadata?.id}`);
        const repoData = await redis.get(`repository:${repositoryId}`);
        
        const contentAnalysis = analyzeContentSimilarity(
          JSON.parse(tutorialData as string),
          JSON.parse(repoData as string)
        );

        matches.push({
          tutorialId: result.metadata?.id,
          repositoryId,
          similarityScore: result.score,
          contentAnalysis,
          matchingTopics: extractMatchingTopics(contentAnalysis),
          relevanceLevel: getRelevanceLevel(result.score),
          tutorial: {
            title: result.metadata?.title,
            description: result.metadata?.description,
            url: result.metadata?.url,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    return matches;

  } catch (error) {
    console.error('Error finding matching tutorials:', error);
    return [];
  }
}

async function generateAllCrossReferences(threshold: number, vector: Vector, redis: Redis) {
  // This would be computationally expensive for large datasets
  // In production, this would be handled by a background job
  return [];
}

function calculateSimilarity(vector1: number[], vector2: number[]): number {
  if (vector1.length !== vector2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    norm1 += vector1[i] * vector1[i];
    norm2 += vector2[i] * vector2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function analyzeContentSimilarity(tutorial: any, repository: any) {
  const analysis = {
    titleSimilarity: 0,
    descriptionSimilarity: 0,
    topicOverlap: [],
    languageMatch: false,
    keywordMatches: [],
  };

  // Analyze title similarity
  if (tutorial.title && repository.name) {
    analysis.titleSimilarity = calculateTextSimilarity(tutorial.title, repository.name);
  }

  // Analyze description similarity
  if (tutorial.description && repository.description) {
    analysis.descriptionSimilarity = calculateTextSimilarity(tutorial.description, repository.description);
  }

  // Check language match
  if (repository.language) {
    const tutorialContent = (tutorial.transcript || tutorial.description || '').toLowerCase();
    analysis.languageMatch = tutorialContent.includes(repository.language.toLowerCase());
  }

  // Extract common keywords
  const tutorialWords = extractKeywords(tutorial.title + ' ' + tutorial.description);
  const repoWords = extractKeywords(repository.name + ' ' + repository.description);
  analysis.keywordMatches = tutorialWords.filter(word => repoWords.includes(word));

  return analysis;
}

function extractMatchingTopics(contentAnalysis: any): string[] {
  const topics = [];
  
  if (contentAnalysis.languageMatch) {
    topics.push('Programming Language');
  }
  
  if (contentAnalysis.titleSimilarity > 0.5) {
    topics.push('Similar Topic');
  }
  
  if (contentAnalysis.keywordMatches.length > 0) {
    topics.push(...contentAnalysis.keywordMatches.slice(0, 3));
  }
  
  return [...new Set(topics)];
}

function getRelevanceLevel(score: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (score >= 0.9) return 'very_high';
  if (score >= 0.8) return 'high';
  if (score >= 0.7) return 'medium';
  return 'low';
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return commonWords.length / totalWords;
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 10);
}