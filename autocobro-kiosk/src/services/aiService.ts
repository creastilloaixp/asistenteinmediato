export interface AISuggestion {
  productId: string;
  reason: string;
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Servicio de IA para el Kiosco
 * Utiliza OpenRouter (con modelo Gemini Flash) para analizar el carrito y sugerir productos complementarios
 */
export const aiService = {
  async getSuggestions(cartItems: string[], allProducts: { id: string, name: string }[]): Promise<AISuggestion[]> {
    if (!OPENROUTER_API_KEY || cartItems.length === 0) return [];

    try {
      const prompt = `
        Eres un experto en ventas de una tienda de conveniencia (AutoCobro). 
        Analiza estos productos en el carrito del cliente: [${cartItems.join(', ')}].
        
        Basado en estos productos, selecciona los 3 productos más complementarios de la siguiente lista de la tienda:
        ${JSON.stringify(allProducts.map(p => ({ id: p.id, name: p.name })))}
        
        Responde ÚNICAMENTE con un JSON estrictamente válido en este formato:
        [
          {"productId": "id_del_producto", "reason": "Breve frase de venta de 5 palabras máximo"}
        ]
        
        Si no hay productos complementarios lógicos, devuelve un array vacío [].
      `;

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Autocobro App"
        },
        body: JSON.stringify({
          model: "google/gemini-flash-1.5",
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error en IA");
      }

      const data = await response.json();
      const text = data.choices[0].message.content.trim();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error al obtener sugerencias de la IA:', error);
      return [];
    }
  },

  async parseVoiceCommand(text: string, products: { id: string, name: string }[]): Promise<{ action: 'add' | 'remove' | 'question' | 'none', productId?: string, response: string }> {
    if (!OPENROUTER_API_KEY || !text) return { action: 'none', response: 'No te escuché bien, ¿puedes repetir?' };

    try {
      const prompt = `
        Eres Elisa, la asistente inteligente del cajero AutoCobro. 
        El cliente dijo: "${text}".
        
        Lista de productos disponibles:
        ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name })))}
        
        Determina la acción que desea realizar:
        1. "add": Si quiere comprar o agregar algo al carrito.
        2. "remove": Si quiere quitar algo.
        3. "question": Si tiene una duda general.
        4. "none": Si no se entiende.

        Responde ÚNICAMENTE con un JSON estrictamente válido:
        {
          "action": "add|remove|question|none",
          "productId": "id_del_producto_si_aplica",
          "response": "Tu respuesta amable a decir al cliente (máximo 10 palabras)"
        }
      `;

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Autocobro App"
        },
        body: JSON.stringify({
          model: "google/gemini-flash-1.5",
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error en IA");
      }

      const data = await response.json();
      const responseText = data.choices[0].message.content.trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error al procesar comando de voz:', error);
      return { action: 'none', response: 'Lo siento, tuve un problema técnico.' };
    }
  }
};
