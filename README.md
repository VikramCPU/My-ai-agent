# AI Coding Agent

A complete AI-powered coding agent with GitHub integration and NVIDIA AI, built with React + TypeScript + Node.js.

## Features

- **AI Chat** — Natural language interface powered by NVIDIA LLaMA
- **GitHub Integration** — Create repos, manage files, branches, PRs, issues
- **Code Analysis** — AI-powered bug detection, fixes, and explanations
- **Android Builds** — Generate Android projects, GitHub Actions APK workflows
- **File Editor** — Monaco-based editor with AI assistance
- **Build Monitor** — Track GitHub Actions runs, download APK artifacts

## Setup

### 1. Environment Variables (already set in Replit Secrets)
- `GITHUB_PAT` — Your GitHub Personal Access Token
- `NVIDIA_API_KEY` — Your NVIDIA API key

### 2. Install & Run
```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Start backend (port 3001)
cd server && npm run dev

# Start frontend (port 5000)
cd client && npm run dev
```

## Usage

1. Open the **Dashboard** to see your GitHub stats
2. Use the **AI Chat** to issue commands in natural language
3. Manage repos in **Repositories**
4. Edit files with AI help in **File Editor**
5. Monitor builds and download APKs in **Build Status**
6. View logs in **Error Logs**

## Example Commands

```
Create a new repo called my-android-app
Show me all my repositories
Generate an Android project called TodoApp with package com.example.todo
Create a GitHub Actions workflow for building an APK in repo my-android-app
Create an issue in owner/repo titled "Bug: app crashes on startup"
Analyze this code for bugs: [paste code]
```
