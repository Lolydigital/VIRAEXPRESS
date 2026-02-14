import { ViralIdea, PromptSet, Language, AspectRatio, GenerationMode, Persona, InspirationVideo, SubscriptionPlan } from "../types";

// Force redeploy - v1.0.6 - Switched to Direct REST API (fetch)
const getApiKey = () => {
  return import.meta.env.VITE_GOOGLE_API_KEY || (typeof process !== 'undefined' ? process.env?.VITE_GOOGLE_API_KEY : '');
};

// Watchdog Timer Helper (Default 30s, flexible)
const withTimeout = <T>(promise: Promise<T>, taskName: string, timeoutMs = 30000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: Chamada IA (${taskName}) excedeu ${timeoutMs / 1000}s`)), timeoutMs)
    )
  ]);
};

// Direct REST API Helper
const callGeminiREST = async (model: string, prompt: string, taskName: string, config?: any, timeoutMs?: number, apiVersion: 'v1' | 'v1beta' = 'v1') => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error(`DEBUG: [${taskName}] VITE_GOOGLE_API_KEY is undefined.`);
    throw new Error("API Key ausente. Configure VITE_GOOGLE_API_KEY no Vercel.");
  }

  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: config || {
      temperature: 0.8,
      maxOutputTokens: 2048
    }
  };

  console.log(`DEBUG: [${taskName}] Iniciando chamada REST Gemini (${model}) via ${apiVersion}...`);

  try {
    const response = await withTimeout(fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }), taskName, timeoutMs);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`DEBUG: [${taskName}] Erro API (${response.status}):`, errorData);
      throw new Error(`Erro Gemini (${response.status}): ${errorData.error?.message || 'Erro Desconhecido'}`);
    }

    const result = await response.json();
    console.log(`DEBUG: [${taskName}] Resposta JSON bruta:`, result);

    const parts = result.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      console.error(`DEBUG: [${taskName}] Resposta sem conteúdo:`, result);
      throw new Error("IA retornou resposta sem conteúdo");
    }

    // Procura por texto ou imagem (inlineData)
    for (const part of parts) {
      if (part.text) {
        console.log(`DEBUG: [${taskName}] Sucesso (Texto encontrado)`);
        return part.text;
      }
      if (part.inlineData) {
        console.log(`DEBUG: [${taskName}] Sucesso (Imagem encontrada)`);
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Nenhum conteúdo (texto ou imagem) encontrado na resposta");
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

  const prompt = `Express Idea Guru. Niche: "${niche}".
Generate 10 viral "Talking Object" ideas.
Rules: Interactive, sarcastic, viral/meme.
Lang: ${languageNames[lang]}. JSON ONLY.
Structure: [{"id": "uid", "title": "...", "description": "...", "emoji": "..."}]`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", prompt, "Ideas", {
      temperature: 1,
      maxOutputTokens: 1024
    });

    const text = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    console.log(`DEBUG: [Ideas] Texto limpo para parsing:`, text.substring(0, 100) + "...");
    const ideas = JSON.parse(text);
    if (!Array.isArray(ideas)) {
      console.error(`DEBUG: [Ideas] Resultado não é um array!`, ideas);
      throw new Error("IA não retornou um formato de lista válido");
    }
    setCache(cacheKey, ideas);
    console.log(`DEBUG: [Ideas] Array parsed com ${ideas.length} itens`);
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
  const maxObjects = plan === 'Free' ? 3 : 9;

  const systemInstruction = `Act as the Master Storytelling Director for "Vira Express". Your goal is to generate a COMPLETE viral video strategy for a "Talking Object" scenario.
  
  You MUST return a valid JSON object with the following structure:
  {
    "sequencia_storytelling": "A brief overview of the narrative arc.",
    "objetos": [
      {
        "id": "1",
        "title": "Object Name",
        "persona": "Description of its personality",
        "imagePrompt": "A hyper-detailed prompt in ENGLISH for generating a 3D Pixar-style image of this object. Include cinematic lighting, 8k resolution, and clear character features.",
        "imagem_prompt": "Alias for imagePrompt"
      }
    ],
    "roteiro_unificado": [
      {
        "time": "0:00",
        "text": "Dialogue line in ${languageNames[lang]}",
        "emotion": "Expression (e.g., Sarcastic, Happy)",
        "speaker": "Name of the object or 'Narrator'"
      }
    ],
    "roteiro": "Full script text in ${languageNames[lang]}",
    "videoPrompt_Tecnico": "A master prompt for VEO 3 (Video IA) in ENGLISH describing the entire scene action, camera movements, and lighting.",
    "video_prompt": "Alias for videoPrompt_Tecnico",
    "watermark_instruction": "Position for the watermark.",
    "viral_score": {
      "total": 95,
      "hook": 98,
      "retention": 92,
      "cta": 95,
      "feedback": "IA analysis of why this will go viral in ${languageNames[lang]}."
    }
  }

  RULES:
  1. 🎭 PERSONALITY: ${selectedPersona ? `${selectedPersona.name}: ${selectedPersona.trait}` : 'Viral & Sarcastic'}.
  2. 🎭 LOGIC: Conflict -> Resolution -> Sharp CTA.
  3. 🌐 LANGUAGE: All user-facing text (script, title, feedback) MUST be in ${languageNames[lang]}. Prompt fields MUST be in ENGLISH.
  4. 🎨 STYLE: Pixar 3D Cinematic Animation.
  5. 🧩 QUANTITY: Generate exactly ${maxObjects} objects in the "objetos" array to populate the scene.
  6. 🎬 SCRIPT: The "roteiro_unificado" should be a multi-line dialogue between the objects.`;

  const userPrompt = refinementCommand
    ? `ADJUST: "${refinementCommand}". CONTEXT: ${JSON.stringify(previousResult)}. GEN OBJECTS (MAX: ${maxObjects}).`
    : `STRATEGY: ${idea.title}. DESC: ${idea.description}. PERSONA: ${selectedPersona?.name}. PLAN: ${plan}. GEN OBJECTS (MAX: ${maxObjects}).`;

  const promptFinal = `${userPrompt}\n\nRETURN ONLY VALID JSON.\n\nSYSTEM INSTRUCTION: ${systemInstruction}`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", promptFinal, "Prompts", {
      temperature: 0.8,
      maxOutputTokens: 2048
    }, 60000); // 60s timeout for strategy

    const text = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(text);

    // Map new simplified fields if they exist in response
    const roteiro = result.roteiro || result.roteiro_unificado?.map((l: any) => l.text).join(' ') || "";

    return {
      sequencia_storytelling: result.sequencia_storytelling || "",
      objetos: Array.isArray(result.objetos) ? result.objetos.map((obj: any) => ({
        ...obj,
        imagePrompt: obj.imagem_prompt || obj.imagePrompt
      })) : [],
      roteiro_unificado: Array.isArray(result.roteiro_unificado) ? result.roteiro_unificado : [],
      videoPrompt_Tecnico: result.video_prompt || result.videoPrompt_Tecnico || "",
      watermark_instruction: result.watermark_instruction || "",
      viral_score: result.viral_score || { total: 0, hook: 0, retention: 0, cta: 0, feedback: "" }
    };
  } catch (error: any) {
    throw error;
  }
};

export const generateActualImage = async (imagePrompt: string, ratio: AspectRatio): Promise<string> => {
  const prompt = `Generate a high quality 3D image base for: ${imagePrompt}`;

  try {
    const rawText = await callGeminiREST("gemini-2.5-flash-image", prompt, "Image", {
      temperature: 0.7,
      maxOutputTokens: 1024
    }, 60000, "v1beta"); // 60s for images + v1beta

    // If it's a data URL (inlineData from gemini-2.5-flash-image), return it
    if (rawText.startsWith('data:')) {
      return rawText;
    }

    // Fallback if it didn't return an image directly
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80`;
  } catch (error: any) {
    return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80`;
  }
};
