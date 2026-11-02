/**
 * Service to parse GitHub URLs and fetch file contents via GitHub REST API.
 * Supports both Public and Private repositories via OAuth token.
 */

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

    // Format: github.com/owner/repo/blob/branch/path/to/file.js
    if (segments[2] === 'blob' && segments.length >= 5) {
      const branch = segments[3];
      const filePath = segments.slice(4).join('/');
      return { owner, repo, branch, filePath };
    }

    // Default to main or root file if not specified
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
 * Fetches file content from GitHub REST API.
 * @param {string} url - GitHub file URL
 * @param {string} [token] - Optional GitHub OAuth token for private repos
 */
export const fetchGitHubFile = async (url, token = null) => {
  const { owner, repo, branch, filePath } = parseGitHubUrl(url);

  // GitHub REST API endpoint for file contents
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'CodeSense-AI-App'
  };

  // If OAuth token exists, attach it to unlock PRIVATE repositories!
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl, { headers });

  if (response.status === 404) {
    throw new Error(
      token
        ? 'File or private repository not found. Make sure the branch and path are correct.'
        : 'File not found. If this is a PRIVATE repository, connect GitHub OAuth first!'
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('GitHub API authorization failed or rate limit exceeded. Please reconnect GitHub OAuth.');
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.content) {
    throw new Error('Target is not a readable file or file has no content.');
  }

  // GitHub API returns file content Base64 encoded; decode to UTF-8
  const code = Buffer.from(data.content, 'base64').toString('utf-8');

  return {
    code,
    fileName: data.name,
    owner,
    repo,
    branch,
    filePath
  };
};