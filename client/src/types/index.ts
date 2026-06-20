export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: ActionResult;
  loading?: boolean;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  default_branch: string;
  owner: { login: string; avatar_url: string };
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
  url: string;
  download_url?: string | null;
}

export interface Branch {
  name: string;
  protected: boolean;
  commit: { sha: string; url: string };
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string } | null;
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  head: { ref: string };
  base: { ref: string };
  user: { login: string; avatar_url: string } | null;
  created_at: string;
}

export interface WorkflowRun {
  id: number;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  workflow_id: number;
  run_number: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_branch: string | null;
  head_sha: string;
  actor: { login: string; avatar_url: string } | null;
}

export interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
  archive_download_url: string;
  created_at: string | null;
  expires_at: string | null;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  bio: string | null;
  html_url: string;
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  meta?: Record<string, any>;
}
