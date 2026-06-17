/**
 * This script searches for open issues in firebase/firebase-js-sdk
 * containing the string "INTERNAL ASSERTION FAILED".
 * 
 * It outputs the URLs of the issues, which can be added as sources to NotebookLM.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Optional: use for higher rate limits

async function searchIssues() {
  const query = 'repo:firebase/firebase-js-sdk is:open is:issue "INTERNAL ASSERTION FAILED"';
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100`;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Firebase-Issue-Finder'
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    
    if (data.items.length === 0) {
      console.log('No open issues found with "INTERNAL ASSERTION FAILED".');
      return;
    }

    console.log(`Found ${data.total_count} open issues:\n`);
    data.items.forEach(issue => {
      console.log(issue.html_url);
    });

    if (data.total_count > 100) {
      console.log('\nNote: Only the first 100 issues are shown. GitHub Search API results are paginated.');
    }

  } catch (error) {
    console.error('Error fetching issues:', error.message);
  }
}

searchIssues();
