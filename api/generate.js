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

    // Lista de nomes técnicos exatos aceitos pela API v1 em 2025
    const models = [
      "gemini-1.5-flash-002",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash",
      "gemini-1.5-pro"
    ];

    let successData = null;
    let lastErrorMessage = "";

    // Loop de sobrevivência: tenta cada variação de nome do modelo
    for (const modelName of models) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate ONLY the raw SVG code for: ${prompt}. No markdown, no talk. <svg viewBox="0 0 512 512">...` }] }]
          })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
          successData = data.candidates[0].content.parts[0].text;
          break; // Sucesso! Sai do loop.
        } else if (data.error) {
          lastErrorMessage = data.error.message;
        }
      } catch (e) {
        lastErrorMessage = e.message;
        continue;
      }
    }

    if (!successData) {
      throw new Error(lastErrorMessage || "Nenhum modelo respondeu.");
    }

    // Limpeza absoluta do SVG
    let svg = successData.replace(/```svg|```xml|```/gi, '').trim();
    const startIdx = svg.indexOf('<svg');
    const endIdx = svg.lastIndexOf('</svg>');
    
    if (startIdx === -1) throw new Error("O modelo não retornou um SVG válido.");
    svg = svg.substring(startIdx, endIdx + 6);

    return new Response(JSON.stringify({ image: svg }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      image: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#222"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="orange" font-size="20">Erro Crítico: ${error.message}</text></svg>`
    }), { status: 200, headers });
  }
}
