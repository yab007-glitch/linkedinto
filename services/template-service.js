import { getDb, saveDb } from './rss-service.js';

// Pre-defined post templates by category
export const TEMPLATES = {
  'breaking-news': {
    id: 'breaking-news',
    name: 'Breaking News',
    category: 'News',
    description: 'For urgent healthcare news and announcements',
    template: `🚨 Breaking: {{title}}

{{summary}}

This development could mean {{implication}}.

What's your take on this? 💭

#{{category}} #Healthcare #News`,
    variables: ['title', 'summary', 'implication', 'category'],
    example: {
      title: 'FDA Approves New Cancer Treatment',
      summary: 'The FDA has approved a groundbreaking immunotherapy for advanced melanoma, showing 60% response rates in clinical trials.',
      implication: 'a major shift in how we treat advanced cancers',
      category: 'Oncology'
    }
  },
  
  'insight': {
    id: 'insight',
    name: 'Industry Insight',
    category: 'Analysis',
    description: 'For sharing professional insights and analysis',
    template: `💡 Key Insight: {{title}}

Here's what caught my attention:

{{keyPoints}}

{{personalTakeaway}}

What do you think? Share your perspective below. 👇

#{{category}} #HealthcareLeadership`,
    variables: ['title', 'keyPoints', 'personalTakeaway', 'category'],
    example: {
      title: 'Healthcare IT spending to reach $200B by 2025',
      keyPoints: '• 40% increase from 2023\n• AI/ML driving adoption\n• Focus on interoperability',
      personalTakeaway: 'This signals a fundamental shift in how healthcare organizations view technology - from cost center to strategic asset.',
      category: 'HealthTech'
    }
  },
  
  'data-driven': {
    id: 'data-driven',
    name: 'Data & Statistics',
    category: 'Research',
    description: 'For sharing research findings and statistics',
    template: `📊 By the Numbers: {{title}}

{{statistic}}

Why this matters:
{{significance}}

{{callToAction}}

#{{category}} #HealthcareData #Research`,
    variables: ['title', 'statistic', 'significance', 'callToAction', 'category'],
    example: {
      title: 'Telehealth Adoption Rates',
      statistic: '76% of patients now prefer virtual visits for routine care, up from 11% pre-pandemic.',
      significance: 'This isn\'t a temporary shift - it\'s a permanent transformation in care delivery. Healthcare systems that haven\'t invested in telehealth infrastructure are falling behind.',
      callToAction: 'How is your organization adapting to this new reality?',
      category: 'Telehealth'
    }
  },
  
  'thought-leadership': {
    id: 'thought-leadership',
    name: 'Thought Leadership',
    category: 'Opinion',
    description: 'For sharing expert opinions and predictions',
    template: `🎯 {{title}}

{{opinion}}

Here's why this matters:
{{reasoning}}

{{prediction}}

Agree or disagree? Let's discuss. 💬

#{{category}} #HealthcareInnovation`,
    variables: ['title', 'opinion', 'reasoning', 'prediction', 'category'],
    example: {
      title: 'The Future of Value-Based Care',
      opinion: 'Value-based care isn\'t just the future - it\'s the present. Organizations still operating on fee-for-service models are playing a losing game.',
      reasoning: 'Payers are demanding outcomes, not volume. Technology now enables real-time quality tracking. Patients expect coordinated, holistic care.',
      prediction: 'By 2027, 75% of Medicare payments will be tied to value. The question isn\'t if you\'ll transition, but whether you\'ll lead or follow.',
      category: 'ValueBasedCare'
    }
  },
  
  'how-to': {
    id: 'how-to',
    name: 'How-To / Educational',
    category: 'Education',
    description: 'For educational content and guides',
    template: `📚 How to: {{title}}

{{introduction}}

Key steps:
{{steps}}

Pro tip: {{proTip}}

Found this helpful? Share with your network! 🔄

#{{category}} #HealthcareEducation`,
    variables: ['title', 'introduction', 'steps', 'proTip', 'category'],
    example: {
      title: 'Navigate Healthcare Compliance in 2026',
      introduction: 'Compliance doesn\'t have to be overwhelming. Here\'s a practical framework:',
      steps: '1. Audit current processes\n2. Identify gaps vs. requirements\n3. Implement automated monitoring\n4. Train staff quarterly\n5. Document everything',
      proTip: 'Use compliance management software to automate tracking and reporting - it pays for itself in avoided penalties.',
      category: 'Compliance'
    }
  },
  
  'case-study': {
    id: 'case-study',
    name: 'Case Study',
    category: 'Success Story',
    description: 'For sharing success stories and case studies',
    template: `✅ Success Story: {{title}}

The Challenge:
{{challenge}}

The Solution:
{{solution}}

The Results:
{{results}}

Key takeaway: {{takeaway}}

#{{category}} #HealthcareSuccess`,
    variables: ['title', 'challenge', 'solution', 'results', 'takeaway', 'category'],
    example: {
      title: 'How One Hospital Reduced Readmissions by 40%',
      challenge: 'High 30-day readmission rates costing $2M annually in penalties.',
      solution: 'Implemented AI-powered discharge planning + 48-hour follow-up calls + care coordination platform.',
      results: '• 40% reduction in readmissions\n• $1.8M penalty savings\n• 95% patient satisfaction\n• ROI in 8 months',
      takeaway: 'Technology alone isn\'t the answer - it\'s technology + process + people.',
      category: 'PatientCare'
    }
  },
  
  'question': {
    id: 'question',
    name: 'Discussion Question',
    category: 'Engagement',
    description: 'For sparking conversations and debates',
    template: `🤔 Question for healthcare leaders:

{{question}}

{{context}}

My take: {{yourPerspective}}

What's yours? Drop your thoughts below. 👇

#{{category}} #HealthcareDiscussion`,
    variables: ['question', 'context', 'yourPerspective', 'category'],
    example: {
      question: 'Should AI have the final say in clinical decisions?',
      context: 'With AI diagnostic accuracy now exceeding 95% in some specialties, we\'re approaching a crossroads. Do we trust the algorithm or the physician?',
      yourPerspective: 'AI should inform, not decide. The human element - empathy, context, patient preferences - can\'t be algorithmed. Best outcomes come from AI-augmented clinicians, not AI-replaced ones.',
      category: 'AIinHealthcare'
    }
  },
  
  'trend-alert': {
    id: 'trend-alert',
    name: 'Trend Alert',
    category: 'Trends',
    description: 'For highlighting emerging trends',
    template: `📈 Trend Alert: {{trendName}}

What's happening:
{{description}}

Why it matters:
{{impact}}

What to watch: {{nextSteps}}

Are you seeing this trend? 👀

#{{category}} #HealthcareTrends`,
    variables: ['trendName', 'description', 'impact', 'nextSteps', 'category'],
    example: {
      trendName: 'Hospital-at-Home Programs Exploding',
      description: 'Major health systems are launching acute care at home programs, treating conditions like pneumonia, heart failure, and cellulitis in patients\' homes.',
      impact: '30% cost reduction, higher patient satisfaction, better outcomes. This could reshape inpatient care delivery.',
      nextSteps: 'CMS reimbursement expansion, technology platform maturation, regulatory clarity.',
      category: 'HealthcareDelivery'
    }
  }
};

