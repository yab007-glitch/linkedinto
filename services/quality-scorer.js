/**
 * Post Quality Scoring Service
 * Evaluates LinkedIn post quality based on multiple criteria
 */

export function scorePost(content) {
  const scores = {
    length: scoreLengthQuality(content),
    engagement: scoreEngagementElements(content),
    readability: scoreReadability(content),
    hashtags: scoreHashtags(content),
    hook: scoreHook(content),
    tone: scoreTone(content)
  };

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const suggestions = generateSuggestions(content, scores);

  return {
    totalScore: Math.round(totalScore),
    breakdown: scores,
    suggestions,
    passed: totalScore >= 70
  };
}

// Score length quality (20 points max)
function scoreLengthQuality(content) {
  const wordCount = content.split(/\s+/).length;
  const charCount = content.length;

  // Optimal: 150-300 words, 800-1500 characters
  if (wordCount >= 150 && wordCount <= 300 && charCount >= 800 && charCount <= 1500) {
    return 20;
  } else if (wordCount >= 100 && wordCount <= 400) {
    return 15;
  } else if (wordCount >= 50 && wordCount <= 500) {
    return 10;
  }
  return 5;
}

// Score engagement elements (20 points max)
function scoreEngagementElements(content) {
  let score = 0;

  // Check for questions
  const questions = (content.match(/\?/g) || []).length;
  score += Math.min(questions * 5, 10); // Up to 10 points for questions

  // Check for emojis (tasteful amount)
  const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount >= 2 && emojiCount <= 5) {
    score += 5;
  } else if (emojiCount === 1 || emojiCount === 6) {
    score += 3;
  }

  // Check for call-to-action phrases
  const ctaPhrases = [
    'what do you think', 'share your', 'let me know', 'comment below',
    'thoughts?', 'agree?', 'your take', 'discuss', 'join the conversation'
  ];
  const hasCTA = ctaPhrases.some(phrase => 
    content.toLowerCase().includes(phrase)
  );
  if (hasCTA) score += 5;

  return Math.min(score, 20);
}

// Score readability (20 points max)
function scoreReadability(content) {
  let score = 0;

  // Check for line breaks (good for LinkedIn)
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length >= 5 && lines.length <= 15) {
    score += 8;
  } else if (lines.length >= 3) {
    score += 5;
  }

  // Check average paragraph length
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  const avgParaLength = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length;
  if (avgParaLength >= 15 && avgParaLength <= 50) {
    score += 7;
  } else if (avgParaLength < 80) {
    score += 4;
  }

  // Check for bullet points or numbered lists
  const hasBullets = /[•\-\*]\s/.test(content) || /^\d+\.\s/m.test(content);
  if (hasBullets) score += 5;

  return Math.min(score, 20);
}

// Score hashtags (15 points max)
function scoreHashtags(content) {
  const hashtags = (content.match(/#\w+/g) || []).length;

  if (hashtags >= 3 && hashtags <= 5) {
    return 15; // Optimal
  } else if (hashtags >= 2 && hashtags <= 7) {
    return 10;
  } else if (hashtags === 1 || hashtags === 8) {
    return 5;
  }
  return 0;
}

// Score hook quality (15 points max)
function scoreHook(content) {
  let score = 0;

  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 0) return 0;

  const firstLine = lines[0];
  const firstTwoLines = lines.slice(0, 2).join(' ');

  // Check for attention-grabbing elements
  const hookPatterns = [
    /^[🚨💡🔥⚡✨🎯]/,  // Starts with emoji
    /^(Breaking|New|Alert|Insight|Key|Important|Urgent)/i,
    /\d+/,  // Contains numbers
    /\?$/,  // Ends with question
  ];

  hookPatterns.forEach(pattern => {
    if (pattern.test(firstLine)) score += 4;
  });

  // Check length of hook (not too long)
  if (firstTwoLines.length >= 40 && firstTwoLines.length <= 120) {
    score += 3;
  }

  return Math.min(score, 15);
}

// Score professional tone (10 points max)
function scoreTone(content) {
  let score = 10; // Start with full points, deduct for issues

  // Check for excessive caps
  const capsWords = (content.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (capsWords > 3) score -= 3;

  // Check for excessive exclamation marks
  const exclamations = (content.match(/!/g) || []).length;
  if (exclamations > 3) score -= 2;

  // Check for professional language (no slang)
  const slangWords = ['gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'lol', 'omg'];
  const hasSlang = slangWords.some(word => 
    content.toLowerCase().includes(word)
  );
  if (hasSlang) score -= 3;

  return Math.max(score, 0);
}

// Generate improvement suggestions
function generateSuggestions(content, scores) {
  const suggestions = [];

  if (scores.length < 15) {
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 150) {
      suggestions.push("Post is too short. Add more context or insights (aim for 150-300 words)");
    } else {
      suggestions.push("Post is too long. Consider condensing to 150-300 words for better engagement");
    }
  }

  if (scores.engagement < 15) {
    if (!(content.match(/\?/g) || []).length) {
      suggestions.push("Add a question to encourage engagement");
    }
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount < 2) {
      suggestions.push("Add 1-2 relevant emojis to make the post more visually appealing");
    }
    if (!/(what do you think|share your|let me know)/i.test(content)) {
      suggestions.push("Include a clear call-to-action (e.g., 'What do you think?')");
    }
  }

  if (scores.readability < 15) {
    suggestions.push("Break content into shorter paragraphs for better readability");
    if (!/[•\-\*]\s/.test(content)) {
      suggestions.push("Consider using bullet points to highlight key information");
    }
  }

  if (scores.hashtags < 10) {
    const hashtagCount = (content.match(/#\w+/g) || []).length;
    if (hashtagCount < 3) {
      suggestions.push(`Add ${3 - hashtagCount} more relevant hashtag(s) (aim for 3-5 total)`);
    } else if (hashtagCount > 5) {
      suggestions.push("Reduce hashtags to 3-5 for optimal performance");
    }
  }

  if (scores.hook < 10) {
    suggestions.push("Strengthen the opening line to grab attention (use numbers, questions, or emojis)");
  }

  if (scores.tone < 8) {
    suggestions.push("Maintain a professional tone - reduce caps, exclamation marks, or slang");
  }

  return suggestions;
}

// Get quality grade
export function getQualityGrade(score) {
  if (score >= 90) return { grade: 'A+', label: 'Excellent', color: 'green' };
  if (score >= 80) return { grade: 'A', label: 'Great', color: 'green' };
  if (score >= 70) return { grade: 'B', label: 'Good', color: 'blue' };
  if (score >= 60) return { grade: 'C', label: 'Fair', color: 'yellow' };
  if (score >= 50) return { grade: 'D', label: 'Poor', color: 'orange' };
  return { grade: 'F', label: 'Needs Work', color: 'red' };
}
