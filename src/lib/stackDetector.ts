export interface DetectedStack {
  frontend: string[];
  backend: string[];
  testing: string[];
  language: string;
  packageManager: string;
  confidence: number;
}

const FRAMEWORK_PATTERNS: Record<string, {
  files: string[];
  dependencies: string[];
  detectedAs: string;
  category: 'frontend' | 'backend' | 'testing';
}[]> = {
  react: [
    {
      files: ['package.json'],
      dependencies: ['react', 'react-dom', 'next', 'gatsby'],
      detectedAs: 'React',
      category: 'frontend',
    },
  ],
  vue: [
    {
      files: ['package.json'],
      dependencies: ['vue', 'nuxt', '@vue/cli'],
      detectedAs: 'Vue',
      category: 'frontend',
    },
  ],
  angular: [
    {
      files: ['package.json', 'angular.json'],
      dependencies: ['@angular/core', '@angular/cli'],
      detectedAs: 'Angular',
      category: 'frontend',
    },
  ],
  svelte: [
    {
      files: ['package.json'],
      dependencies: ['svelte', '@sveltejs/kit'],
      detectedAs: 'Svelte',
      category: 'frontend',
    },
  ],
  nextjs: [
    {
      files: ['package.json', 'next.config.js', 'next.config.ts', 'next.config.mjs'],
      dependencies: ['next'],
      detectedAs: 'Next.js',
      category: 'frontend',
    },
  ],
  express: [
    {
      files: ['package.json'],
      dependencies: ['express'],
      detectedAs: 'Express',
      category: 'backend',
    },
  ],
  fastify: [
    {
      files: ['package.json'],
      dependencies: ['fastify'],
      detectedAs: 'Fastify',
      category: 'backend',
    },
  ],
  nestjs: [
    {
      files: ['package.json', 'nest-cli.json'],
      dependencies: ['@nestjs/core'],
      detectedAs: 'NestJS',
      category: 'backend',
    },
  ],
  django: [
    {
      files: ['requirements.txt', 'manage.py', 'pyproject.toml'],
      dependencies: ['django'],
      detectedAs: 'Django',
      category: 'backend',
    },
  ],
  fastapi: [
    {
      files: ['requirements.txt', 'pyproject.toml'],
      dependencies: ['fastapi'],
      detectedAs: 'FastAPI',
      category: 'backend',
    },
  ],
  flask: [
    {
      files: ['requirements.txt', 'pyproject.toml'],
      dependencies: ['flask'],
      detectedAs: 'Flask',
      category: 'backend',
    },
  ],
  jest: [
    {
      files: ['package.json', 'jest.config.js', 'jest.config.ts'],
      dependencies: ['jest'],
      detectedAs: 'Jest',
      category: 'testing',
    },
  ],
  vitest: [
    {
      files: ['package.json', 'vitest.config.ts'],
      dependencies: ['vitest'],
      detectedAs: 'Vitest',
      category: 'testing',
    },
  ],
  playwright: [
    {
      files: ['package.json', 'playwright.config.ts', 'playwright.config.js'],
      dependencies: ['@playwright/test'],
      detectedAs: 'Playwright',
      category: 'testing',
    },
  ],
  cypress: [
    {
      files: ['package.json', 'cypress.config.ts', 'cypress.json'],
      dependencies: ['cypress'],
      detectedAs: 'Cypress',
      category: 'testing',
    },
  ],
  pytest: [
    {
      files: ['requirements.txt', 'pyproject.toml', 'pytest.ini', 'conftest.py'],
      dependencies: ['pytest'],
      detectedAs: 'Pytest',
      category: 'testing',
    },
  ],
};

