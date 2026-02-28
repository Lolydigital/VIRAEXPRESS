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

// 2026 TRENDS DATA BANK
export const VIRAL_OBJECTS_BANK: Record<string, any[]> = {
  "Cozinha & Alimentos": [
    { name: "Batata frita", personality: "Furioso", example: "Se eu estiver mole em vez de crocante, me jogue fora." },
    { name: "Massa/Macarrão", personality: "Pedagógico", example: "Por favor, não coloque óleo na água." },
    { name: "Pão de forma", personality: "Triste", example: "Você me colocou na geladeira? Agora estou duro." },
    { name: "Mel", personality: "Autoritário", example: "Me tira da geladeira AGORA. Eu não preciso disso." },
    { name: "Tomate", personality: "Desesperado", example: "Não me guarda na geladeira! Me deixa amadurecer!" },
    { name: "Air Fryer", personality: "Frustrada", example: "Você colocou papel manteiga DE NOVO?" }
  ],
  "Pet Shop": [
    { name: "Cachorro no Banho e Tosa", personality: "Dramático", example: "Me prometeram que era só um passeio! Socorro!" },
    { name: "Gato no Hotelzinho", personality: "Vingativo", example: "Me deixaram aqui com esses estranhos... o sofá vai sofrer quando eu voltar." },
    { name: "Poodle Tosa de Cria", personality: "Sarcástico", example: "Olha pra mim! Agora virei um arbusto decorativo?" },
    { name: "Pote de água", personality: "Desesperado", example: "Tô vazio aqui, cadê meu refil?" },
    { name: "Coleira de Passeio", personality: "Ansiosa", example: "Vamo logo? Vamo? Vamo? O porteiro tá esperando!" }
  ],
  "Saúde & Higiene": [
    { name: "Espinha", personality: "Acusatória", example: "Dormiu com maquiagem DE NOVO? Olha pra mim." },
    { name: "Pasta de dente", personality: "Exausta", example: "Você aperta no meio, não no fim. EU TE ODEIO." },
    { name: "Sabonete", personality: "Seco", example: "3 dias sem me usar... você tá me deixando secar." },
    { name: "Protetor solar", personality: "Preocupado", example: "Vai sair sem mim? O sol vai te pegar." }
  ],
  "Finanças": [
    { name: "Boleto", personality: "Bravo", example: "Vou vencer amanhã e você nem viu!" },
    { name: "Fatura", personality: "Assustadora", example: "Você gastou QUANTO esse mês?" },
    { name: "Cofrinho", personality: "Decepcionado", example: "Mais um mês e eu continuo vazio..." },
    { name: "App de banco", personality: "Indiferente", example: "Seu saldo: R$ 35,00. Boa sorte." }
  ]
};

export const VIRAL_EXPRESSIONS = ["Dramático", "Sarcástico", "Motivacional", "Preocupado", "Bravo"];

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

