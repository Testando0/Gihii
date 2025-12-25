import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = { runtime: 'edge' };

export default async function handler(req) {
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

  try {
    const { prompt } = await req.json();
    const apiKey = process.env.NANO_BANANA_FLASH_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    // LISTA DE MODELOS 2025 (Do mais novo ao mais estável)
    const modelNames = [
      "gemini-2.5-flash",        // Atual 2025
      "gemini-2.0-flash-001",    // Estável anterior
      "gemini-1.5-flash-8b",     // Ultraleve (quase nunca falha)
      "gemini-1.5-flash"         // Legado
    ];

    let lastError = "";
    let svgCode = "";

    // Tenta cada modelo até um funcionar
    for (const name of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: name });
        const systemPrompt = `Gere apenas o código <svg> para: ${prompt}. 
        Use viewBox="0 0 512 512", cores vivas e estilos modernos. 
        NÃO use markdown, NÃO escreva texto, retorne APENAS o código começando com <svg.`;

        const result = await model.generateContent(systemPrompt);
        svgCode = result.response.text();
        
        // Se chegamos aqui, o modelo funcionou
        if (svgCode.includes('<svg')) break;
      } catch (e) {
        lastError = e.message;
        console.warn(`Modelo ${name} falhou, tentando próximo...`);
      }
    }

    if (!svgCode.includes('<svg')) {
      throw new Error(`Todos os modelos falharam. Erro recente: ${lastError}`);
    }

    // Limpeza Profissional do SVG
    svgCode = svgCode.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
    const start = svgCode.indexOf('<svg');
    const end = svgCode.lastIndexOf('</svg>') + 6;
    svgCode = svgCode.substring(start, end);

    return new Response(JSON.stringify({ image: svgCode }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