function detectFromFileStructure(files: string[]): DetectedStack {
  const result: DetectedStack = {
    frontend: [],
    backend: [],
    testing: [],
    language: 'unknown',
    packageManager: 'unknown',
    confidence: 0,
  };

  const hasPackageJson = files.some((f) => f.includes('package.json'));
  const hasRequirements = files.some(
    (f) => f.includes('requirements.txt') || f.includes('pyproject.toml')
  );
  const hasGoMod = files.some((f) => f.includes('go.mod'));
  const hasCargoToml = files.some((f) => f.includes('Cargo.toml'));

  if (hasPackageJson) {
    result.language = 'typescript';
    result.packageManager = 'npm';
    if (files.some((f) => f.includes('bun.lockb') || f.includes('bun.lock'))) {
      result.packageManager = 'bun';
    } else if (files.some((f) => f.includes('yarn.lock'))) {
      result.packageManager = 'yarn';
    } else if (files.some((f) => f.includes('pnpm-lock.yaml'))) {
      result.packageManager = 'pnpm';
    }
  } else if (hasRequirements) {
    result.language = 'python';
    result.packageManager = 'pip';
  } else if (hasGoMod) {
    result.language = 'go';
    result.packageManager = 'go modules';
  } else if (hasCargoToml) {
    result.language = 'rust';
    result.packageManager = 'cargo';
  }

  for (const patterns of Object.values(FRAMEWORK_PATTERNS)) {
    for (const pattern of patterns) {
      const hasFile = pattern.files.some((pf) =>
        files.some((f) => f.includes(pf))
      );
      if (hasFile) {
        result[pattern.category].push(pattern.detectedAs);
      }
    }
  }

  result.confidence = hasPackageJson || hasRequirements ? 0.8 : 0.4;
  return result;
}

function detectFromPackageJson(packageJson: Record<string, unknown>): DetectedStack {
  const result: DetectedStack = {
    frontend: [],
    backend: [],
    testing: [],
    language: 'javascript',
    packageManager: 'npm',
    confidence: 0.9,
  };

  const deps = {
    ...(packageJson.dependencies as Record<string, string> || {}),
    ...(packageJson.devDependencies as Record<string, string> || {}),
  };

  const depKeys = Object.keys(deps).map((k) => k.toLowerCase());

  if (depKeys.includes('typescript') || depKeys.includes('@types/node')) {
    result.language = 'typescript';
  }

  for (const patterns of Object.values(FRAMEWORK_PATTERNS)) {
    for (const pattern of patterns) {
      const hasDep = pattern.dependencies.some((d) =>
        depKeys.includes(d.toLowerCase())
      );
      if (hasDep) {
        result[pattern.category].push(pattern.detectedAs);
      }
    }
  }

  if (result.frontend.length === 0 && result.backend.length === 0) {
    result.backend.push('Node.js');
  }

  if (result.testing.length === 0) {
    result.testing.push('Vitest');
  }

  return result;
}

function detectFromHeaders(headers: Record<string, string>): DetectedStack {
  const result: DetectedStack = {
    frontend: [],
    backend: [],
    testing: [],
    language: 'unknown',
    packageManager: 'unknown',
    confidence: 0.3,
  };

  const serverHeader = headers['server']?.toLowerCase() || '';
  const poweredBy = headers['x-powered-by']?.toLowerCase() || '';

  if (poweredBy.includes('next')) {
    result.frontend.push('Next.js');
  }
  if (poweredBy.includes('express')) {
    result.backend.push('Express');
  }
  if (serverHeader.includes('nginx')) {
    result.backend.push('Nginx');
  }
  if (serverHeader.includes('uvicorn')) {
    result.backend.push('FastAPI');
    result.language = 'python';
  }
  if (serverHeader.includes('gunicorn')) {
    result.backend.push('Django/Flask');
    result.language = 'python';
  }

  if (result.frontend.length > 0 || result.backend.length > 0) {
    result.confidence = 0.5;
  }

  return result;
}

