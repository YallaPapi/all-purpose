import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

// GitHub repository search and analysis
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'claude code examples';
  const language = searchParams.get('language') || '';
  const sort = searchParams.get('sort') || 'stars';
  const order = searchParams.get('order') || 'desc';
  const per_page = parseInt(searchParams.get('per_page') || '10');

  try {
    const githubToken = process.env.GITHUB_TOKEN;
    
    // Create Octokit instance with or without auth
    const octokit = new Octokit(githubToken ? {
      auth: githubToken,
    } : {});

    // Build search query
    let searchQuery = query;
    if (language) {
      searchQuery += ` language:${language}`;
    }

    // Search repositories
    const searchResponse = await octokit.rest.search.repos({
      q: searchQuery,
      sort: sort as any,
      order: order as any,
      per_page,
    });

    // Enrich repository data
    const enrichedRepos = await Promise.all(
      searchResponse.data.items.map(async (repo) => {
        try {
          // Only do enrichment if we have a GitHub token
          let readmeContent = '';
          let recentCommits = [];
          let languages = {};

          if (githubToken) {
            // Get README content
            try {
              const readmeResponse = await octokit.rest.repos.getReadme({
                owner: repo.owner.login,
                repo: repo.name,
              });
              
              // Decode base64 content
              readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
            } catch (readmeError) {
              console.warn(`No README found for ${repo.full_name}`);
            }

            // Get recent commits for activity analysis
            try {
              const commitsResponse = await octokit.rest.repos.listCommits({
                owner: repo.owner.login,
                repo: repo.name,
                per_page: 5,
              });
              recentCommits = commitsResponse.data.map(commit => ({
                sha: commit.sha.substring(0, 7),
                message: commit.commit.message,
                date: commit.commit.author?.date,
                author: commit.commit.author?.name,
              }));
            } catch (commitsError) {
              console.warn(`Failed to get commits for ${repo.full_name}`);
            }

            // Get programming languages
            try {
              const languagesResponse = await octokit.rest.repos.listLanguages({
                owner: repo.owner.login,
                repo: repo.name,
              });
              languages = languagesResponse.data;
            } catch (languagesError) {
              console.warn(`Failed to get languages for ${repo.full_name}`);
            }
          }

          return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            htmlUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            language: repo.language,
            languages,
            stargazersCount: repo.stargazers_count,
            forksCount: repo.forks_count,
            watchersCount: repo.watchers_count,
            size: repo.size,
            defaultBranch: repo.default_branch,
            openIssuesCount: repo.open_issues_count,
            topics: repo.topics || [],
            license: repo.license?.name,
            createdAt: repo.created_at,
            updatedAt: repo.updated_at,
            pushedAt: repo.pushed_at,
            owner: {
              login: repo.owner.login,
              type: repo.owner.type,
              avatarUrl: repo.owner.avatar_url,
            },
            readmeContent: readmeContent.substring(0, 10000), // Limit README length
            recentCommits,
            isActive: new Date(repo.pushed_at).getTime() > Date.now() - (90 * 24 * 60 * 60 * 1000), // Active in last 90 days
          };
        } catch (error) {
          console.error(`Error enriching repo ${repo.full_name}:`, error);
          return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            htmlUrl: repo.html_url,
            error: 'Failed to enrich repository data'
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      query: searchQuery,
      totalCount: searchResponse.data.total_count,
      repositories: enrichedRepos,
      rateLimit: {
        remaining: searchResponse.headers['x-ratelimit-remaining'],
        reset: searchResponse.headers['x-ratelimit-reset'],
      }
    });

  } catch (error: any) {
    console.error('GitHub search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search GitHub repositories',
        message: error.message 
      },
      { status: 500 }
    );
  }
}