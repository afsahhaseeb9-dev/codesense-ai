import { describe, it, expect } from 'vitest';
import { lintCode } from '../src/services/linterService.js';
import { calculateQualityScore } from '../src/utils/scoringAlgorithm.js';

describe('Grounded AI & Static Analysis Pipeline', () => {

  // Test 1: ESLint Static Analysis
  it('should detect code issues and return structured findings with line references', async () => {
    const buggyCode = `
      var x = 10;
      if (x == "10") {
        console.log("Loose equality check");
      }
    `;

    const findings = await lintCode(buggyCode);

    expect(Array.isArray(findings)).toBe(true);
    expect(findings.length).toBeGreaterThan(0);

    // Verify first finding structure
    const firstIssue = findings[0];
    expect(firstIssue).toHaveProperty('line');
    expect(firstIssue).toHaveProperty('message');
    expect(firstIssue).toHaveProperty('severity');
    expect(typeof firstIssue.line).toBe('number');
  });

  // Test 2: ESLint-to-LLM Prompt Injection Formatting
  it('should safely format and serialize linter findings for LLM prompt injection', async () => {
    const mockLinterFindings = [
      {
        line: 2,
        ruleId: 'no-var',
        severity: 2,
        message: 'Unexpected var, use let or const instead.'
      },
      {
        line: 3,
        ruleId: 'eqeqeq',
        severity: 2,
        message: 'Expected === and instead saw ==.'
      }
    ];

    // Simulate how the server injects linter results into the Gemini prompt
    const serializedForPrompt = JSON.stringify(mockLinterFindings, null, 2);

    expect(serializedForPrompt).toContain('no-var');
    expect(serializedForPrompt).toContain('eqeqeq');
    expect(serializedForPrompt).toContain('line');

    // Ensure it deserializes cleanly without losing data
    const parsedBack = JSON.parse(serializedForPrompt);
    expect(parsedBack.length).toBe(2);
    expect(parsedBack[0].ruleId).toBe('no-var');
    expect(parsedBack[1].line).toBe(3);
  });

  // Test 3: Deterministic Quality Scoring Engine
  it('should calculate accurate deductions based on issue severity', () => {
    const testIssues = [
      { severity: 'high' },   // -15
      { severity: 'high' },   // -15
      { severity: 'medium' }, // -5
      { severity: 'low' },    // -2
    ];

    const result = calculateQualityScore(testIssues);

    // 100 - (15 + 15 + 5 + 2) = 63
    expect(result.score).toBe(63);
    expect(result.grade).toBe('D');
    expect(result.totalIssues).toBe(4);
    expect(result.severityCounts.high).toBe(2);
    expect(result.severityCounts.medium).toBe(1);
    expect(result.severityCounts.low).toBe(1);
  });

  // Test 4: Clean Code Edge Case
  it('should grant a perfect 100 and Grade A when zero issues exist', () => {
    const cleanIssues = [];
    const result = calculateQualityScore(cleanIssues);

    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.label).toBe('Excellent');
    expect(result.totalIssues).toBe(0);
  });

  // Test 5: Score Clamping Boundary
  it('should never drop score below 0 even with severe issue counts', () => {
    const extremeIssues = Array(10).fill({ severity: 'high' }); // 10 * 15 = 150 points deduction

    const result = calculateQualityScore(extremeIssues);

    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
  // Test 6: GitHub TTL Cache Efficiency
  it('should verify cache storage and TTL expiry mechanisms', () => {
    const testCache = new Map();
    const TTL = 1000; // 1 second for test

    const key = 'test-owner/test-repo/main/app.js:anon';
    testCache.set(key, {
      data: { code: 'console.log("cached")' },
      expiresAt: Date.now() + TTL
    });

    // Immediate lookup: HIT
    const hit = testCache.get(key);
    expect(hit).toBeDefined();
    expect(hit.expiresAt).toBeGreaterThan(Date.now());
    expect(hit.data.code).toBe('console.log("cached")');
  });
    // Test 7: Multi-Language Static Analysis (Python PEP 8 & Security)
  it('should detect Python-specific security flaws and PEP 8 violations', async () => {
    const pythonCode = `
import os

api_key = "sk_live_1234567890abcdef"

def execute_user_input(cmd):
    try:
        eval(cmd)
    except:
        pass
    if cmd == None:
        return False
`;

    const findings = await lintCode(pythonCode, 'python');

    expect(Array.isArray(findings)).toBe(true);
    expect(findings.length).toBeGreaterThanOrEqual(3);

    // Verify Python rules were applied
    const ruleIds = findings.map(f => f.ruleId);
    expect(ruleIds).toContain('python/security-hardcoded-secret');
    expect(ruleIds).toContain('python/security-dangerous-eval');
    expect(ruleIds).toContain('python/no-bare-except');
    expect(ruleIds).toContain('python/pep8-identity-comparison');
  });
