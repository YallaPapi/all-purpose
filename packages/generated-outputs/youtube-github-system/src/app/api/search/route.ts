import { NextRequest, NextResponse } from 'next/server';
import { Vector } from '@upstash/vector';
import { Redis } from '@upstash/redis';
import OpenAI from 'openai';

// Semantic search engine using embeddings
export async function POST(request: NextRequest) {
  try {
    const { query, type = 'all', limit = 10 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Initialize services
    const vector = new Vector({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search vector database
    const searchResults = await vector.query({
      vector: queryEmbedding,
      topK: limit * 2, // Get more results to filter by type if needed
      includeMetadata: true,
    });

    // Filter and enhance results
    let filteredResults = searchResults;
    if (type !== 'all') {
      filteredResults = searchResults.filter(result => 
        result.metadata?.type === type
      );
    }

    // Limit results
    filteredResults = filteredResults.slice(0, limit);

    // Enhance results with cached data
    const enhancedResults = await Promise.all(
      filteredResults.map(async (result) => {
        try {
          const cacheKey = `${result.metadata?.type}:${result.metadata?.id}`;
          const cachedData = await redis.get(cacheKey);
          
          return {
            id: result.id,
            score: result.score,
            type: result.metadata?.type,
            title: result.metadata?.title,
            description: result.metadata?.description,
            url: result.metadata?.url,
            thumbnail: result.metadata?.thumbnail,
            metadata: result.metadata,
            cachedData: cachedData ? JSON.parse(cachedData as string) : null,
          };
        } catch (error) {
          console.error('Error enhancing result:', error);
          return {
            id: result.id,
            score: result.score,
            type: result.metadata?.type,
            title: result.metadata?.title,
            description: result.metadata?.description,
            url: result.metadata?.url,
            error: 'Failed to enhance result'
          };
        }
      })
    );

    // Group results by type for cross-reference analysis
    const resultsByType = enhancedResults.reduce((acc, result) => {
      const type = result.type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(result);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      query,
      totalResults: enhancedResults.length,
      results: enhancedResults,
      resultsByType,
      searchStats: {
        embeddingModel: 'text-embedding-3-small',
        vectorDimensions: queryEmbedding.length,
        searchLatency: Date.now() - Date.now(), // Would calculate actual latency in production
      }
    });

  } catch (error: any) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { 
        error: 'Semantic search failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// Index content for semantic search
export async function PUT(request: NextRequest) {
  try {
    const { items, type } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Initialize services
    const vector = new Vector({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const indexedItems = [];

    for (const item of items) {
      try {
        // Create searchable text from item
        const searchableText = [
          item.title || '',
          item.description || '',
          item.transcript || item.readmeContent || '',
        ].filter(Boolean).join(' ').substring(0, 8000); // Limit to avoid token limits

        if (!searchableText.trim()) {
          console.warn('Skipping item with no searchable text:', item.id);
          continue;
        }

        // Generate embedding
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: searchableText,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Store in vector database
        const vectorId = `${type}:${item.id}`;
        await vector.upsert({
          id: vectorId,
          vector: embedding,
          metadata: {
            type,
            id: item.id,
            title: item.title,
            description: item.description,
            url: item.url || item.htmlUrl,
            thumbnail: item.thumbnails?.default?.url,
            createdAt: new Date().toISOString(),
          },
        });

        // Cache full item data in Redis
        const cacheKey = `${type}:${item.id}`;
        await redis.set(cacheKey, JSON.stringify(item), {
          ex: 7 * 24 * 60 * 60, // 7 days expiration
        });

        indexedItems.push({
          id: item.id,
          type,
          vectorId,
          embeddingDimensions: embedding.length,
        });

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error indexing item ${item.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      type,
      totalItems: items.length,
      indexedItems: indexedItems.length,
      items: indexedItems,
    });

  } catch (error: any) {
    console.error('Indexing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to index content',
        message: error.message 
      },
      { status: 500 }
    );
  }
}