export async function detectStackFromRepo(
  repoUrl: string
): Promise<DetectedStack> {
  const defaultStack: DetectedStack = {
    frontend: ['React'],
    backend: ['Node.js'],
    testing: ['Vitest'],
    language: 'typescript',
    packageManager: 'npm',
    confidence: 0.2,
  };

  try {
    const apiUrl = repoUrl
      .replace('github.com', 'api.github.com/repos')
      .replace(/\/$/, '');

    const treeResponse = await fetch(`${apiUrl}/git/trees/main?recursive=1`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!treeResponse.ok) {
      const masterResponse = await fetch(
        `${apiUrl}/git/trees/master?recursive=1`,
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      );
      if (!masterResponse.ok) return defaultStack;

      const masterData = await masterResponse.json();
      const files = masterData.tree?.map((t: { path: string }) => t.path) || [];
      const detected = detectFromFileStructure(files);

      const pkgFile = files.find((f: string) => f === 'package.json');
      if (pkgFile) {
        const pkgResponse = await fetch(
          `${apiUrl}/contents/package.json`,
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        if (pkgResponse.ok) {
          const pkgData = await pkgResponse.json();
          const content = Buffer.from(pkgData.content, 'base64').toString();
          const packageJson = JSON.parse(content);
          const pkgDetected = detectFromPackageJson(packageJson);
          if (pkgDetected.confidence > detected.confidence) return pkgDetected;
        }
      }

      return detected;
    }

    const data = await treeResponse.json();
    const files = data.tree?.map((t: { path: string }) => t.path) || [];
    const detected = detectFromFileStructure(files);

    const pkgFile = files.find((f: string) => f === 'package.json');
    if (pkgFile) {
      const pkgResponse = await fetch(
        `${apiUrl}/contents/package.json`,
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      );
      if (pkgResponse.ok) {
        const pkgData = await pkgResponse.json();
        const content = Buffer.from(pkgData.content, 'base64').toString();
        const packageJson = JSON.parse(content);
        const pkgDetected = detectFromPackageJson(packageJson);
        if (pkgDetected.confidence > detected.confidence) return pkgDetected;
      }
    }

    return detected;
  } catch (error) {
    console.error('Stack detection from repo failed:', error);
    return defaultStack;
  }
}

export async function detectStackFromUrl(
  appUrl: string
): Promise<DetectedStack> {
  const defaultStack: DetectedStack = {
    frontend: ['Unknown'],
    backend: ['Unknown'],
    testing: ['Playwright'],
    language: 'unknown',
    packageManager: 'unknown',
    confidence: 0.1,
  };

  try {
    const response = await fetch(appUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return detectFromHeaders(headers);
  } catch (error) {
    console.error('Stack detection from URL failed:', error);
    return defaultStack;
  }
}

export async function detectStackFromApiSpec(
  apiSpecUrl: string
): Promise<DetectedStack> {
  const defaultStack: DetectedStack = {
    frontend: [],
    backend: ['REST API'],
    testing: ['Supertest'],
    language: 'typescript',
    packageManager: 'npm',
    confidence: 0.3,
  };

  try {
    const response = await fetch(apiSpecUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return defaultStack;

    const spec = await response.text();

    if (spec.includes('"openapi"') || spec.includes('"swagger"')) {
      return {
        frontend: [],
        backend: ['REST API'],
        testing: ['Supertest'],
        language: 'typescript',
        packageManager: 'npm',
        confidence: 0.7,
      };
    }

    if (spec.includes('"graphql"') || spec.includes('type Query')) {
      return {
        frontend: [],
        backend: ['GraphQL'],
        testing: ['Supertest'],
        language: 'typescript',
        packageManager: 'npm',
        confidence: 0.7,
      };
    }

    return defaultStack;
  } catch (error) {
    console.error('Stack detection from API spec failed:', error);
    return defaultStack;
  }
}

export function getRecommendedTestingFramework(stack: DetectedStack): string {
  if (stack.testing.length > 0) {
    return stack.testing[0];
  }

  if (stack.language === 'python') {
    return 'Pytest';
  }

  if (stack.language === 'go') {
    return 'Go Testing';
  }

  if (stack.language === 'rust') {
    return 'Rust Test';
  }

  if (stack.frontend.some((f) => ['React', 'Next.js', 'Vue', 'Svelte'].includes(f))) {
    return 'Vitest + Playwright';
  }

  return 'Vitest';
}

export function formatStackSummary(stack: DetectedStack): string {
  const parts: string[] = [];

  if (stack.frontend.length > 0) {
    parts.push(`Frontend: ${stack.frontend.join(', ')}`);
  }
  if (stack.backend.length > 0) {
    parts.push(`Backend: ${stack.backend.join(', ')}`);
  }
  if (stack.testing.length > 0) {
    parts.push(`Testing: ${stack.testing.join(', ')}`);
  }
  parts.push(`Language: ${stack.language}`);

  return parts.join(' | ');
}
