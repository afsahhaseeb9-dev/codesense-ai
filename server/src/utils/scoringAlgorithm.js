/**
 * Calculates a 0-100 Quality Score and category breakdown based on issues
 * @param {Array} issues - Array of issues returned by Gemini
 * @returns {Object} Score details, grade, and category breakdown
 */
export const calculateQualityScore = (issues = []) => {
  let penalty = 0;

  // Breakdown counters
  const breakdown = {
    bug: 0,
    security: 0,
    style: 0,
    performance: 0,
  };

  const severityCounts = {
    high: 0,
    medium: 0,
    low: 0,
  };

  issues.forEach((issue) => {
    // 1. Count by severity and apply point deductions
    const severity = (issue.severity || 'low').toLowerCase();
    if (severity === 'high') {
      penalty += 15;
      severityCounts.high += 1;
    } else if (severity === 'medium') {
      penalty += 5;
      severityCounts.medium += 1;
    } else {
      penalty += 2;
      severityCounts.low += 1;
    }

    // 2. Count by issue category
    const type = (issue.type || 'style').toLowerCase();
    if (breakdown[type] !== undefined) {
      breakdown[type] += 1;
    } else {
      breakdown.style += 1;
    }
  });

  // Calculate score between 0 and 100
  const score = Math.max(0, 100 - penalty);

  // Assign a friendly letter grade and label
  let grade = 'A';
  let label = 'Excellent';

  if (score < 60) {
    grade = 'F';
    label = 'Needs Urgent Attention';
  } else if (score < 70) {
    grade = 'D';
    label = 'Needs Improvement';
  } else if (score < 80) {
    grade = 'C';
    label = 'Satisfactory';
  } else if (score < 90) {
    grade = 'B';
    label = 'Good';
  }

  return {
    score,
    grade,
    label,
    totalIssues: issues.length,
    breakdown,
    severityCounts,
  };
};