import { Router, Request, Response, NextFunction } from 'express';
import { runAutoFixLoop } from '../services/build.service';
import { githubService, FileCommit } from '../services/github.service';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';

const router = Router();
const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── SSE: Auto-fix & rebuild loop ─────────────────────────────────
router.get('/auto-fix', async (req: Request, res: Response) => {
  const { owner, repo, workflow = 'build.yml', branch = 'main', max_attempts = '5' } = req.query as Record<string, string>;

  if (!owner || !repo) {
    res.status(400).json({ success: false, error: 'owner and repo are required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  try {
    await runAutoFixLoop(owner, repo, workflow, branch, parseInt(max_attempts), res);
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

// ── Generate full Android project + push to GitHub ───────────────
router.post('/android/generate-and-push', wrap(async (req: Request, res: Response) => {
  const { owner, repo, app_name, package_name, branch = 'main' } = req.body;
  if (!owner || !repo || !app_name || !package_name) {
    return res.status(400).json({ success: false, error: 'owner, repo, app_name, package_name are required' });
  }

  logger.info('Generating Android project', { owner, repo, app_name, package_name });

  // 1. Generate project with AI
  const aiResponse = await aiService.generateAndroidProject(app_name, package_name);

  // 2. Parse JSON from AI (may be wrapped in markdown)
  let projectFiles: Record<string, string> = {};
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { projectFiles = JSON.parse(jsonMatch[0]); } catch { /* fallback */ }
  }

  // 3. Build default structure if AI response wasn't parseable
  if (Object.keys(projectFiles).length === 0) {
    projectFiles = buildDefaultAndroidProject(app_name, package_name);
  }

  // 4. Also generate GitHub Actions workflow
  const workflowYaml = await aiService.generateAndroidWorkflow(repo, { buildType: 'debug', javaVersion: '17' });
  projectFiles['.github/workflows/build-apk.yml'] = workflowYaml;

  // 5. Commit all files to GitHub in one shot
  const files: FileCommit[] = Object.entries(projectFiles).map(([path, content]) => ({ path, content }));
  const commit = await githubService.commitMultipleFiles(owner, repo, files, `🤖 Generate Android project: ${app_name}`, branch);

  logger.info('Android project pushed', { sha: commit.sha, fileCount: files.length });
  res.json({
    success: true,
    data: {
      commitSha: commit.sha,
      commitUrl: commit.url,
      fileCount: files.length,
      files: files.map(f => f.path),
    },
  });
}));

// ── Multi-file commit ────────────────────────────────────────────
router.post('/commit-files', wrap(async (req: Request, res: Response) => {
  const { owner, repo, files, message, branch = 'main' } = req.body;
  if (!owner || !repo || !files || !message) {
    return res.status(400).json({ success: false, error: 'owner, repo, files, message required' });
  }
  const commit = await githubService.commitMultipleFiles(owner, repo, files as FileCommit[], message, branch);
  res.json({ success: true, data: commit });
}));

// ── Push this entire agent's source code to a GitHub repo ────────
router.post('/push-source', wrap(async (req: Request, res: Response) => {
  const { owner, repo, branch = 'main' } = req.body;
  if (!owner || !repo) return res.status(400).json({ success: false, error: 'owner and repo required' });

  const fs = await import('fs');
  const path = await import('path');
  const ROOT = path.resolve(process.cwd(), '..');

  function collectFiles(dir: string, base: string, result: FileCommit[] = []): FileCommit[] {
    const ignore = ['node_modules', '.git', 'dist', 'build', 'logs', '.cache', '.local'];
    for (const entry of fs.readdirSync(dir)) {
      if (ignore.some(i => entry === i)) continue;
      const full = path.join(dir, entry);
      const rel = path.relative(ROOT, full);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) collectFiles(full, base, result);
      else {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          if (content.length < 500000) result.push({ path: rel, content });
        } catch { /* skip binary */ }
      }
    }
    return result;
  }

  const files = collectFiles(ROOT, ROOT);
  logger.info('Pushing source to GitHub', { owner, repo, fileCount: files.length });
  const commit = await githubService.commitMultipleFiles(owner, repo, files, '🚀 Sync: AI Coding Agent full source', branch);
  res.json({ success: true, data: { ...commit, fileCount: files.length } });
}));

export default router;

// ── Default Android project files ────────────────────────────────
function buildDefaultAndroidProject(appName: string, pkg: string): Record<string, string> {
  const pkgPath = pkg.replace(/\./g, '/');
  return {
    'settings.gradle': `rootProject.name = "${appName}"\ninclude ':app'`,
    'build.gradle': `buildscript {\n    repositories { google(); mavenCentral() }\n    dependencies { classpath 'com.android.tools.build:gradle:8.2.0' }\n}\nallprojects { repositories { google(); mavenCentral() } }`,
    'app/build.gradle': `plugins { id 'com.android.application' }\nandroid {\n    namespace '${pkg}'\n    compileSdk 34\n    defaultConfig {\n        applicationId '${pkg}'\n        minSdk 26\n        targetSdk 34\n        versionCode 1\n        versionName '1.0'\n    }\n    buildTypes { release { minifyEnabled false } }\n    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_17\n        targetCompatibility JavaVersion.VERSION_17\n    }\n}\ndependencies {\n    implementation 'androidx.appcompat:appcompat:1.6.1'\n    implementation 'com.google.android.material:material:1.11.0'\n}`,
    'gradle/wrapper/gradle-wrapper.properties': `distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.4-bin.zip\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists`,
    [`app/src/main/java/${pkgPath}/MainActivity.java`]: `package ${pkg};\nimport androidx.appcompat.app.AppCompatActivity;\nimport android.os.Bundle;\npublic class MainActivity extends AppCompatActivity {\n    @Override protected void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        setContentView(R.layout.activity_main);\n    }\n}`,
    'app/src/main/AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    package="${pkg}">\n    <application\n        android:allowBackup="true"\n        android:label="@string/app_name"\n        android:theme="@style/Theme.AppCompat.DayNight"\n        android:usesCleartextTraffic="true">\n        <activity android:name=".MainActivity" android:exported="true">\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN"/>\n                <category android:name="android.intent.category.LAUNCHER"/>\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>`,
    'app/src/main/res/layout/activity_main.xml': `<?xml version="1.0" encoding="utf-8"?>\n<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"\n    android:layout_width="match_parent" android:layout_height="match_parent"\n    android:gravity="center" android:orientation="vertical">\n    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"\n        android:text="@string/app_name" android:textSize="24sp"/>\n</LinearLayout>`,
    'app/src/main/res/values/strings.xml': `<resources>\n    <string name="app_name">${appName}</string>\n</resources>`,
    '.github/workflows/build-apk.yml': `name: Build Android APK\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-java@v4\n        with: { java-version: '17', distribution: 'temurin' }\n      - name: Cache Gradle\n        uses: actions/cache@v4\n        with:\n          path: |\n            ~/.gradle/caches\n            ~/.gradle/wrapper\n          key: gradle-\${{ hashFiles('**/*.gradle*') }}\n      - name: Build APK\n        run: |\n          chmod +x gradlew\n          ./gradlew assembleDebug\n      - name: Upload APK\n        uses: actions/upload-artifact@v4\n        with:\n          name: debug-apk\n          path: app/build/outputs/apk/debug/*.apk`,
    'README.md': `# ${appName}\n\nAndroid app generated by AI Coding Agent.\n\n## Build\n\n\`\`\`bash\n./gradlew assembleDebug\n\`\`\`\n\nAPK is automatically built on push via GitHub Actions.`,
  };
}
