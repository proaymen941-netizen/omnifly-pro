const fs = require('fs');
const path = require('path');

const routesDir = 'artifacts/api-server/src/routes';
const files = fs.readdirSync(routesDir);
let imports = 'import { Router } from "express";\n';
let uses = 'const router = Router();\n';

files.forEach(file => {
  if (file === 'index.ts' || !file.endsWith('.ts')) return;
  const name = file.replace('.ts', '');
  const camel = name.replace(/-([a-z])/g, g => g[1].toUpperCase()) + 'Router';
  imports += `import ${camel} from "./${name}";\n`;
  uses += `router.use(${camel});\n`;
});

const content = imports + '\n' + uses + '\nexport default router;\n';
fs.writeFileSync(path.join(routesDir, 'index.ts'), content);
