export enum Tone {
  PROFESSIONAL = 'Professional',
  CASUAL = 'Casual',
  CONTROVERSIAL = 'Controversial',
  INSPIRATIONAL = 'Inspirational',
  EDUCATIONAL = 'Educational',
  HUMOROUS = 'Humorous',
}

export enum PostFormat {
  STORY = 'Story/Personal Experience',
  LISTICLE = 'Listicle/How-to',
  SHORT_PUNCHY = 'Short & Punchy',
  CONTRARIAN = 'Contrarian Take',
  CASE_STUDY = 'Case Study',
}

export interface PostConfig {
  topic: string;
  targetAudience: string;
  tone: Tone;
  format: PostFormat;
  keyPoints?: string;
  autoPost?: boolean;
}

export interface GeneratedPost {
  id: string;
  content: string;
  config: PostConfig;
  timestamp: number;
}

export interface LinkedInProfile {
  id: string; // The LinkedIn Member URN ID (sub)
  name: string;
  headline: string;
  avatarUrl: string;
}
