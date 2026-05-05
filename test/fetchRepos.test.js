const nock = require('nock');

// Disable all real network connections; unmatched requests throw immediately
nock.disableNetConnect();

// Mock fs before any imports
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => false),
}));

// Mock config
jest.mock('../src/config', () => ({
  api_url: 'https://api.github.com',
  access_token: 'fake-token',
  github_username: 'testuser',
}));

// Import the pure function
const { fetchRepos } = require('../src/fetchRepos');

describe('fetchRepos', () => {
  const apiUrl = 'https://api.github.com';
  const token = 'fake-token';
  const username = 'testuser';
  const url = `${apiUrl}/users/${username}/repos`;

  beforeEach(() => {
    nock.cleanAll();
  });

  it('should fetch only forked repositories', async () => {
    const mockRepos = [
      { full_name: 'testuser/forked-repo-1', fork: true },
      { full_name: 'testuser/forked-repo-2', fork: true },
      { full_name: 'testuser/own-repo', fork: false },
    ];

    nock(apiUrl)
      .get('/users/testuser/repos')
      .query({ page: 1 })
      .reply(200, mockRepos);

    const result = await fetchRepos(url, { api_url: apiUrl, access_token: token });

    expect(result).toEqual(['testuser/forked-repo-1', 'testuser/forked-repo-2']);
  });

  it('should paginate through multiple pages', async () => {
    const page1 = [
      { full_name: 'testuser/repo1', fork: true },
      { full_name: 'testuser/repo2', fork: true },
    ];
    const page2 = [
      { full_name: 'testuser/repo3', fork: true },
    ];
    const page3 = [];

    nock(apiUrl)
      .get('/users/testuser/repos')
      .query({ page: 1 })
      .reply(200, page1);

    nock(apiUrl)
      .get('/users/testuser/repos')
      .query({ page: 2 })
      .reply(200, page2);

    nock(apiUrl)
      .get('/users/testuser/repos')
      .query({ page: 3 })
      .reply(200, page3);

    const result = await fetchRepos(url, { api_url: apiUrl, access_token: token });

    expect(result).toEqual(['testuser/repo1', 'testuser/repo2', 'testuser/repo3']);
  });

  it('should handle empty response gracefully', async () => {
    nock(apiUrl)
      .get('/users/testuser/repos')
      .query({ page: 1 })
      .reply(200, []);

    const result = await fetchRepos(url, { api_url: apiUrl, access_token: token });

    expect(result).toEqual([]);
  });

  it('should include Authorization and Accept headers', async () => {
    nock(apiUrl, {
      reqheaders: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })
      .get('/users/testuser/repos')
      .query({ page: 1 })
      .reply(200, []);

    await expect(fetchRepos(url, { api_url: apiUrl, access_token: token })).resolves.toEqual([]);
  });

  it('should stop on API error and return partial results', async () => {
    const page1 = [
      { full_name: 'testuser/repo1', fork: true },
    ];

    nock(apiUrl)
      .get('/users/testuser/repos')
      .query({ page: 1 })
      .reply(200, page1);

    nock(apiUrl)
      .get('/users/testuser/repos')
      .query({ page: 2 })
      .reply(500, { message: 'Server error' });

    const result = await fetchRepos(url, { api_url: apiUrl, access_token: token });

    expect(result).toEqual(['testuser/repo1']);
  });

  it('should handle network errors gracefully', async () => {
    nock(apiUrl)
      .get('/users/testuser/repos')
      .query({ page: 1 })
      .replyWithError('Network failure');

    const result = await fetchRepos(url, { api_url: apiUrl, access_token: token });

    expect(result).toEqual([]);
  });
});