export const generateIdeas = async (niche: string, lang: Language, skipCache = false): Promise<ViralIdea[]> => {
  const cacheKey = `ideas_${niche}_${lang}`;
  if (!skipCache) {
    const cached = getCache<ViralIdea[]>(cacheKey);
    if (cached) return cached;
  }

  const languageNames = { PT: 'Portuguese (Brazil)', EN: 'English', ES: 'Spanish' };

  // LÓGICA DE UNICIDADE E TENDÊNCIAS 2026
  let trendContext = "";
  const viralNiche = Object.keys(VIRAL_OBJECTS_BANK).find(k => k.toLowerCase().includes(niche.toLowerCase()));

  if (viralNiche) {
    const objects = [...(VIRAL_OBJECTS_BANK as any)[viralNiche]];
    // Embaralhar para evitar repetição (Pote de Água sempre primeiro)
    const shuffled = objects.sort(() => Math.random() - 0.5);
    trendContext = `TREND 2026: The niche is "${viralNiche}". Use objects like: ${shuffled.map((o: any) => o.name).join(", ")}. 
    Personalities to focus on: ${shuffled.map((o: any) => o.personality).join(", ")}. 
    Style: Objects talking, sarcastic, exaggerated Pixar-style emotions.`;
  }

  const prompt = `Express Idea Guru. 
  Target Niche: "${niche}".
  ${trendContext ? `Contextual Info: ${trendContext}` : ''}
  
  TASK: Generate 10 viral "Talking Object" video ideas for this niche.
  
  RULES:
  1. If the niche is custom or specific (e.g., "Criminal Lawyer" or "Fruit Stand"), first identify the most iconic and visual objects associated with it (e.g., gavel, handcuffs, scales for a lawyer).
  2. Use these objects as the "talking protagonists" in your ideas.
  3. Ideas must be interactive, sarcastic, viral/meme-oriented.
  4. Ensure a variety of scenarios (e.g., objects arguing, complaining, or being wise).
  5. Language: ${languageNames[lang]}.
  
  RETURN ONLY A VALID JSON ARRAY. NO MARKDOWN. NO CODE BLOCKS. NO COMMENTS. NO EXTRA TEXT.
  Structure: [{"id": "uid", "title": "Title (Meme/Viral Style)", "description": "Short scenario description", "emoji": "..."}]`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", prompt, "Ideas", {
      temperature: 1,
      maxOutputTokens: 8192
    }, 60000);

    // Enhanced JSON extraction
    let jsonDelta = rawText;
    const startIdx = jsonDelta.indexOf('[');
    const endIdx = jsonDelta.lastIndexOf(']');

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonDelta = jsonDelta.substring(startIdx, endIdx + 1);
    }

    const text = jsonDelta.trim();
    const ideas = JSON.parse(text);
    if (!Array.isArray(ideas)) throw new Error("Formato inválido");

    setCache(cacheKey, ideas);
    return ideas;
  } catch (error: any) {
    console.error(`DEBUG: [Ideas] Error:`, error.message);
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
  RETURN ONLY VALID JSON ARRAY. NO MARKDOWN. NO COMMENTS. NO EXTRA TEXT.
  Structure:
  [{"id": "unique-id", "title": "Title", "thumbnail": "https://...", "url": "https://...", "niche": "Niche Name"}]`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", prompt, "Trends", {
      temperature: 0.7,
      maxOutputTokens: 8192
    }, 60000);

    let jsonDelta = rawText;
    const startIdx = jsonDelta.indexOf('[');
    const endIdx = jsonDelta.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonDelta = jsonDelta.substring(startIdx, endIdx + 1);
    }
    const text = jsonDelta.trim();
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
  
  MANDATORY RULES:
  1. Generate exactly 2-3 distinct characters/objects that INTERACT with each other (e.g., a Scissors talking to a Razer).
  2. The script MUST be a dialogue or a confrontation between THESE objects based on the chosen PERSONA/TONE.
  3. Each object MUST have a unique "id", "title", "persona", and "imagePrompt".
  4. Each object MUST have a "scenes" array (integers) mapping to the script lines (e.g., [1, 2, 5]).
  7. The "videoPrompt_Tecnico" MUST be a master prompt for Grok Imagine Video. 
     Use EXTREME CONSTRAINTS to ensure cinematic interaction.
     Format EXACTLY like this:
     "Crie uma animação estilo Pixar 3D. 
     CENÁRIO: Único e compartilhado entre os personagens. 
     PROIBIDO: Não use tela dividida, não use split-screen, não use side-by-side. 
     PROIBIDO: Não use balões de texto, não use legendas, não escreva nada na tela. Zero texto.
     AÇÃO: [Personagens] estão no mesmo cenário interagindo um com o outro fisicamente.
     ÁUDIO: Diálogo sincronizado com movimento de boca (lip-sync).
     Câmera dinâmica (shot-reverse-shot) alternando entre quem fala. 
     
     DIÁLOGO EM [IDIOMA]:
     - [Personagem A]: '[fala 1]'
     - [Personagem B]: '[fala 2]'"

  JSON STRUCTURE:
  {
    "sequencia_storytelling": "Narrative arc overview.",
    "objetos": [
      {
        "id": "obj-1",
        "title": "Sad Banana",
        "persona": "Dramático",
        "imagePrompt": "A 3D animated banana with dramatic face...",
        "cena": "principal",
        "scenes": [1, 2, 4]
      }
    ],
    "roteiro_unificado": [
      { "time": "Cena 1", "text": "...", "emotion": "Dramático", "speaker": "obj-1" }
    ],
    "viral_score": { 
      "total": 95, 
      "hook": 98, 
      "retention": 92, 
      "cta": 95, 
      "feedback": "...",
      "reason": "Why it will go viral",
      "audience": "Target audience",
      "suggested_cta": "What the user should ask viewers to do",
      "hashtags": ["tag1", "tag2"]
    },
    "watermark_instruction": "BRAND NAME",
    "videoPrompt_Tecnico": "Full Grok Imagine Video prompt following rule #6."
  }
  
  Language: ${languageNames[lang]}.`;

  const userPromptText = refinementCommand
    ? `ADJUST: "${refinementCommand}". CONTEXT: ${JSON.stringify(previousResult)}. GEN OBJECTS(MAX: ${maxObjects}).`
    : `STRATEGY: ${idea.title}. DESC: ${idea.description}. PERSONA: ${selectedPersona?.name} (${selectedPersona?.trait}). PLAN: ${plan}. GEN OBJECTS(MAX: ${maxObjects}).`;

  const promptFinal = `${userPromptText} \n\nRETURN ONLY VALID JSON. NO MARKDOWN. NO COMMENTS. NO EXTRA TEXT.\n\nSYSTEM INSTRUCTION: ${systemInstruction}`;

  try {
    const rawText = await callGeminiREST("gemini-2.0-flash", promptFinal, "Prompts", {
      temperature: 0.8,
      maxOutputTokens: 8192
    }, 60000);

    let jsonDelta = rawText;
    const startIdx = jsonDelta.indexOf('{');
    const endIdx = jsonDelta.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonDelta = jsonDelta.substring(startIdx, endIdx + 1);
    }
    const text = jsonDelta.trim();
    const result = JSON.parse(text);

    // ORDENAR ROTEIRO SEQUENCIALMENTE (1→10) para melhor UX
    let sortedRoteiro = Array.isArray(result.roteiro_unificado) ? result.roteiro_unificado : [];
    if (sortedRoteiro.length > 0) {
      sortedRoteiro.sort((a: any, b: any) => {
        const numA = parseInt(a.time?.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.time?.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    }

    // EXTRAIR CENAS ONDE CADA PERSONAGEM APARECE (Lógica mais robusta para TDAH)
    const extractScenes = (personaName: string, script: any[]): number[] => {
      const scenes: number[] = [];
      const searchName = personaName.toLowerCase().trim();

      script.forEach((line: any, index: number) => {
        const speaker = line.speaker?.toLowerCase() || '';
        const text = line.text?.toLowerCase() || '';

        if (speaker.includes(searchName) ||
          text.includes(searchName) ||
          (searchName.length > 3 && (speaker.includes(searchName.substring(0, 4)) || text.includes(searchName.substring(0, 4))))) {
          scenes.push(index + 1);
        }
      });

      if (scenes.length === 0) {
        console.warn(`Aviso: Personagem "${personaName}" não foi mapeado automaticamente para nenhuma cena.`);
        return [1];
      }

      return [...new Set(scenes)].sort((a, b) => a - b);
    };

    // Processar objetos e adicionar informação de cenas
    const processedObjects = Array.isArray(result.objetos) ? result.objetos.map((obj: any) => ({
      ...obj,
      imagePrompt: obj.imagePrompt || obj.imagem_prompt,
      cena: obj.cena || 'principal', // Mudando default para principal para garantir que apareça
      scenes: extractScenes(obj.persona || obj.title || '', sortedRoteiro)
    })) : [];

    return {
      sequencia_storytelling: result.sequencia_storytelling || "",
      objetos: processedObjects,
      roteiro_unificado: sortedRoteiro,
      videoPrompt_Tecnico: result.videoPrompt_Tecnico || result.video_prompt || "",
      watermark_instruction: result.watermark_instruction || "",
      viral_score: result.viral_score || { total: 0, hook: 0, retention: 0, cta: 0, feedback: "" }
    };
  } catch (error: any) {
    console.error(`DEBUG: [Prompts] Error:`, error.message);
    throw error;
  }
};

export const generateActualImage = async (prompt: string, ratio: AspectRatio): Promise<string> => {
  // REFORÇO DE LIMPEZA DE MARCA E ESTILO 2026
  const cleanPrompt = `${prompt}. CRITICAL: NO TRADEMARKS, NO TEXT, NO LOGOS, NO WRITING, NO LABELS, NO BRAND NAMES. Pixar 3d style. Extremely high quality, cinematic lighting.`;

  try {
    const config = {
      image_config: {
        aspect_ratio: ratio
      }
    };

    const response = await callGeminiREST("gemini-3-pro-image-preview", cleanPrompt, "ImageGen", config, 90000, "v1beta");
    return response;
  } catch (error: any) {
    console.error(`DEBUG: [ImageGen] Error:`, error.message);
    throw error;
  }
};
