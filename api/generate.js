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

    // Modelos ordenados por disponibilidade em v1beta (Dezembro 2025)
    const models = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b"
    ];

    let successData = null;
    let errorMsg = "";

    for (const modelName of models) {
      try {
        // Mudamos para v1beta que é onde os modelos flash residem com maior estabilidade
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate ONLY a high-quality SVG code for: ${prompt}. No text, no markdown. Use viewBox="0 0 512 512".` }] }]
          })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
          successData = data.candidates[0].content.parts[0].text;
          break;
        } else if (data.error) {
          errorMsg = data.error.message;
        }
      } catch (e) {
        errorMsg = e.message;
        continue;
      }
    }

    if (!successData) throw new Error(errorMsg || "Todos os modelos falharam.");

    // Limpeza de resposta
    let svg = successData.replace(/```svg|```xml|```/gi, '').trim();
    const startIdx = svg.indexOf('<svg');
    const endIdx = svg.lastIndexOf('</svg>');
    
    if (startIdx === -1) throw new Error("Resposta não contém SVG.");
    svg = svg.substring(startIdx, endIdx + 6);

    return new Response(JSON.stringify({ image: svg }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      image: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="#111"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="red">Erro: ${error.message}</text></svg>`
    }), { status: 200, headers });
  }
}
