'use client';

import { useState, useEffect } from 'react';
import { Search, Youtube, Github, Star, GitFork, Eye, Clock, ExternalLink, Zap } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnails: any;
  statistics: any;
  duration: string;
  transcript: string;
  url: string;
}

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  language: string;
  stargazersCount: number;
  forksCount: number;
  watchersCount: number;
  updatedAt: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
  topics: string[];
  isActive: boolean;
}

interface CrossReference {
  tutorialId: string;
  repositoryId: string;
  similarityScore: number;
  matchingTopics: string[];
  relevanceLevel: string;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('Claude Code tutorial');
  const [videos, setVideos] = useState<Video[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [crossReferences, setCrossReferences] = useState<CrossReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'repos' | 'cross-ref'>('videos');
  const [indexingStatus, setIndexingStatus] = useState<string>('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Search YouTube videos
      const youtubeResponse = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}&maxResults=10`);
      const youtubeData = await youtubeResponse.json();
      
      if (youtubeData.success) {
        setVideos(youtubeData.videos);
      }

      // Search GitHub repositories
      const githubResponse = await fetch(`/api/github/repos?q=${encodeURIComponent(searchQuery)}&per_page=10`);
      const githubData = await githubResponse.json();
      
      if (githubData.success) {
        setRepositories(githubData.repositories);
      }

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const indexContent = async () => {
    if (videos.length === 0 && repositories.length === 0) {
      alert('Please search for content first');
      return;
    }

    setIndexingStatus('Indexing content for semantic search...');
    
    try {
      // Index videos
      if (videos.length > 0) {
        setIndexingStatus('Indexing YouTube videos...');
        const videoResponse = await fetch('/api/search', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: videos, type: 'tutorial' }),
        });
        const videoResult = await videoResponse.json();
        console.log('Video indexing result:', videoResult);
      }

      // Index repositories
      if (repositories.length > 0) {
        setIndexingStatus('Indexing GitHub repositories...');
        const repoResponse = await fetch('/api/search', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: repositories, type: 'repository' }),
        });
        const repoResult = await repoResponse.json();
        console.log('Repository indexing result:', repoResult);
      }

      setIndexingStatus('Content indexed successfully!');
      setTimeout(() => setIndexingStatus(''), 3000);

    } catch (error) {
      console.error('Indexing error:', error);
      setIndexingStatus('Indexing failed. Please try again.');
      setTimeout(() => setIndexingStatus(''), 3000);
    }
  };

  const generateCrossReferences = async () => {
    if (videos.length === 0 || repositories.length === 0) {
      alert('Please search and index both videos and repositories first');
      return;
    }

    setLoading(true);
    try {
      // Generate cross-references for each video
      const allCrossRefs = [];
      
      for (const video of videos.slice(0, 3)) { // Limit to prevent rate limits
        const response = await fetch('/api/cross-reference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tutorialId: video.id, threshold: 0.6 }),
        });
        
        const result = await response.json();
        if (result.success) {
          allCrossRefs.push(...result.crossReferences);
        }
      }

      setCrossReferences(allCrossRefs);
      setActiveTab('cross-ref');

    } catch (error) {
      console.error('Cross-reference error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            YouTube → GitHub Cross-Reference System
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Discover relevant code repositories from YouTube tutorials using semantic AI
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for tutorials and repositories..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mb-6">
            <button
              onClick={indexContent}
              disabled={videos.length === 0 && repositories.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Index for AI Search
            </button>
            <button
              onClick={generateCrossReferences}
              disabled={loading || videos.length === 0 || repositories.length === 0}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Find Cross-References
            </button>
          </div>

          {/* Indexing Status */}
          {indexingStatus && (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 max-w-2xl mx-auto">
              {indexingStatus}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'videos' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Youtube className="w-4 h-4" />
              Videos ({videos.length})
            </button>
            <button
              onClick={() => setActiveTab('repos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'repos' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Github className="w-4 h-4" />
              Repositories ({repositories.length})
            </button>
            <button
              onClick={() => setActiveTab('cross-ref')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'cross-ref' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              Cross-References ({crossReferences.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={video.thumbnails?.medium?.url || video.thumbnails?.default?.url}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{video.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{video.channelTitle}</p>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{video.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {parseInt(video.statistics?.viewCount || '0').toLocaleString()}
                        </span>
                      </div>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                      >
                        Watch
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Repositories Tab */}
          {activeTab === 'repos' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {repositories.map((repo) => (
                <div key={repo.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={repo.owner.avatarUrl}
                        alt={repo.owner.login}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-600">{repo.owner.login}</span>
                    </div>
                    {repo.isActive && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Active</span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-800 mb-2">{repo.name}</h3>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-3">{repo.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {repo.stargazersCount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-4 h-4" />
                      {repo.forksCount.toLocaleString()}
                    </span>
                    {repo.language && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {repo.language}
                      </span>
                    )}
                  </div>
                  
                  {repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {repo.topics.slice(0, 3).map((topic) => (
                        <span key={topic} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Updated {new Date(repo.updatedAt).toLocaleDateString()}
                    </span>
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
                    >
                      View Code
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cross-References Tab */}
          {activeTab === 'cross-ref' && (
            <div className="space-y-6">
              {crossReferences.length === 0 ? (
                <div className="text-center py-12">
                  <ExternalLink className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Cross-References Yet</h3>
                  <p className="text-gray-500">Search for content and click "Find Cross-References" to discover connections.</p>
                </div>
              ) : (
                crossReferences.map((crossRef, index) => {
                  const video = videos.find(v => v.id === crossRef.tutorialId);
                  const repo = repositories.find(r => r.id.toString() === crossRef.repositoryId);
                  
                  return (
                    <div key={index} className="bg-white rounded-lg shadow-md p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Cross-Reference Match
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            crossRef.relevanceLevel === 'very_high' ? 'bg-green-100 text-green-800' :
                            crossRef.relevanceLevel === 'high' ? 'bg-blue-100 text-blue-800' :
                            crossRef.relevanceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {crossRef.relevanceLevel.replace('_', ' ')} relevance
                          </span>
                          <span className="text-sm text-gray-500">
                            {Math.round(crossRef.similarityScore * 100)}% similarity
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Video */}
                        {video && (
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Youtube className="w-5 h-5 text-red-600" />
                              <h4 className="font-medium text-gray-800">YouTube Tutorial</h4>
                            </div>
                            <h5 className="font-semibold mb-2 line-clamp-2">{video.title}</h5>
                            <p className="text-sm text-gray-600 mb-2">{video.channelTitle}</p>
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Watch Tutorial →
                            </a>
                          </div>
                        )}
                        
                        {/* Repository */}
                        {repo && (
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Github className="w-5 h-5 text-gray-800" />
                              <h4 className="font-medium text-gray-800">GitHub Repository</h4>
                            </div>
                            <h5 className="font-semibold mb-2">{repo.fullName}</h5>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{repo.description}</p>
                            <a
                              href={repo.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View Code →
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* Matching Topics */}
                      {crossRef.matchingTopics.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Matching Topics:</h4>
                          <div className="flex flex-wrap gap-2">
                            {crossRef.matchingTopics.map((topic, topicIndex) => (
                              <span key={topicIndex} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
