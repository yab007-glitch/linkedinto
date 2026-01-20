import { getDb, saveDb } from './rss-service.js';
import { getPostAnalytics } from './analytics-service.js';

// Create A/B test
export async function createABTest(testConfig) {
  const db = await getDb();
  
  if (!db.abTests) {
    db.abTests = [];
  }

  const test = {
    id: `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    name: testConfig.name,
    description: testConfig.description || '',
    variants: testConfig.variants.map((variant, index) => ({
      id: `variant-${index}`,
      name: variant.name,
      templateId: variant.templateId,
      postIds: [],
      metrics: {
        totalPosts: 0,
        totalImpressions: 0,
        totalEngagements: 0,
        avgEngagementRate: 0,
        avgCTR: 0
      }
    })),
    status: 'running',
    winner: null,
    startDate: new Date().toISOString(),
    endDate: null,
    targetSampleSize: testConfig.targetSampleSize || 20, // Posts per variant
    confidenceLevel: testConfig.confidenceLevel || 0.95,
    createdAt: new Date().toISOString()
  };

  db.abTests.push(test);
  await saveDb(db);

  console.log(`✅ Created A/B test: ${test.name}`);
  return test;
}

// Get all A/B tests
export async function getAllABTests() {
  const db = await getDb();
  return db.abTests || [];
}

// Get A/B test by ID
export async function getABTestById(testId) {
  const db = await getDb();
  if (!db.abTests) return null;
  
  return db.abTests.find(t => t.id === testId);
}

// Get active A/B tests
export async function getActiveABTests() {
  const db = await getDb();
  if (!db.abTests) return [];
  
  return db.abTests.filter(t => t.status === 'running');
}

// Assign post to A/B test variant
export async function assignPostToTest(testId, postId, variantId) {
  const db = await getDb();
  const test = db.abTests.find(t => t.id === testId);
  
  if (!test) {
    throw new Error(`Test not found: ${testId}`);
  }

  const variant = test.variants.find(v => v.id === variantId);
  if (!variant) {
    throw new Error(`Variant not found: ${variantId}`);
  }

  variant.postIds.push(postId);
  await saveDb(db);

  console.log(`📊 Assigned post ${postId} to variant ${variantId} of test ${testId}`);
  return test;
}

// Get next variant for round-robin assignment
export async function getNextVariantForTest(testId) {
  const test = await getABTestById(testId);
  if (!test) {
    throw new Error(`Test not found: ${testId}`);
  }

  // Round-robin: find variant with fewest posts
  const variantWithFewestPosts = test.variants.reduce((min, variant) => 
    variant.postIds.length < min.postIds.length ? variant : min
  );

  return variantWithFewestPosts;
}

// Update test metrics
export async function updateTestMetrics(testId) {
  const db = await getDb();
  const test = db.abTests.find(t => t.id === testId);
  
  if (!test) {
    throw new Error(`Test not found: ${testId}`);
  }

  // Update metrics for each variant
  for (const variant of test.variants) {
    let totalImpressions = 0;
    let totalEngagements = 0;
    let totalClicks = 0;
    let validPosts = 0;

    for (const postId of variant.postIds) {
      const analytics = await getPostAnalytics(postId);
      if (analytics) {
        totalImpressions += analytics.impressions;
        totalEngagements += analytics.likes + analytics.comments + analytics.shares;
        totalClicks += analytics.clicks || 0;
        validPosts++;
      }
    }

    variant.metrics = {
      totalPosts: variant.postIds.length,
      totalImpressions,
      totalEngagements,
      avgEngagementRate: totalImpressions > 0 
        ? ((totalEngagements / totalImpressions) * 100).toFixed(2)
        : 0,
      avgCTR: totalImpressions > 0
        ? ((totalClicks / totalImpressions) * 100).toFixed(2)
        : 0
    };
  }

  await saveDb(db);
  console.log(`📊 Updated metrics for test: ${testId}`);
  return test;
}

// Check if test is complete
export async function checkTestCompletion(testId) {
  const test = await getABTestById(testId);
  if (!test) return false;

  // Check if all variants have reached target sample size
  const allVariantsComplete = test.variants.every(v => 
    v.postIds.length >= test.targetSampleSize
  );

  if (allVariantsComplete && test.status === 'running') {
    await updateTestMetrics(testId);
    await determineWinner(testId);
    return true;
  }

  return false;
}

// Determine test winner using statistical analysis
export async function determineWinner(testId) {
  const db = await getDb();
  const test = db.abTests.find(t => t.id === testId);
  
  if (!test) {
    throw new Error(`Test not found: ${testId}`);
  }

  // Update metrics first
  await updateTestMetrics(testId);

  // Find variant with highest engagement rate
  const winner = test.variants.reduce((max, variant) => 
    parseFloat(variant.metrics.avgEngagementRate) > parseFloat(max.metrics.avgEngagementRate) 
      ? variant 
      : max
  );

  // Calculate statistical significance (simplified)
  const significance = calculateStatisticalSignificance(test.variants, winner);

  test.winner = {
    variantId: winner.id,
    variantName: winner.name,
    engagementRate: winner.metrics.avgEngagementRate,
    improvement: calculateImprovement(test.variants, winner),
    confidence: significance.confidence,
    isSignificant: significance.isSignificant
  };

  test.status = 'completed';
  test.endDate = new Date().toISOString();

  await saveDb(db);

  console.log(`🏆 Test completed: ${test.name}`);
  console.log(`   Winner: ${winner.name} (${winner.metrics.avgEngagementRate}% engagement)`);
  console.log(`   Confidence: ${significance.confidence}%`);

  return test;
}

// Calculate statistical significance (simplified z-test)
function calculateStatisticalSignificance(variants, winner) {
  if (variants.length !== 2) {
    // Simplified for 2-variant tests
    return { confidence: 0, isSignificant: false };
  }

  const control = variants.find(v => v.id !== winner.id);
  
  const p1 = parseFloat(winner.metrics.avgEngagementRate) / 100;
  const p2 = parseFloat(control.metrics.avgEngagementRate) / 100;
  const n1 = winner.metrics.totalImpressions;
  const n2 = control.metrics.totalImpressions;

  if (n1 === 0 || n2 === 0) {
    return { confidence: 0, isSignificant: false };
  }

  // Pooled proportion
  const pPool = ((p1 * n1) + (p2 * n2)) / (n1 + n2);
  
  // Standard error
  const se = Math.sqrt(pPool * (1 - pPool) * ((1 / n1) + (1 / n2)));
  
  // Z-score
  const z = Math.abs((p1 - p2) / se);
  
  // Confidence level (simplified)
  let confidence = 0;
  if (z > 2.576) confidence = 99; // 99% confidence
  else if (z > 1.96) confidence = 95; // 95% confidence
  else if (z > 1.645) confidence = 90; // 90% confidence
  else confidence = Math.round((1 - (1 / (1 + z))) * 100);

  return {
    confidence,
    isSignificant: confidence >= 95,
    zScore: z.toFixed(2)
  };
}

// Calculate improvement percentage
function calculateImprovement(variants, winner) {
  if (variants.length !== 2) {
    return '0%';
  }

  const control = variants.find(v => v.id !== winner.id);
  const winnerRate = parseFloat(winner.metrics.avgEngagementRate);
  const controlRate = parseFloat(control.metrics.avgEngagementRate);

  if (controlRate === 0) return '0%';

  const improvement = ((winnerRate - controlRate) / controlRate) * 100;
  return `${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`;
}

// Get test results
export async function getTestResults(testId) {
  const test = await getABTestById(testId);
  if (!test) {
    throw new Error(`Test not found: ${testId}`);
  }

  await updateTestMetrics(testId);

  const results = {
    testId: test.id,
    testName: test.name,
    status: test.status,
    startDate: test.startDate,
    endDate: test.endDate,
    duration: test.endDate 
      ? Math.round((new Date(test.endDate) - new Date(test.startDate)) / (1000 * 60 * 60 * 24))
      : null,
    variants: test.variants.map(v => ({
      id: v.id,
      name: v.name,
      templateId: v.templateId,
      posts: v.postIds.length,
      metrics: v.metrics,
      isWinner: test.winner && test.winner.variantId === v.id
    })),
    winner: test.winner,
    recommendation: generateRecommendation(test)
  };

  return results;
}

// Generate recommendation based on test results
function generateRecommendation(test) {
  if (test.status !== 'completed' || !test.winner) {
    return 'Test is still running. Continue collecting data.';
  }

  if (!test.winner.isSignificant) {
    return `No statistically significant difference found (${test.winner.confidence}% confidence). Consider running a longer test or testing more distinct variants.`;
  }

  return `Use ${test.winner.variantName} template. It achieved ${test.winner.engagementRate}% engagement rate, a ${test.winner.improvement} improvement with ${test.winner.confidence}% confidence.`;
}

// Stop A/B test
export async function stopABTest(testId) {
  const db = await getDb();
  const test = db.abTests.find(t => t.id === testId);
  
  if (!test) {
    throw new Error(`Test not found: ${testId}`);
  }

  test.status = 'stopped';
  test.endDate = new Date().toISOString();

  await saveDb(db);
  console.log(`⏹️  Stopped A/B test: ${testId}`);
  return test;
}

// Delete A/B test
export async function deleteABTest(testId) {
  const db = await getDb();
  
  if (!db.abTests) {
    throw new Error('No A/B tests found');
  }

  db.abTests = db.abTests.filter(t => t.id !== testId);
  await saveDb(db);

  console.log(`🗑️  Deleted A/B test: ${testId}`);
}

// Get A/B test summary
export async function getABTestSummary() {
  const db = await getDb();
  if (!db.abTests || db.abTests.length === 0) {
    return {
      totalTests: 0,
      running: 0,
      completed: 0,
      stopped: 0
    };
  }

  return {
    totalTests: db.abTests.length,
    running: db.abTests.filter(t => t.status === 'running').length,
    completed: db.abTests.filter(t => t.status === 'completed').length,
    stopped: db.abTests.filter(t => t.status === 'stopped').length,
    recentTests: db.abTests
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        variants: t.variants.length,
        winner: t.winner ? t.winner.variantName : null
      }))
  };
}
