import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface Recommendation {
  productId: string;
  productName: string;
  price: number;
  reason: string;
  type: 'upsell' | 'cross-sell' | 'complement';
}

export interface ProductContext {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export async function generateRecommendations(
  cartProducts: ProductContext[],
  availableProducts: ProductContext[]
): Promise<Recommendation[]> {
  if (!process.env.GEMINI_API_KEY) {
    return generateFallbackRecommendations(cartProducts, availableProducts);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const cartSummary = cartProducts
    .map(p => `${p.name} ($${p.price}) ${p.category ? `- ${p.category}` : ''}`)
    .join(', ');

  const availableSummary = availableProducts
    .slice(0, 30)
    .map(p => `${p.name} ($${p.price}) ${p.category ? `- ${p.category}` : ''}`)
    .join(', ');

  const prompt = `Eres un asistente de ventas experto para un kiosco de auto-servicio. Analiza el carrito actual y recomienda productos para aumentar el ticket promedio.

Carrito actual: ${cartSummary}

Productos disponibles: ${availableSummary}

Basándote en los productos del carrito y el inventario disponible, genera hasta 5 recomendaciones en JSON array con esta estructura exacta:
[
  {
    "productId": "id-del-producto",
    "productName": "nombre del producto",
    "price": precio,
    "reason": "razón breve y persuasiva en español (máx 50 caracteres)",
    "type": "upsell" | "cross-sell" | "complement"
  }
]

Reglas:
- Solo incluye productos que NO estén ya en el carrito
- Los tipos significan: upsell (versiones superiores), cross-sell (relacionados), complement (complementos)
- reason debe ser persuasiva y corta
- Si no hay productos relevantes, devuelve array vacío []`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const recommendations = JSON.parse(jsonMatch[0]);
      return recommendations.map((r: any) => ({
        ...r,
        productId: r.productId || findProductIdByName(r.productName, availableProducts)
      }));
    }
    return generateFallbackRecommendations(cartProducts, availableProducts);
  } catch (error) {
    logger.geminiError('Error calling Gemini recommendations API', error, {
      endpoint: 'POST /recommendations',
      cartProductsCount: cartProducts.length,
      availableProductsCount: availableProducts.length,
    });
    return generateFallbackRecommendations(cartProducts, availableProducts);
  }
}

function findProductIdByName(name: string, products: ProductContext[]): string {
  const found = products.find(p => p.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
  return found?.id || '';
}

function generateFallbackRecommendations(
  cartProducts: ProductContext[],
  availableProducts: ProductContext[]
): Recommendation[] {
  const cartCategories = new Set(cartProducts.map(p => p.category).filter(Boolean));
  const cartIds = new Set(cartProducts.map(p => p.id));
  const cartMaxPrice = Math.max(...cartProducts.map(p => p.price), 0);

  const recommendations: Recommendation[] = [];

  const relatedProducts = availableProducts
    .filter(p => !cartIds.has(p.id))
    .filter(p => p.category && cartCategories.has(p.category))
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  relatedProducts.forEach(p => {
    recommendations.push({
      productId: p.id,
      productName: p.name,
      price: p.price,
      reason: `Perfecto para combinar con tu compra`,
      type: 'complement'
    });
  });

  const higherPriced = availableProducts
    .filter(p => !cartIds.has(p.id) && p.price > cartMaxPrice && p.price <= cartMaxPrice * 2)
    .sort((a, b) => a.price - b.price)
    .slice(0, 2);

  higherPriced.forEach(p => {
    recommendations.push({
      productId: p.id,
      productName: p.name,
      price: p.price,
      reason: `Mejora tu elección`,
      type: 'upsell'
    });
  });

  return recommendations.slice(0, 5);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StoreStats {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  topProducts: { name: string; quantity: number; sales: number }[];
}

export async function generateChatResponse(
  messages: ChatMessage[],
  storeStats: StoreStats | null,
  products: ProductContext[]
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return 'Configura GEMINI_API_KEY para habilitar el chat de IA.';
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const statsText = storeStats ? `
Estadísticas de la tienda:
- Ventas totales: $${storeStats.totalSales.toFixed(2)}
- Transacciones: ${storeStats.totalTransactions}
- Ticket promedio: $${storeStats.averageTicket.toFixed(2)}
- Productos más vendidos: ${storeStats.topProducts.map(p => `${p.name} (${p.quantity} unidades)`).join(', ')}
` : 'No hay estadísticas disponibles.';

  const productsText = products.length > 0 
    ? `Productos: ${products.slice(0, 20).map(p => p.name).join(', ')}`
    : 'No hay productos.';

  const conversation = messages.map(m => 
    `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`
  ).join('\n');

  const prompt = `Eres un asistente de análisis de ventas para AutoCobro. Responde preguntas sobre métricas, productos y tendencias de la tienda.

${statsText}
${productsText}

Conversación:
${conversation}

Responde en español de manera útil y concisa. Si no puedes responder, explica por qué.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    logger.geminiError('Error calling Gemini chat API', error, {
      endpoint: 'POST /chat',
      messagesCount: messages.length,
      hasStats: !!storeStats,
    });
    return 'Hubo un error al procesar tu mensaje. Por favor intenta de nuevo.';
  }
}