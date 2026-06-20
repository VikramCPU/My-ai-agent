import axios from 'axios';
import { logger } from '../utils/logger';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ProviderConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

// ── Built-in provider presets ────────────────────────────────────
export const PROVIDER_PRESETS: Record<string, Omit<ProviderConfig, 'apiKey'>> = {
  nvidia: {
    name: 'NVIDIA NIM',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    model: 'meta/llama-3.1-70b-instruct',
  },
  groq: {
    name: 'Groq (Free)',
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    name: 'OpenRouter (Free)',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openrouter/auto',
  },
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  pocketapi: {
    name: 'PocketAPI Server2 (Phone)',
    baseURL: 'http://your-phone-ip:8080',
    model: 'llama-3.3-70b-versatile',
  },
  custom: {
    name: 'Custom Provider',
    baseURL: 'http://localhost:8080',
    model: 'gpt-3.5-turbo',
  },
};

const SYSTEM_PROMPT = `You are an expert AI Coding Agent with deep knowledge of:
- Software development (React, TypeScript, Node.js, Python, Java, Android/Kotlin)
- GitHub operations (repositories, branches, PRs, issues, Actions workflows)
- Android development (Gradle, APK builds, GitHub Actions CI/CD)
- Code analysis, bug detection, and automated fixes

When the user asks you to perform GitHub or build operations, respond with a JSON action block in this format:
<action>
{
  "type": "github_action" | "build_action" | "code_action",
  "operation": "operation_name",
  "params": { ... }
}
</action>

Available operations:
- github_action: create_repo, list_repos, get_repo, create_file, update_file, delete_file, create_branch, create_pr, list_issues, create_issue, update_issue, trigger_workflow, list_workflow_runs, list_artifacts, list_contents
- build_action: generate_android_project, generate_github_actions_workflow, analyze_build_logs
- code_action: analyze_code, detect_errors, suggest_fix, generate_file, explain_code

Always be helpful, precise, and explain what you're doing and why.`;

// ── Runtime-mutable active config ───────────────────────────────
let activeConfig: ProviderConfig = {
  name: PROVIDER_PRESETS.nvidia.name,
  baseURL: PROVIDER_PRESETS.nvidia.baseURL,
  apiKey: process.env.NVIDIA_API_KEY || '',
  model: PROVIDER_PRESETS.nvidia.model,
};

export function getActiveConfig(): ProviderConfig {
  return { ...activeConfig };
}

export function setActiveConfig(config: Partial<ProviderConfig>) {
  activeConfig = { ...activeConfig, ...config };
  logger.info('AI provider config updated', { name: activeConfig.name, baseURL: activeConfig.baseURL, model: activeConfig.model });
}

// ── Detect PocketAPI style vs OpenAI style ───────────────────────
function isPocketAPI(baseURL: string): boolean {
  // PocketAPI exposes /chat?prompt= style; detect by non-standard base URLs
  return !baseURL.includes('api.nvidia.com') &&
         !baseURL.includes('openai.com') &&
         !baseURL.includes('groq.com') &&
         !baseURL.includes('openrouter.ai') &&
         !baseURL.includes('x.ai') &&
         !baseURL.endsWith('/v1');
}

