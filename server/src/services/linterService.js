import { ESLint } from 'eslint';

// Create ESLint instance for JS & TS
const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-var': 'warn',
    },
  },
});

/**
 * Static Analysis for Python Code
 * Checks for PEP 8 violations, dangerous constructs, and security flaws.
 */
const lintPythonCode = (code) => {
  const issues = [];
  const lines = code.split('\n');

  lines.forEach((lineText, index) => {
    const lineNum = index + 1;
    const trimmed = lineText.trim();

    // 1. Security: Hardcoded API Keys / Secrets
    if (/(?:api_key|secret|password|token)\s*=\s*["'][A-Za-z0-9_\-]{8,}["']/i.test(trimmed)) {
      issues.push({
        line: lineNum,
        ruleId: 'python/security-hardcoded-secret',
        severity: 2, // High
        message: 'Hardcoded sensitive secret or API key found.',
        type: 'security'
      });
    }

    // 2. Security: Dangerous eval() or exec()
    if (/\b(?:eval|exec)\s*\(/.test(trimmed)) {
      issues.push({
        line: lineNum,
        ruleId: 'python/security-dangerous-eval',
        severity: 2, // High
        message: 'Use of eval() or exec() detected. This introduces remote code execution vulnerabilities.',
        type: 'security'
      });
    }

    // 3. Style / Bug: Naked except block (PEP 8 anti-pattern)
    if (/^except\s*:/.test(trimmed)) {
      issues.push({
        line: lineNum,
        ruleId: 'python/no-bare-except',
        severity: 1, // Medium
        message: 'Bare except clause detected. Catch specific exceptions (e.g., except ValueError:) to avoid masking errors.',
        type: 'bug'
      });
    }

    // 4. Style: Inconsistent indentation (mixing tabs and spaces or odd spaces)
    if (lineText.startsWith('\t')) {
      issues.push({
        line: lineNum,
        ruleId: 'python/pep8-indentation',
        severity: 1, // Medium
        message: 'Tab indentation found. PEP 8 standard requires 4 spaces per indentation level.',
        type: 'style'
      });
    }

    // 5. Comparison: Comparing to None or True with == instead of 'is'
    if (/==\s*None\b|==\s*True\b|==\s*False\b/.test(trimmed)) {
      issues.push({
        line: lineNum,
        ruleId: 'python/pep8-identity-comparison',
        severity: 1, // Medium
        message: "Comparison to singleton using '=='. Use 'is None' or 'is not None' instead of '=='.",
        type: 'style'
      });
    }
  });

  return issues;
};

/**
 * Universal Multi-Language Linter
 * Supports: 'javascript', 'typescript', 'python'
 */
export const lintCode = async (code, language = 'javascript') => {
  const lang = (language || 'javascript').toLowerCase();

  // Route to Python static analyzer
  if (lang === 'python' || lang === 'py') {
    return lintPythonCode(code);
  }

  // Default: JavaScript / TypeScript via ESLint
  try {
    const results = await eslint.lintText(code);
    const messages = results[0]?.messages || [];

    return messages.map((msg) => ({
      line: msg.line || 1,
      ruleId: msg.ruleId || 'syntax-error',
      severity: msg.severity, // 1 = warning (medium), 2 = error (high)
      message: msg.message,
      type: msg.ruleId?.includes('eval') ? 'security' : 'style'
    }));
  } catch (err) {
    // Graceful syntax fallback
    return [{
      line: 1,
      ruleId: 'parser-notice',
      severity: 1,
      message: `Syntax validation notice: ${err.message}`,
      type: 'style'
    }];
  }
};
