import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Configuração CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { prompt } = await req.json();
    const apiKey = process.env.NANO_BANANA_FLASH_API_KEY;

    if (!apiKey) {
      throw new Error('Chave de API ausente nas variáveis de ambiente.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // TENTATIVA 1: Tenta usar a versão mais recente e estável do Flash
    // "gemini-1.5-flash-latest" costuma resolver o erro 404
    let model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",
      safetySettings: [
         { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
         { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
         { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
         { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ]
    });

    const systemInstruction = `
      ATUE COMO: Um gerador de SVG (Scalable Vector Graphics).
      OBJETIVO: Converter o prompt em código <svg> puro.
      REGRAS:
      1. NÃO use blocos de código markdown (\`\`\`xml). Retorne APENAS o código SVG começando com <svg.
      2. Defina viewBox="0 0 512 512".
      3. Seja criativo, use cores vibrantes.
      PROMPT DO USUÁRIO: "${prompt}"
    `;

    let result;
    try {
        result = await model.generateContent(systemInstruction);
    } catch (e) {
        // Se o Flash falhar (404), tenta o modelo "gemini-pro" clássico como backup
        console.warn("Flash falhou, tentando Gemini Pro...", e.message);
        model = genAI.getGenerativeModel({ model: "gemini-pro" });
        result = await model.generateContent(systemInstruction);
    }

    const response = await result.response;
    let svgCode = response.text();

    // Limpeza forçada (remove markdown se o modelo desobedecer)
    svgCode = svgCode
        .replace(/```xml/gi, '')
        .replace(/```svg/gi, '')
        .replace(/```/g, '')
        .trim();

    // Validação simples
    if (!svgCode.includes('<svg')) {
        throw new Error("O modelo gerou texto em vez de imagem. Tente novamente.");
    }

    return new Response(JSON.stringify({ image: svgCode }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error("Erro Final:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