export class AIService {
  async chat(messages: Message[], options: ChatOptions = {}): Promise<string> {
    const cfg = activeConfig;
    const model = options.model || cfg.model;
    const apiKey = cfg.apiKey;
    const baseURL = cfg.baseURL;

    logger.info('AI chat request', { provider: cfg.name, model, messageCount: messages.length });

    // ── PocketAPI Server2 style: /chat?prompt=... ────────────────
    if (isPocketAPI(baseURL)) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      const response = await axios.post(
        `${baseURL}/chat`,
        { prompt: lastUserMsg, messages },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          timeout: 60000,
        }
      );
      const content =
        response.data?.response ||
        response.data?.content ||
        response.data?.choices?.[0]?.message?.content ||
        response.data?.text ||
        JSON.stringify(response.data);
      logger.info('PocketAPI response received', { length: content?.length });
      return content;
    }

    // ── OpenAI-compatible style ──────────────────────────────────
    const payload = {
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4096,
      stream: false,
    };

    const response = await axios.post(`${baseURL}/chat/completions`, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(baseURL.includes('openrouter.ai') ? {
          'HTTP-Referer': 'https://ai-coding-agent.replit.app',
          'X-Title': 'AI Coding Agent',
        } : {}),
      },
      timeout: 90000,
    });

    const content = response.data.choices?.[0]?.message?.content || '';
    logger.info('AI response received', { provider: cfg.name, length: content.length });
    return content;
  }

  async testConnection(): Promise<{ success: boolean; message: string; model?: string }> {
    try {
      const cfg = activeConfig;
      if (isPocketAPI(cfg.baseURL)) {
        const res = await axios.get(`${cfg.baseURL}/status`, { timeout: 10000 });
        return { success: true, message: `PocketAPI connected: ${JSON.stringify(res.data)}`, model: cfg.model };
      }
      const res = await axios.get(`${cfg.baseURL}/models`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        timeout: 10000,
      });
      const firstModel = res.data?.data?.[0]?.id || cfg.model;
      return { success: true, message: `Connected to ${cfg.name}`, model: firstModel };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async analyzeCode(code: string, language: string): Promise<string> {
    return this.chat([{ role: 'user', content: `Analyze this ${language} code. Find bugs, errors, and issues. Suggest fixes:\n\`\`\`${language}\n${code}\n\`\`\`` }], { temperature: 0.3 });
  }

  async generateAndroidWorkflow(repoName: string, options: { buildType?: string; javaVersion?: string } = {}): Promise<string> {
    return this.chat([{
      role: 'user',
      content: `Generate a complete GitHub Actions workflow YAML for building an Android APK for "${repoName}".
Build type: ${options.buildType || 'debug'}, Java: ${options.javaVersion || '17'}
Include: checkout, JDK setup, Gradle cache, APK build, upload artifact.
Return ONLY the YAML, no extra text.`
    }], { temperature: 0.2 });
  }

  async generateAndroidProject(appName: string, packageName: string): Promise<string> {
    return this.chat([{
      role: 'user',
      content: `Generate a minimal Android project for "${appName}" (package: "${packageName}").
Return a JSON object where keys=file paths, values=file contents. Include:
app/build.gradle, build.gradle, settings.gradle, gradle/wrapper/gradle-wrapper.properties,
app/src/main/AndroidManifest.xml, MainActivity.kt, activity_main.xml, strings.xml.
Return ONLY valid JSON, no markdown.`
    }], { temperature: 0.1, max_tokens: 8000 });
  }

  async explainCode(code: string, language: string): Promise<string> {
    return this.chat([{ role: 'user', content: `Explain this ${language} code step by step:\n\`\`\`${language}\n${code}\n\`\`\`` }], { temperature: 0.5 });
  }

  async suggestFix(code: string, error: string, language: string): Promise<string> {
    return this.chat([{ role: 'user', content: `Fix this ${language} code. Error: ${error}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nReturn fixed code with explanation.` }], { temperature: 0.2 });
  }

  async generateFile(description: string, filename: string): Promise<string> {
    const ext = filename.split('.').pop() || 'txt';
    const langMap: Record<string, string> = { ts: 'TypeScript', js: 'JavaScript', py: 'Python', kt: 'Kotlin', java: 'Java', xml: 'XML', gradle: 'Gradle', md: 'Markdown', yaml: 'YAML', json: 'JSON' };
    return this.chat([{ role: 'user', content: `Generate a complete ${langMap[ext] || ext} file named "${filename}". Description: ${description}\nReturn ONLY the file content.` }], { temperature: 0.3, max_tokens: 6000 });
  }

  async listModels(): Promise<string[]> {
    try {
      const cfg = activeConfig;
      if (isPocketAPI(cfg.baseURL)) return [cfg.model];
      const response = await axios.get(`${cfg.baseURL}/models`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        timeout: 10000,
      });
      return response.data.data?.map((m: any) => m.id) || [cfg.model];
    } catch {
      return [activeConfig.model];
    }
  }
}

export const aiService = new AIService();
