import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating seed data...');

  // Create store
  const store = await prisma.store.create({
    data: {
      name: 'Mi Tienda Demo',
      address: 'Av. Principal #123, Ciudad de México',
      phone: '55-1234-5678',
    },
  });
  console.log(`✅ Store created: ${store.name}`);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const user = await prisma.user.create({
    data: {
      email: 'admin@autocobro.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
      storeId: store.id,
    },
  });
  console.log(`✅ Admin user: ${user.email} (password: admin123)`);

  // Create kiosk device
  const kiosk = await prisma.kioskDevice.create({
    data: {
      storeId: store.id,
      deviceName: 'Kiosco Principal',
      deviceKey: 'demo-kiosk-key-12345',
      status: 'ONLINE',
    },
  });
  console.log(`✅ Kiosk device key: ${kiosk.deviceKey}`);
  console.log(`   (Usa esta key en el frontend con VITE_KIOSK_KEY)`);

  // Create sample products
  const products = [
    { barcode: '7501234567890', name: 'Coca-Cola 600ml', price: 18.50, category: 'Bebidas', stock: 50 },
    { barcode: '7501234567891', name: 'Pepsi 600ml', price: 17.00, category: 'Bebidas', stock: 45 },
    { barcode: '7501234567892', name: 'Agua Bonafont 1L', price: 12.00, category: 'Bebidas', stock: 60 },
    { barcode: '7501234567893', name: 'Cerveza Corona 355ml', price: 25.00, category: 'Bebidas', stock: 40 },
    { barcode: '7501234567894', name: 'Cerveza Modelo 355ml', price: 26.00, category: 'Bebidas', stock: 35 },
    { barcode: '7501234567895', name: 'Sabriton', price: 15.00, category: 'Botanas', stock: 30 },
    { barcode: '7501234567896', name: 'Cheetos', price: 16.00, category: 'Botanas', stock: 25 },
    { barcode: '7501234567897', name: 'Doritos', price: 17.00, category: 'Botanas', stock: 20 },
    { barcode: '7501234567898', name: 'Galletas Oreo', price: 22.00, category: 'Dulces', stock: 40 },
    { barcode: '7501234567899', name: 'Chocolate Hershey', price: 18.00, category: 'Dulces', stock: 35 },
    { barcode: '7501234567900', name: 'Chicles Trident', price: 14.00, category: 'Dulces', stock: 50 },
    { barcode: '7501234567901', name: 'Pan Bimbo Blanco', price: 28.00, category: 'Panadería', stock: 15 },
    { barcode: '7501234567902', name: 'Pan Bimbo Integral', price: 32.00, category: 'Panadería', stock: 12 },
    { barcode: '7501234567903', name: 'Café Nescafé', price: 45.00, category: 'Despensa', stock: 20 },
    { barcode: '7501234567904', name: 'Atún Tuny', price: 38.00, category: 'Despensa', stock: 25 },
    { barcode: '7501234567905', name: 'Papel Higiénico Favorita', price: 52.00, category: 'Higiene', stock: 30 },
    { barcode: '7501234567906', name: 'Shampoo Head & Shoulders', price: 65.00, category: 'Higiene', stock: 15 },
    { barcode: '7501234567907', name: 'Pasta Dental Colgate', price: 35.00, category: 'Higiene', stock: 20 },
    { barcode: '7501234567908', name: 'Jabón Zote', price: 18.00, category: 'Higiene', stock: 40 },
    { barcode: '7501234567909', name: 'Cigarrillos Marlboro 10', price: 85.00, category: 'Tabaco', stock: 10 },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        storeId: store.id,
        ...product,
      },
    });
  }
  console.log(`✅ ${products.length} products created`);

  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Summary:');
  console.log(`   Store ID: ${store.id}`);
  console.log(`   Kiosk Key: ${kiosk.deviceKey}`);
  console.log(`   Login: admin@autocobro.com / admin123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
