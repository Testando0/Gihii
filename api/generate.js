import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // 1. Headers de CORS para evitar erros de domínio
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });

  try {
    const { prompt } = await req.json();
    const apiKey = process.env.NANO_BANANA_FLASH_API_KEY;

    if (!apiKey) throw new Error("Chave API não configurada no Vercel");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Lista de modelos ordenada pela maior taxa de sucesso atual
    const modelsToTry = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
    let svgCode = "";
    let errorLog = "";

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`Gere apenas um código <svg> artístico para: ${prompt}. viewBox="0 0 512 512". Sem markdown.`);
        svgCode = result.response.text();
        if (svgCode.includes('<svg')) break;
      } catch (e) {
        errorLog = e.message;
        continue;
      }
    }

    if (!svgCode.includes('<svg')) {
      throw new Error("Erro nos modelos: " + errorLog);
    }

    // Limpeza rigorosa para garantir que o SVG seja renderizável
    const cleanSvg = svgCode.substring(svgCode.indexOf('<svg'), svgCode.lastIndexOf('</svg>') + 6)
                            .replace(/\\n/g, '')
                            .replace(/```xml|```svg|```/gi, '');

    return new Response(JSON.stringify({ image: cleanSvg }), { status: 200, headers });

  } catch (error) {
    // SEMPRE retorna JSON, mesmo no erro, para não dar "Unexpected token A"
    return new Response(JSON.stringify({ 
      error: error.message, 
      image: '<svg viewBox="0 0 512 512" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"><rect width="512" height="512" fill="#ffeeee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" fill="#cc0000">Erro na API do Google</text></svg>' 
    }), { status: 200, headers });
  }
}
