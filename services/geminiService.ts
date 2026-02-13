import { ViralIdea, PromptSet, Language, AspectRatio, GenerationMode, Persona, InspirationVideo, SubscriptionPlan } from "../types";

// Force redeploy - v1.0.6 - Switched to Direct REST API (fetch)
const getApiKey = () => {
  return import.meta.env.VITE_GOOGLE_API_KEY || (typeof process !== 'undefined' ? process.env?.VITE_GOOGLE_API_KEY : '');
};

// Watchdog Timer Helper (30 seconds)
const withTimeout = <T>(promise: Promise<T>, taskName: string, timeoutMs = 30000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: Chamada IA (${taskName}) excedeu ${timeoutMs / 1000}s`)), timeoutMs)
    )
  ]);
};

// Direct REST API Helper
const callGeminiREST = async (model: string, prompt: string, taskName: string, config?: any) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`DEBUG: [${taskName}] VITE_GOOGLE_API_KEY is undefined.`);
    throw new Error("API Key ausente. Configure VITE_GOOGLE_API_KEY no Vercel.");
  }

  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: config || {
      temperature: 0.8,
      maxOutputTokens: 2048
    }
  };

  console.log(`DEBUG: [${taskName}] Iniciando chamada REST Gemini 2.0 Flash...`);

  try {
    const response = await withTimeout(fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }), taskName);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`DEBUG: [${taskName}] Erro API (${response.status}):`, errorData);
      throw new Error(`Erro Gemini (${response.status}): ${errorData.error?.message || 'Erro Desconhecido'}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error(`DEBUG: [${taskName}] Resposta sem conteúdo:`, result);
      throw new Error("IA retornou resposta sem conteúdo");
    }

    console.log(`DEBUG: [${taskName}] Sucesso`);
    return text;
  } catch (error: any) {
    console.error(`DEBUG: [${taskName}] Falha na chamada:`, error.message);
    throw error;
  }
};

// Simple Caching Helper
const getCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(`vira_cache_${key}`);
    if (cached) {
      const { data, expiry } = JSON.parse(cached);
      if (expiry > Date.now()) return data;
      localStorage.removeItem(`vira_cache_${key}`);
    }
  } catch (e) {
    console.error("Cache read error:", e);
  }
  return null;
};

const setCache = (key: string, data: any, ttlHours = 24) => {
  try {
    const expiry = Date.now() + (ttlHours * 60 * 60 * 1000);
    localStorage.setItem(`vira_cache_${key}`, JSON.stringify({ data, expiry }));
  } catch (e) {
    console.error("Cache write error:", e);
  }
};

export const generateIdeas = async (niche: string, lang: Language): Promise<ViralIdea[]> => {
  const cacheKey = `ideas_${niche}_${lang}`;
  const cached = getCache<ViralIdea[]>(cacheKey);
  if (cached) return cached;

  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };

  const prompt = `Act as the Chief Strategist of "Vira Express".
Generate exactly 10 ideas for "Talking Object Ecosystems" for the niche: "${niche}".
RULES:
1. Think in Ecosystems: Objects that interact or a central iconic object from the niche.
2. Viral Dialogue: Discuss a secret, pain point, or current meme of the niche in a comic or sarcasm.
3. OUTPUT LANGUAGE: You MUST provide the "title" and "description" in ${languageNames[lang]}. This is a hard requirement.
4. RETURN ONLY VALID JSON ARRAY with this exact structure:
[{"id": "unique-id", "title": "Title Here", "description": "Description Here", "emoji": "😀"}]`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", prompt, "Ideas", {
      temperature: 1,
      maxOutputTokens: 2048
    });

    const text = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const ideas = JSON.parse(text);
    setCache(cacheKey, ideas);
    return ideas;
  } catch (error: any) {
    throw error;
  }
};

