const fs = require('fs');
let content = fs.readFileSync('artifacts/pos-system/src/main/main.js', 'utf8');

const targetStr = `function startBackend() {
  setupDatabase();
  const appRoot = typeof app.getAppPath === 'function' ? app.getAppPath() : __dirname;
  const serverCandidates = [
    path.join(__dirname, 'dist', 'server.cjs'),
    path.join(appRoot, 'dist', 'server.cjs'),
    path.join(process.resourcesPath || '', 'app', 'dist', 'server.cjs'),
    path.join(process.resourcesPath || '', 'dist', 'server.cjs')
  ];
  const serverScript = serverCandidates.find(p => fs.existsSync(p));
  if (serverScript) {
    console.log('Starting backend server from:', serverScript);
    
    const isPackaged = app.isPackaged;
    const nodeExecutable = isPackaged ? process.execPath : 'node';
    
    serverProcess = spawn(nodeExecutable, [serverScript], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3000',
        ELECTRON_RUN_AS_NODE: '1',
        APP_ROOT: appRoot
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(\`[Server]: \${data.toString().trim()}\`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(\`[Server Error]: \${data.toString().trim()}\`);
    });

    serverProcess.on('exit', (code) => {
      console.log(\`Server process exited with code \${code}\`);
    });
  } else {
    console.error('server.cjs not found in any candidate path:', serverCandidates);
  }
}`;

const replaceStr = `function startBackend() {
  setupDatabase();
  const appRoot = typeof app.getAppPath === 'function' ? app.getAppPath() : __dirname;
  const serverCandidates = [
    path.join(__dirname, 'dist', 'server.cjs'),
    path.join(appRoot, 'dist', 'server.cjs'),
    path.join(process.resourcesPath || '', 'app', 'dist', 'server.cjs'),
    path.join(process.resourcesPath || '', 'dist', 'server.cjs')
  ];
  const serverScript = serverCandidates.find(p => fs.existsSync(p));
  if (serverScript) {
    console.log('Starting backend server from:', serverScript);
    try {
      // Set env vars before requiring
      process.env.NODE_ENV = 'production';
      process.env.PORT = '3000';
      process.env.APP_ROOT = appRoot;
      require(serverScript);
    } catch (err) {
      console.error('Failed to load server.cjs:', err);
    }
  } else {
    console.error('server.cjs not found in any candidate path:', serverCandidates);
  }
}`;

// Use regex to replace the function robustly
const rx = /function startBackend\(\) \{[\s\S]*?\} else \{\s*console.error\('server.cjs not found in any candidate path:', serverCandidates\);\s*\}\s*\}/;

if (rx.test(content)) {
  content = content.replace(rx, replaceStr);
  fs.writeFileSync('artifacts/pos-system/src/main/main.js', content, 'utf8');
  console.log("Patched successfully!");
} else {
  console.log("Could not find startBackend block");
}
