/**
 * Service to parse GitHub URLs and fetch file contents via GitHub REST API.
 * Features an in-memory TTL Cache to reduce GitHub API calls and prevent rate limiting.
 */

// In-memory cache store: Map<cacheKey, { data, expiresAt }>
const githubCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

// Helper to clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of githubCache.entries()) {
    if (entry.expiresAt <= now) {
      githubCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Helper to parse GitHub URL into owner, repo, branch, and filepath
export const parseGitHubUrl = (githubUrl) => {
  try {
    const parsed = new URL(githubUrl);
    if (!parsed.hostname.includes('github.com')) {
      throw new Error('Not a valid GitHub URL');
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      throw new Error('URL must include at least owner and repository name');
    }

    const owner = segments[0];
    const repo = segments[1];

    // Format: github.com/owner/repo/blob/branch/path/to/file.ext
    if (segments[2] === 'blob' && segments.length >= 5) {
      const branch = segments[3];
      const filePath = segments.slice(4).join('/');
      return { owner, repo, branch, filePath };
    }

    // Default to main branch and file
    return {
      owner,
      repo,
      branch: 'main',
      filePath: segments.slice(2).join('/') || 'index.js'
    };
  } catch (err) {
    throw new Error(`Failed to parse GitHub URL: ${err.message}`);
  }
};

/**
 * Fetches file content from GitHub REST API with TTL caching.
 * @param {string} url - GitHub file URL
 * @param {string} [token] - Optional GitHub OAuth token
 */
export const fetchGitHubFile = async (url, token = null) => {
  const { owner, repo, branch, filePath } = parseGitHubUrl(url);

  // Generate unique cache key based on URL and auth state
  const cacheKey = `${owner}/${repo}/${branch}/${filePath}:${token ? 'auth' : 'anon'}`;

  // 1. Check Cache HIT
  const cached = githubCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`⚡ [Cache HIT] Serving ${owner}/${repo}/${filePath} from in-memory cache.`);
    return {
      ...cached.data,
      fromCache: true,
      cacheExpiresInSeconds: Math.round((cached.expiresAt - Date.now()) / 1000)
    };
  }

  console.log(`🌐 [Cache MISS] Fetching ${owner}/${repo}/${filePath} from GitHub REST API...`);

  // 2. Fetch from GitHub REST API
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'CodeSense-AI-App'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl, { headers });

  if (response.status === 404) {
    throw new Error(
      token
        ? 'File or private repository not found. Verify the branch and filepath.'
        : 'File not found. If this is a PRIVATE repository, please connect GitHub OAuth first.'
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('GitHub API rate limit exceeded or authorization failed. Connect GitHub OAuth for 5,000 requests/hr.');
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.content) {
    throw new Error('Target is not a readable file or file has no content.');
  }

  // Decode Base64 to UTF-8
  const code = Buffer.from(data.content, 'base64').toString('utf-8');

  const resultData = {
    code,
    fileName: data.name,
    owner,
    repo,
    branch,
    filePath,
    fileSize: data.size,
    fromCache: false
  };

  // 3. Save to TTL Cache
  githubCache.set(cacheKey, {
    data: resultData,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  return resultData;
};

// Helper for testing or manually invalidating the cache
export const clearGitHubCache = () => {
  githubCache.clear();
};