// Get all templates
export function getAllTemplates() {
  return Object.values(TEMPLATES);
}

// Get template by ID
export function getTemplateById(templateId) {
  return TEMPLATES[templateId] || null;
}

// Get templates by category
export function getTemplatesByCategory(category) {
  return Object.values(TEMPLATES).filter(t => t.category === category);
}

// Fill template with variables
export function fillTemplate(templateId, variables) {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  let content = template.template;

  // Replace all variables
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, variables[key] || '');
  });

  // Check for unfilled variables
  const unfilledVars = content.match(/{{(\w+)}}/g);
  if (unfilledVars) {
    console.warn(`⚠️  Unfilled variables in template: ${unfilledVars.join(', ')}`);
  }

  return content;
}

// Extract variables from article for template
export function extractVariablesFromArticle(article, templateId) {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Basic variable extraction (can be enhanced with AI)
  const variables = {
    title: article.title,
    category: article.category.replace(/\s+/g, ''),
    summary: article.description.substring(0, 200),
  };

  // Template-specific variable extraction
  switch (templateId) {
    case 'breaking-news':
      variables.implication = 'significant changes in the healthcare landscape';
      break;
    
    case 'insight':
      variables.keyPoints = `• ${article.title}\n• From ${article.feedName}`;
      variables.personalTakeaway = 'This highlights important developments in our industry.';
      break;
    
    case 'data-driven':
      variables.statistic = article.description.substring(0, 150);
      variables.significance = 'This data point reveals important trends.';
      variables.callToAction = 'What are you seeing in your organization?';
      break;
    
    case 'thought-leadership':
      variables.opinion = 'This development is worth paying attention to.';
      variables.reasoning = article.description.substring(0, 150);
      variables.prediction = 'We\'ll likely see more of this in the coming months.';
      break;
    
    case 'how-to':
      variables.introduction = article.description.substring(0, 100);
      variables.steps = '1. Review the details\n2. Assess impact\n3. Take action';
      variables.proTip = 'Stay informed and adapt quickly.';
      break;
    
    case 'case-study':
      variables.challenge = 'Industry challenges';
      variables.solution = article.title;
      variables.results = 'Positive outcomes';
      variables.takeaway = 'Innovation drives progress.';
      break;
    
    case 'question':
      variables.question = `What do you think about: ${article.title}?`;
      variables.context = article.description.substring(0, 150);
      variables.yourPerspective = 'This raises important questions for our industry.';
      break;
    
    case 'trend-alert':
      variables.trendName = article.title;
      variables.description = article.description.substring(0, 150);
      variables.impact = 'This could reshape the industry.';
      variables.nextSteps = 'Monitor developments closely.';
      break;
  }

  return variables;
}

