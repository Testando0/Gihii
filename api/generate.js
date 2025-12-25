import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuração para Vercel Serverless
export const config = {
  runtime: 'edge', // Usa Edge Functions para ser MUITO rápido (Flash)
};

export default async function handler(req) {
  // Configuração de CORS para permitir que seu HTML converse com a API
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
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('Prompt é obrigatório');
    }

    const apiKey = process.env.NANO_BANANA_FLASH_API_KEY;
    if (!apiKey) {
      throw new Error('Chave de API não configurada no Vercel');
    }

    // Inicializa o Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Usa o modelo FLASH para velocidade máxima ("Nano Banana")
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // O "Truque" Nano Banana:
    // O Flash é um modelo de texto, então pedimos para ele "alucinar" um SVG perfeito.
    // Isso é mais rápido e barato que gerar PNGs e funciona com chaves gratuitas.
    const systemInstruction = `
      Você é um gerador de imagens 'Nano Banana'. 
      Sua tarefa é converter o pedido do usuário em um código SVG (Scalable Vector Graphics) completo, detalhado e artístico.
      NÃO explique nada. NÃO use blocos de código markdown (como \`\`\`xml).
      Apenas retorne o código cru do <svg>...</svg>.
      Use cores vivas, gradientes e formas interessantes.
    `;

    const result = await model.generateContent(`${systemInstruction}\n\nPedido do usuário: "${prompt}"`);
    const response = await result.response;
    let svgCode = response.text();

    // Limpeza básica caso o modelo insira markdown
    svgCode = svgCode.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '');

    return new Response(JSON.stringify({ image: svgCode }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
