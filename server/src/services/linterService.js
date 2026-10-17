import { ESLint } from 'eslint';

/**
 * Runs in-memory ESLint analysis on raw student code
 * @param {string} codeString - The raw JavaScript code to inspect
 * @returns {Promise<Array>} Array of linting issues
 */
export const lintCode = async (codeString) => {
  try {
    // 1. Configure ESLint rules in-memory
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.js', '**/*.jsx', '**/*.mjs'],
          languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
          },
          rules: {
            'no-unused-vars': 'warn',       // Warns if a student creates a variable they never use
            'no-undef': 'error',            // Flags variables used before being defined
            'eqeqeq': 'warn',               // Flags loose equality (== instead of ===)
            'no-unreachable': 'error',      // Flags code written after a return statement
            'no-empty': 'warn',             // Flags empty if-blocks or loops
            'no-constant-condition': 'warn' // Flags things like if (true)
          },
        },
      ],
    });

    // 2. Lint the code directly from memory
    const results = await eslint.lintText(codeString, { filePath: 'student-code.js' });

    if (!results || results.length === 0) {
      return [];
    }

    // 3. Format the raw ESLint output into our clean project schema
    const issues = results[0].messages.map((msg) => ({
      line: msg.line || 1,
      column: msg.column || 1,
      rule: msg.ruleId || 'syntax-error',
      severity: msg.severity === 2 ? 'high' : 'medium',
      message: msg.message,
    }));

    return issues;
  } catch (error) {
    console.error('Linter error:', error);
    // If there is an invalid syntax error that crashes parsing, catch it safely
    return [
      {
        line: 1,
        column: 1,
        rule: 'fatal-parse-error',
        severity: 'high',
        message: error.message || 'Code has syntax errors and could not be parsed.',
      },
    ];
  }
};