// Select best template for article (can be enhanced with AI)
export function selectTemplateForArticle(article) {
  const title = article.title.toLowerCase();
  const description = article.description.toLowerCase();

  // Breaking news indicators
  if (title.includes('breaking') || title.includes('fda approves') || 
      title.includes('announces') || title.includes('launches')) {
    return 'breaking-news';
  }

  // Data/statistics indicators
  if (title.match(/\d+%/) || description.includes('study') || 
      description.includes('research') || description.includes('survey')) {
    return 'data-driven';
  }

  // Trend indicators
  if (title.includes('trend') || title.includes('rising') || 
      title.includes('growing') || description.includes('adoption')) {
    return 'trend-alert';
  }

  // Success story indicators
  if (title.includes('success') || title.includes('reduces') || 
      title.includes('improves') || description.includes('results')) {
    return 'case-study';
  }

  // Default to insight
  return 'insight';
}

// Save custom template
export async function saveCustomTemplate(template) {
  const db = await getDb();
  
  if (!db.customTemplates) {
    db.customTemplates = [];
  }

  const customTemplate = {
    id: `custom-${Date.now()}`,
    ...template,
    createdAt: new Date().toISOString(),
    custom: true
  };

  db.customTemplates.push(customTemplate);
  await saveDb(db);

  console.log(`✅ Saved custom template: ${customTemplate.name}`);
  return customTemplate;
}

// Get all templates (built-in + custom)
export async function getAllTemplatesWithCustom() {
  const db = await getDb();
  const builtIn = Object.values(TEMPLATES);
  const custom = db.customTemplates || [];
  
  return [...builtIn, ...custom];
}

// Delete custom template
export async function deleteCustomTemplate(templateId) {
  const db = await getDb();
  
  if (!db.customTemplates) {
    throw new Error('No custom templates found');
  }

  db.customTemplates = db.customTemplates.filter(t => t.id !== templateId);
  await saveDb(db);

  console.log(`🗑️  Deleted custom template: ${templateId}`);
}
