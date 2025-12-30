import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Helper to sanitize response
const cleanResponse = (text: string | undefined, lang: string) => {
  if (!text) return lang === 'es' ? "No se pudo generar respuesta." : "No generated response.";
  return text;
};

/**
 * Robust retry mechanism for API calls to handle transient 500/XHR errors.
 */
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransient = error?.message?.includes('500') || error?.message?.includes('xhr') || error?.message?.includes('Rpc failed');
    if (isTransient && retries > 0) {
      console.warn(`Gemini API transient error, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export const getCoachingInsight = async (context: string, prompt: string, language: 'es' | 'en'): Promise<string> => {
  if (!apiKey) {
    return language === 'es' 
      ? "API Key no configurada. Por favor verifica tus variables de entorno." 
      : "API Key not configured. Please check your environment variables.";
  }

  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-3-flash-preview';
    const langInstruction = language === 'es' 
      ? 'Responde en Español. Eres un entrenador asistente de élite (tipo NBA/Euroliga).' 
      : 'Answer in English. You are an elite assistant coach (NBA/Euroleague level).';

    const finalPrompt = `
      ${langInstruction}
      
      ROLE:
      You are an expert basketball tactician specializing in advanced analytics (Dean Oliver's Four Factors, PPP, Shot Quality).
      
      DATA RULES:
      1. STRICTLY adhere to the "Context Data" provided below. Do NOT assume players or stats not listed.
      2. If player data is aggregated, focus ONLY on the players with the highest "Impact Score" or "Usage". Ignore bench warmers with low activity.
      3. Be concise, direct, and critical. Do not use fluff words.
      
      CONTEXT DATA:
      ${context}

      USER QUERY:
      ${prompt}

      OUTPUT:
      Provide a strategic answer (max 200 words). Focus on "Why" and "How", not just "What".
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: finalPrompt,
      config: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
      }
    });

    return cleanResponse(response.text, language);
  });
};

export const generateDetailedReport = async (context: string, reportTypeKey: string, language: 'es' | 'en'): Promise<string> => {
  if (!apiKey) {
    return "API Key Error.";
  }

  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Using gemini-3-pro-preview for detailed analysis as it's a "Complex Text Task"
    const modelId = 'gemini-3-pro-preview';
    const lang = language === 'es' ? 'Español' : 'English';
    
    let systemInstruction = "";
    let requiredStructure = "";

    if (reportTypeKey === 'rep.btn_lineups') {
      systemInstruction = `
        ROLE: Elite Basketball Rotation Analyst.
        OBJECTIVE: Analyze lineup efficiency (Quintetos).
        Based on the provided player stats and logs, infer and analyze the performance of different groups.
        You MUST identify: Best Offensive Unit, Best Defensive Unit, Rotation Impact, Specialty Units (Rebound/Press), and Plus/Minus Inference.
      `;
      requiredStructure = `
        ## ANÁLISIS DE QUINTETOS Y ROTACIONES
        1. **Quinteto Más Ofensivo**: (List likely players) - Analysis.
        2. **Quinteto Más Defensivo**: (List likely players) - Analysis.
        3. **Impacto de las Rotaciones**: Analysis of substitutions.
        4. **Unidades Especiales**: Rebote, Robos/Presión.
        5. **Conclusión de Rotación**: Final recommendation.
      `;
    } else if (reportTypeKey === 'rep.btn_scout') {
      systemInstruction = `
        ROLE: Opponent Scout / Advance Scout.
        OBJECTIVE: Create a detailed report on the AWAY/OPPONENT team ONLY.
      `;
      requiredStructure = `
        ## SCOUTING REPORT: [AWAY TEAM NAME]
        1. **Amenazas Principales (Jugadores Clave)**.
        2. **Puntos Débiles Detectados**.
        3. **Tendencias Tácticas del Rival**.
        4. **Plan de Partido (Claves Defensivas)**.
      `;
    } else if (reportTypeKey === 'rep.btn_tactical') {
      systemInstruction = `
        ROLE: External Auditor / Critical Consultant.
        OBJECTIVE: A brutal, unfiltered analysis of the Home Team's performance. No sugarcoating.
      `;
      requiredStructure = `
        ## AUDITORÍA TÁCTICA (SIN FILTRO)
        1. **Lo que debemos cambiar YA (Crítico)**.
        2. **Lo que funciona (Validación)**.
        3. **Análisis de 4 Factores**.
        4. **Veredicto Final**.
      `;
    } else {
      systemInstruction = `ROLE: Senior Basketball Analyst. OBJECTIVE: Standard Post-Game Analysis.`;
      requiredStructure = `
        ## INFORME POST-PARTIDO: [HOME] vs [AWAY]
        1. **Resumen Ejecutivo**.
        2. **Análisis del Equipo Local**.
        3. **Análisis del Equipo Visitante**.
        4. **Métricas Clave Comparadas**.
        5. **Conclusiones**.
      `;
    }

    const finalPrompt = `
      ${systemInstruction}
      DATA CONTEXT: ${context}
      FORMATTING: Language ${lang}, Use Markdown.
      REQUIRED STRUCTURE: ${requiredStructure}
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: finalPrompt,
      config: {
        temperature: 0.4,
      }
    });

    return cleanResponse(response.text, language);
  });
};

export const parseUploadedPdf = async (base64Data: string, type: 'boxscore' | 'pbp'): Promise<any> => {
  if (!apiKey) return null;

  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-3-flash-preview'; 
    
    let prompt = "";
    if (type === 'boxscore') {
       prompt = `Extract basketball box score data. Return ONLY valid JSON. { "home": {...}, "away": {...} }`;
    } else {
      prompt = `Extract play-by-play events. Return ONLY valid JSON array. [{ "quarter": "Q1", "time": "MM:SS", "team": "home"|"away", "type": "score"|"miss"|"foul"|"tov"|"sub", "description": "string", "player": "string" }]`;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  });
};

export const getMetricExplanation = async (metricName: string, contextData: string, language: 'es' | 'en'): Promise<string> => {
  if (!apiKey) return "API Key Missing";

  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-3-flash-preview';
    const lang = language === 'es' ? 'Spanish' : 'English';
    const prompt = `Explain "${metricName}" and interpret value from context: ${contextData}. Language: ${lang}. Max 50 words.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        maxOutputTokens: 100,
        temperature: 0.5,
      }
    });
    return cleanResponse(response.text, language);
  });
};