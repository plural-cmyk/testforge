import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { id: 'default-user' },
    update: {},
    create: {
      id: 'default-user',
      email: 'dev@testforge.dev',
      name: 'TestForge Developer',
    },
  });

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      name: 'My Next.js App',
      repoUrl: 'https://github.com/example/nextjs-app',
      appUrl: 'https://example.com',
      stack: 'Next.js, React, TypeScript, Tailwind CSS',
      scope: 'fullstack',
      userId: user.id,
    },
  });

  // Create demo test cases
  const frontendTest = await prisma.testCase.upsert({
    where: { id: 'demo-test-1' },
    update: {},
    create: {
      id: 'demo-test-1',
      projectId: project.id,
      title: 'Homepage renders correctly',
      code: `import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Homepage', () => {
  it('renders the hero heading', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it('displays the CTA button', () => {
    render(<Home />);
    const cta = screen.getByRole('button', { name: /get started/i });
    expect(cta).toBeVisible();
  });
});`,
      type: 'frontend',
      filePath: '__tests__/homepage.test.tsx',
    },
  });

  const backendTest = await prisma.testCase.upsert({
    where: { id: 'demo-test-2' },
    update: {},
    create: {
      id: 'demo-test-2',
      projectId: project.id,
      title: 'API /users endpoint returns user list',
      code: `import request from 'supertest';
import { app } from '@/app';

describe('GET /api/users', () => {
  it('returns 200 with user list', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns 401 without authentication', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', '');
    expect(response.status).toBe(401);
  });

  it('handles missing required fields', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});`,
      type: 'backend',
      filePath: '__tests__/api/users.test.ts',
    },
  });

  const e2eTest = await prisma.testCase.upsert({
    where: { id: 'demo-test-3' },
    update: {},
    create: {
      id: 'demo-test-3',
      projectId: project.id,
      title: 'User can complete login flow',
      code: `import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('user can log in and see dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'securePassword123');
    await page.click('[data-testid="submit-btn"]');
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.welcome-message')).toBeVisible();
  });

  test('displays error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongPassword');
    await page.click('[data-testid="submit-btn"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });
});`,
      type: 'e2e',
      filePath: 'e2e/login.spec.ts',
    },
  });

  // Create a demo test run
  const testRun = await prisma.testRun.upsert({
    where: { id: 'demo-run-1' },
    update: {},
    create: {
      id: 'demo-run-1',
      projectId: project.id,
      status: 'failed',
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(Date.now() - 30000),
      summary: JSON.stringify({
        total: 3,
        passed: 2,
        failed: 1,
        flaky: 0,
        skipped: 0,
        duration: 30000,
        coverage: 72.5,
      }),
    },
  });

  // Create demo test results
  await prisma.testResult.upsert({
    where: { id: 'demo-result-1' },
    update: {},
    create: {
      id: 'demo-result-1',
      testRunId: testRun.id,
      testCaseId: frontendTest.id,
      status: 'pass',
      duration: 1250,
    },
  });

  await prisma.testResult.upsert({
    where: { id: 'demo-result-2' },
    update: {},
    create: {
      id: 'demo-result-2',
      testRunId: testRun.id,
      testCaseId: backendTest.id,
      status: 'fail',
      errorMessage: 'Expected status 200 but received 404. The endpoint /api/users may have been removed or renamed.',
      duration: 890,
    },
  });

  await prisma.testResult.upsert({
    where: { id: 'demo-result-3' },
    update: {},
    create: {
      id: 'demo-result-3',
      testRunId: testRun.id,
      testCaseId: e2eTest.id,
      status: 'pass',
      duration: 4500,
    },
  });

  console.log('✅ Seed data created successfully!');
  console.log(`   User: ${user.email}`);
  console.log(`   Project: ${project.name}`);
  console.log(`   Test Cases: 3 (frontend, backend, e2e)`);
  console.log(`   Test Run: 1 (2 passed, 1 failed)`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
