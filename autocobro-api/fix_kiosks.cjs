const fs = require('fs');

const path = 'C:/Users/carlo/OneDrive/Escritorio/AsistenteInmediato/autocobro-api/src/routes/kiosks.ts';
let code = fs.readFileSync(path, 'utf8');

// Añadir el import si no está
if (!code.includes('generateRecommendations')) {
  code = code.replace(
    "import { requireStore } from '../middleware/auth.js';",
    "import { requireStore } from '../middleware/auth.js';\nimport { generateRecommendations } from '../services/geminiService.js';"
  );
}

// Asegurarse de que Plan y SubscriptionStatus se importan de PrismaClient
if (!code.includes('Plan') && !code.includes('SubscriptionStatus')) {
   code = code.replace(
    "import { PrismaClient, KioskStatus } from '@prisma/client';",
    "import { PrismaClient, KioskStatus, Plan, SubscriptionStatus } from '@prisma/client';"
  );
}

// Extraer el 'export default router;'
code = code.replace('export default router;', '');

// Insertar la nueva ruta y el export al final
const aiRoute = `
/**
 * Solicita a Gemini recomendaciones basadas en los productos actuales en el carrito
 * POST /api/kiosks/recommendations
 */
router.post('/recommendations', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { cartProducts } = req.body;
  const deviceKey = req.headers['x-device-key'] as string;

  if (!deviceKey) {
    throw new HttpError('X-Device-Key requerido', 401);
  }

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { deviceKey },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco inválido', 401);
  }

  if (!Array.isArray(cartProducts) || cartProducts.length === 0) {
    return res.json({ success: true, data: { recommendations: [], message: 'Carrito vacío' } });
  }

  const availableProducts = await prisma.product.findMany({
    where: { storeId: kiosk.storeId, active: true },
    select: { id: true, name: true, price: true, category: true }
  });

  if (availableProducts.length === 0) {
    return res.json({
      success: true,
      data: { recommendations: [], message: 'No hay productos disponibles' }
    });
  }

  try {
    const recommendations = await generateRecommendations(
      cartProducts.map((p: any) => ({
        id: p.productId,
        name: p.productName || p.name,
        price: Number(p.price),
        category: p.category
      })),
      availableProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category: p.category || undefined
      }))
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error generando recomendaciones de IA:', error);
    res.json({
      success: true,
      data: { recommendations: [], message: 'AI temporalmente no disponible' }
    });
  }
}));

export default router;
`;

code = code + aiRoute;
fs.writeFileSync(path, code);
console.log('Done!');
