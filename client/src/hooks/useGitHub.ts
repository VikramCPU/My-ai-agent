import { useState, useEffect, useCallback } from 'react';
import { github } from '../services/api';
import { Repository, GitHubUser } from '../types';
import toast from 'react-hot-toast';

export function useGitHubUser() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    github.getUser()
      .then(setUser)
      .catch(e => toast.error('Failed to load GitHub user: ' + e.message))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}

export function useRepositories() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await github.listRepos({ per_page: 50 });
      setRepos(data);
    } catch (e: any) {
      toast.error('Failed to load repositories: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createRepo = useCallback(async (data: any) => {
    const repo = await github.createRepo(data);
    setRepos(prev => [repo, ...prev]);
    toast.success(`Repository "${repo.name}" created!`);
    return repo;
  }, []);

  const deleteRepo = useCallback(async (owner: string, repo: string) => {
    await github.deleteRepo(owner, repo);
    setRepos(prev => prev.filter(r => r.full_name !== `${owner}/${repo}`));
    toast.success('Repository deleted');
  }, []);

  return { repos, loading, refresh: load, createRepo, deleteRepo };
}
