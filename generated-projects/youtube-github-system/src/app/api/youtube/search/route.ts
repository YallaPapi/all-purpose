import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// YouTube Data API integration
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'Claude Code tutorial';
  const maxResults = parseInt(searchParams.get('maxResults') || '10');

  try {
    // YouTube Data API v3 search
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${youtubeApiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: 'YouTube API error', details: searchData },
        { status: searchResponse.status }
      );
    }

    // Enrich with video details and transcript
    const enrichedVideos = await Promise.all(
      searchData.items.map(async (video: any) => {
        try {
          // Get video details
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${video.id.videoId}&key=${youtubeApiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          let transcript = '';
          try {
            // Attempt to get transcript
            const transcriptData = await YoutubeTranscript.fetchTranscript(video.id.videoId);
            transcript = transcriptData.map(item => item.text).join(' ');
          } catch (transcriptError) {
            console.warn(`No transcript available for video ${video.id.videoId}`);
          }

          return {
            id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            channelTitle: video.snippet.channelTitle,
            publishedAt: video.snippet.publishedAt,
            thumbnails: video.snippet.thumbnails,
            statistics: detailsData.items[0]?.statistics || {},
            duration: detailsData.items[0]?.contentDetails?.duration || 'PT0S',
            transcript: transcript.substring(0, 5000), // Limit transcript length
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`
          };
        } catch (error) {
          console.error(`Error enriching video ${video.id.videoId}:`, error);
          return {
            id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            channelTitle: video.snippet.channelTitle,
            publishedAt: video.snippet.publishedAt,
            thumbnails: video.snippet.thumbnails,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            error: 'Failed to enrich video data'
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      query,
      totalResults: searchData.pageInfo?.totalResults || 0,
      videos: enrichedVideos,
      nextPageToken: searchData.nextPageToken
    });

  } catch (error: any) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search YouTube',
        message: error.message 
      },
      { status: 500 }
    );
  }
}