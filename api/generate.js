export const config = { runtime: 'edge' };

export default async function handler(req) {
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

    // Chamada Direta via Fetch para a API V1 (Estável)
    // Usamos o modelo gemini-1.5-flash que é o mais compatível globalmente
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Gere apenas o código SVG para: ${prompt}. 
            Regras: viewBox="0 0 512 512", sem textos explicativos, apenas a tag <svg> funcional.`
          }]
        }],
        generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 2048 }
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Erro na API do Google");
    }

    let svgCode = data.candidates[0].content.parts[0].text;

    // Limpeza de Markdown (Removendo ```svg e ```)
    svgCode = svgCode.replace(/```svg|```xml|```/gi, '').trim();
    
    // Extração precisa da tag SVG
    const start = svgCode.indexOf('<svg');
    const end = svgCode.lastIndexOf('</svg>') + 6;
    if (start === -1) throw new Error("O modelo não gerou um desenho válido.");
    
    const finalSvg = svgCode.substring(start, end);

    return new Response(JSON.stringify({ image: finalSvg }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      image: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#333"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif">Erro: ${error.message}</text></svg>`
    }), { status: 200, headers });
  }
}
