/**
 * Parses a GitHub URL into owner, repo, branch, and file path
 * Examples:
 * https://github.com/owner/repo/blob/main/src/index.js
 * https://github.com/owner/repo
 */
export const parseGitHubUrl = (url) => {
  try {
    const cleanUrl = url.trim().replace(/\/$/, '');
    
    // Pattern 1: Direct link to a file inside a branch
    const fileMatch = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
    if (fileMatch) {
      return {
        owner: fileMatch[1],
        repo: fileMatch[2],
        branch: fileMatch[3],
        path: fileMatch[4]
      };
    }

    // Pattern 2: Link to repository root
    const repoMatch = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (repoMatch) {
      return {
        owner: repoMatch[1],
        repo: repoMatch[2],
        branch: 'main',
        path: null
      };
    }

    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Fetches file content from the official GitHub REST API
 * @param {string} url - GitHub URL
 * @returns {Promise<Object>} File details and raw code
 */
export const fetchGitHubFile = async (url) => {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error('Invalid GitHub URL. Please provide a link like: https://github.com/owner/repo/blob/main/file.js');
  }

  // If a specific file path was provided
  if (parsed.path) {
    const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${parsed.path}?ref=${parsed.branch}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CodeSense-AI-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('File not found in this repository. Please check the URL and branch name.');
      }
      if (response.status === 403) {
        throw new Error('GitHub API rate limit reached. Please try again in a few minutes.');
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.type !== 'file') {
      throw new Error('The URL points to a folder. Please link directly to a code file.');
    }

    // GitHub returns file text in base64 encoding; decode it into readable text
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    return {
      fileName: data.name,
      path: data.path,
      content,
      repo: `${parsed.owner}/${parsed.repo}`,
      branch: parsed.branch
    };
  } else {
    // If only the repo was provided, search for standard entry files
    const commonFiles = ['src/index.js', 'src/App.jsx', 'index.js', 'server.js', 'app.js', 'main.js'];
    
    for (const testPath of commonFiles) {
      try {
        const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${testPath}?ref=${parsed.branch}`;
        const res = await fetch(apiUrl, {
          headers: { 'User-Agent': 'CodeSense-AI-App', 'Accept': 'application/vnd.github.v3+json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.type === 'file') {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            return {
              fileName: data.name,
              path: data.path,
              content,
              repo: `${parsed.owner}/${parsed.repo}`,
              branch: parsed.branch
            };
          }
        }
      } catch (e) {
        // continue checking next file
      }
    }

    throw new Error('Could not automatically find an entry file. Please provide a direct file link (e.g. github.com/owner/repo/blob/main/index.js).');
  }
};