
export type Language = 'PT' | 'EN' | 'ES';
export type AspectRatio = '9:16' | '16:9';
export type GenerationMode = 'viral' | 'tiktok_shop' | 'realism' | 'tone';
export type UserRole = 'user' | 'admin';
export type SubscriptionPlan = 'Free' | 'Basic' | 'Professional';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  plan: SubscriptionPlan;
  credits_total: number;
  credits_used: number;
  image_credits_total: number;
  image_credits_used: number;
  status: 'active' | 'inactive' | 'refunded';
  last_login?: number;
}

export interface PlanConfig {
  id: string;
  plan_name: SubscriptionPlan;
  price: number;
  image_quota: number;
  checkout_url: string;
  active: boolean;
}

export interface AppConfig {
  support_link: string;
  api_cost_per_gen: number; // Em centavos de dólar
  pro_plan_price: number;
}

export interface ViralIdea {
  id: string;
  title: string;
  description: string;
  emoji: string;
  timestamp?: number;
  savedPrompts?: PromptSet;
  savedImages?: Record<string, string>; // Store generated image URLs
  aspectRatio?: AspectRatio;
  persona?: Persona;
  userHandle?: string;
  finalVideoUrl?: string;
}

export interface ScriptLine {
  time: string;
  text: string;
  emotion: string;
  speaker: string;
}

export interface StorytellingObject {
  id: string;
  title: string;
  persona: string;
  imagePrompt: string;
  cena?: 'principal' | 'secundario' | 'fundo';
}

export interface ViralScore {
  total: number;
  hook: number;
  retention: number;
  cta: number;
  feedback: string;
}

export interface PromptSet {
  sequencia_storytelling: string;
  objetos: StorytellingObject[];
  roteiro_unificado: ScriptLine[];
  videoPrompt_Tecnico: string;
  watermark_instruction: string;
  viral_score: ViralScore;
  contexto_original?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  emoji: string;
  trait: string;
}

export interface InspirationVideo {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  niche: string;
}

export interface Translation {
  // Common
  title: string;
  back: string;
  copy: string;
  copied: string;
  save: string;
  delete: string;
  loading: string;
  error: string;
  success: string;
  logout: string;

  // Login
  loginSubtitle: string;
  emailLabel: string;
  passwordLabel: string;
  loginButton: string;

  // Dashboard
  personaBank: string;
  generateIdeasTitle: string;
  chooseNiche: string;
  manualNiche: string;
  nicheLabel: string;
  formatLabel: string;
  generateButton: string;
  generateMore: string;
  generatePrompts: string;
  historyTitle: string;
  noHistory: string;
  muralTitle: string;
  muralSubtitle: string;
  searchMural: string;
  discover: string;
  viewTikTok: string;

  // Dynamic Content (Translated)
  niches: string[];
  personas: Persona[];

  // Prompt Detail
  strategyReady: string;
  readySubtitle: string;
  viralScoreTitle: string;
  hookLabel: string;
  retentionLabel: string;
  ctaLabel: string;
  feedbackLabel: string;
  watermarkTitle: string;
  watermarkPlaceholder: string;
  applyHandle: string;
  imagePromptTitle: string;
  scriptTitle: string;
  videoPromptTitle: string;
  copyVideoPrompt: string;
  refineTitle: string;
  refinePlaceholder: string;
  adjust: string;
  flowTitle: string;
  myVideoTitle: string;
  myVideoSubtitle: string;
  uploadVideo: string;
  noVideo: string;
  dashboardButton: string;
  saveToHistoryButton: string;
  step: string;
  stepImage: string;
  stepVideo: string;
  stepAudio: string;
  stepRemove: string;
  stepImageDesc: string;
  stepVideoDesc: string;
  stepAudioDesc: string;
  stepRemoveDesc: string;
}
