const nock = require('nock');

// Disable all real network connections; unmatched requests throw immediately
nock.disableNetConnect();

// Mock config
jest.mock('../src/config', () => ({
  api_url: 'https://api.github.com',
  access_token: 'fake-token',
  github_username: 'testuser',
}));

const { deleteRepos } = require('../src/deleteRepos');

describe('deleteRepos', () => {
  const apiUrl = 'https://api.github.com';
  const token = 'fake-token';

  beforeEach(() => {
    nock.cleanAll();
  });

  it('should delete all repos successfully', async () => {
    const repos = ['testuser/repo1', 'testuser/repo2'];

    nock(apiUrl)
      .delete('/repos/testuser/repo1')
      .reply(204);

    nock(apiUrl)
      .delete('/repos/testuser/repo2')
      .reply(204);

    const result = await deleteRepos(repos, { api_url: apiUrl, access_token: token });

    expect(result).toEqual({ deleted: 2, failed: 0 });
  });

  it('should skip repos that fail to delete', async () => {
    const repos = ['testuser/repo1', 'testuser/repo2', 'testuser/repo3'];

    nock(apiUrl)
      .delete('/repos/testuser/repo1')
      .reply(204);

    nock(apiUrl)
      .delete('/repos/testuser/repo2')
      .reply(404, { message: 'Not found' });

    nock(apiUrl)
      .delete('/repos/testuser/repo3')
      .reply(204);

    const result = await deleteRepos(repos, { api_url: apiUrl, access_token: token });

    expect(result).toEqual({ deleted: 2, failed: 1 });
  });

  it('should handle all repos failing', async () => {
    const repos = ['testuser/repo1', 'testuser/repo2'];

    nock(apiUrl)
      .delete('/repos/testuser/repo1')
      .reply(500);

    nock(apiUrl)
      .delete('/repos/testuser/repo2')
      .reply(403);

    const result = await deleteRepos(repos, { api_url: apiUrl, access_token: token });

    expect(result).toEqual({ deleted: 0, failed: 2 });
  });

  it('should include proper headers in delete requests', async () => {
    const repos = ['testuser/repo1'];

    nock(apiUrl, {
      reqheaders: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })
      .delete('/repos/testuser/repo1')
      .reply(204);

    await deleteRepos(repos, { api_url: apiUrl, access_token: token });
  });

  it('should handle empty repo list', async () => {
    const result = await deleteRepos([], { api_url: apiUrl, access_token: token });

    expect(result).toEqual({ deleted: 0, failed: 0 });
  });

  it('should stop on network error and return partial results', async () => {
    const repos = ['testuser/repo1', 'testuser/repo2'];

    nock(apiUrl)
      .delete('/repos/testuser/repo1')
      .reply(204);

    nock(apiUrl)
      .delete('/repos/testuser/repo2')
      .replyWithError('Network error');

    const result = await deleteRepos(repos, { api_url: apiUrl, access_token: token });

    expect(result.deleted).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('should not throw when encountering 404 for already deleted repo', async () => {
    const repos = ['testuser/repo1'];

    nock(apiUrl)
      .delete('/repos/testuser/repo1')
      .reply(404, { message: 'Not Found' });

    const result = await deleteRepos(repos, { api_url: apiUrl, access_token: token });

    expect(result).toEqual({ deleted: 0, failed: 1 });
  });
});
