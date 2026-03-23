import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export interface AISuggestion {
  productId: string;
  reason: string;
}

/**
 * Servicio de IA para el Kiosco
 * Utiliza Gemini para analizar el carrito y sugerir productos complementarios
 */
export const aiService = {
  /**
   * Obtiene sugerencias basadas en el contenido actual del carrito
   * @param cartItems Nombres de los productos en el carrito
   * @param allProducts Lista de todos los productos disponibles en la tienda (IDs y Nombres)
   */
  async getSuggestions(cartItems: string[], allProducts: { id: string, name: string }[]): Promise<AISuggestion[]> {
    if (!API_KEY || cartItems.length === 0) return [];

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Limpiador de JSON más robusto para Gemini
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error al obtener sugerencias de la IA:', error);
      return [];
    }
  },

  /**
   * Procesa un comando de voz para entender la intención del cliente
   */
  async parseVoiceCommand(text: string, products: { id: string, name: string }[]): Promise<{ action: 'add' | 'remove' | 'question' | 'none', productId?: string, response: string }> {
    if (!API_KEY || !text) return { action: 'none', response: 'No te escuché bien, ¿puedes repetir?' };

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().trim();
      
      // Limpiador de JSON robusto para objetos
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error al procesar comando de voz:', error);
      return { action: 'none', response: 'Lo siento, tuve un problema técnico.' };
    }
  }
};