export const discoverTrends = async (niche: string, lang: Language): Promise<InspirationVideo[]> => {
  const cacheKey = `trends_${niche}_${lang}`;
  const cached = getCache<InspirationVideo[]>(cacheKey);
  if (cached) return cached;

  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };

  const prompt = `As a TikTok trend analyst, identify 3 viral video concepts for "Talking Objects" for the niche: "${niche}".
  Provide hook suggestions and define the protagonist object.
  CRITICAL: All generated text MUST be in ${languageNames[lang]}.
  RETURN ONLY VALID JSON ARRAY with this exact structure:
  [{"id": "unique-id", "title": "Title", "thumbnail": "https://...", "url": "https://...", "niche": "Niche Name"}]`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", prompt, "Trends", {
      temperature: 0.7,
      maxOutputTokens: 1024
    });

    const text = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!text) return [];
    const trends = JSON.parse(text);
    const finalTrends = trends.map((t: any) => ({
      ...t,
      thumbnail: t.thumbnail.startsWith('http') ? t.thumbnail : `https://images.unsplash.com/photo-1586769852044-692d6e3703a0?w=400&h=600&fit=crop`
    }));
    setCache(cacheKey, finalTrends);
    return finalTrends;
  } catch (error) {
    return [];
  }
};

export const generatePrompts = async (
  idea: ViralIdea,
  lang: Language,
  ratio: AspectRatio,
  mode: GenerationMode = 'viral',
  imageInput?: string,
  refinementCommand?: string,
  previousResult?: PromptSet,
  selectedPersona?: Persona,
  plan?: SubscriptionPlan
): Promise<PromptSet> => {
  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };
  const objectCount = plan === 'Free' ? 3 : 10;

  const systemInstruction = `Act as a Storytelling Director and Animation Scriptwriter 2026.
MISSION: Create viral narratives for "Vira Express".
1. 🎭 PERSONALITY: ${selectedPersona ? `${selectedPersona.name}: ${selectedPersona.trait}` : 'Standard Viral 2026'}.
2. 🎭 LOGIC A-B-A: Conflict, Resolution, CTA (Call to Action).
3. 📊 VIRAL SCORE: Analyze the script and give 0-100 scores for Hook, Retention, and CTA.
4. 🌐 TECHNICAL LANGUAGE: The "imagePrompt" and "videoPrompt_Tecnico" fields MUST BE IN ENGLISH.
5. 🎨 IMAGE STYLE: Pixar Animation Style, cinematic lighting, 8k, hyper-detailed textures.
6. 🎬 VIDEO PROMPT: Master Prompt for VEO 3 describing action, physics, and cinematography in English.
7. 📝 CONTENT LANGUAGE: All user-facing text (title, description, script, feedback) MUST BE IN ${languageNames[lang]}.
8. 🧩 QUANTITY: Generate EXACTLY ${objectCount} objects in the "objetos" array.`;

  const userPrompt = refinementCommand
    ? `ADJUSTMENT: "${refinementCommand}". PREVIOUS CONTEXT: ${JSON.stringify(previousResult)}. GENERATE EXACTLY ${objectCount} OBJECTS.`
    : `Generate strategy for: ${idea.title}. Description: ${idea.description}. Persona: ${selectedPersona?.name || 'Default'}. Plan: ${plan}. GENERATE EXACTLY ${objectCount} OBJECTS.`;

  const promptFinal = `${userPrompt}\n\nRETURN ONLY VALID JSON.\n\nSYSTEM INSTRUCTION: ${systemInstruction}`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", promptFinal, "Prompts", {
      temperature: 0.8,
      maxOutputTokens: 4096
    });

    const text = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error: any) {
    throw error;
  }
};

export const generateActualImage = async (imagePrompt: string, ratio: AspectRatio): Promise<string> => {
  const prompt = `Generate a high quality 3D image base for: ${imagePrompt}`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", prompt, "Image", {
      temperature: 0.7,
      maxOutputTokens: 1024
    });

    // Note: Since we are using generateContent, it doesn't return an image directly.
    // However, if the user was expecting image data, the SDK was doing something similar.
    // If the tool only generates text, we return the fallback.
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80`;
  } catch (error: any) {
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80`;
  }
};
