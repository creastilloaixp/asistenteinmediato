# AutoCobro MVP - Especificación Técnica

## 1. Overview

| Campo | Descripción |
|-------|-------------|
| **Nombre** | AutoCobro |
| **Tipo** | SaaS B2B - Kiosco de autoservicio |
| **Target** | Tiendas de conveniencia (500-2000 SKUs) |
| **MVP** | 3 meses |

## 2. Funcionalidades Core

### 2.1 Kiosco (Frontend)
- [ ] Pantalla inicio con logo
- [ ] Escaneo de productos por barcode
- [ ] Búsqueda manual por nombre/código
- [ ] Carrito de compras
- [ ] Modificación cantidad
- [ ] Eliminación de productos
- [ ] Pantalla de pago
- [ ] Métodos: Efectivo, Tarjeta, QR
- [ ] Dispensación de cambio (efectivo)
- [ ] Impresión de ticket
- [ ] Confirmación de transacción

### 2.2 Dashboard Admin (Backend)
- [ ] Login/Auth
- [ ] CRUD Productos
- [ ] CRUD Tiendas
- [ ] Reportes de ventas
- [ ] Configuración de precios
- [ ] Monitoreo de kioscos

### 2.3 API Backend
- [ ] Auth (JWT)
- [ ] Productos CRUD
- [ ] Transacciones
- [ ] Pagos (Mercado Pago, Stripe)
- [ ] Webhooks
- [ ] Sincronización kiosk↔cloud

## 3. Stack Tecnológico

### Backend
| Componente | Tecnología |
|------------|-------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| ORM | Prisma |
| DB | PostgreSQL |
| Auth | JWT |
| Payments | Mercado Pago SDK, Stripe |

### Frontend (Kiosco)
| Componente | Tecnología |
|------------|-------------|
| Framework | React 18+ |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Touch | React Touch |

### Admin Dashboard
| Componente | Tecnología |
|------------|-------------|
| Framework | Next.js 14+ |
| UI | shadcn/ui |
| Charts | Recharts |

## 4. Modelo de Datos

```
Store (Tienda)
├── id: string (UUID)
├── name: string
├── address: string
├── apiKey: string
├── createdAt: DateTime
└── products: Product[]

Product (Producto)
├── id: string (UUID)
├── storeId: string (FK)
├── barcode: string
├── name: string
├── price: Decimal
├── image: string?
├── stock: int
└── category: string

Transaction (Transacción)
├── id: string (UUID)
├── storeId: string (FK)
├── kioskId: string?
├── items: TransactionItem[]
├── total: Decimal
├── paymentMethod: enum (CASH, CARD, QR)
├── status: enum (PENDING, COMPLETED, FAILED)
├── paymentReference: string?
├── createdAt: DateTime
└── completedAt: DateTime?

TransactionItem
├── id: string
├── transactionId: string (FK)
├── productId: string (FK)
├── quantity: int
└── unitPrice: Decimal

KioskDevice (Dispositivo)
├── id: string (UUID)
├── storeId: string (FK)
├── deviceName: string
├── status: enum (ONLINE, OFFLINE)
├── lastSeen: DateTime
└── config: JSON
```

## 5. APIs REST

### Autenticación
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh
```

### Productos
```
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/products/barcode/:barcode
POST   /api/products/import (bulk)
```

### Transacciones
```
POST   /api/transactions
GET    /api/transactions
GET    /api/transactions/:id
POST   /api/transactions/:id/complete
POST   /api/transactions/:id/cancel
```

### Pagos
```
POST   /api/payments/mercadopago/create
POST   /api/payments/mercadopago/webhook
POST   /api/payments/stripe/create
POST   /api/payments/stripe/webhook
POST   /api/payments/cash/calculate-change
```

### Tiendas
```
GET    /api/stores
GET    /api/stores/:id
POST   /api/stores
PUT    /api/stores/:id
DELETE /api/stores/:id
POST   /api/stores/:id/sync (sync products to kiosk)
```

### Kioscos
```
GET    /api/kiosks
POST   /api/kiosks/register
PUT    /api/kiosks/:id/heartbeat
PUT    /api/kiosks/:id/status
```

## 6. Flujo de Pago

### Efectivo
```
1. Kiosco: Calcula total
2. Kiosco: Solicita monto recibido
3. Kiosco: Calcula cambio
4. Backend: Registra transaction (status=PENDING)
5. Kiosco: Dispensar cambio
6. Kiosco: Imprime ticket
7. Backend: Completa transaction (status=COMPLETED)
```

### Tarjeta (Stripe)
```
1. Kiosco: Calcula total
2. Backend: Crea PaymentIntent
3. Kiosco: Muestra QR/card terminal
4. Stripe: Procesa pago
5. Stripe Webhook: Notifica
6. Backend: Completa transaction
7. Kiosco: Imprime ticket
```

### QR (Mercado Pago)
```
1. Kiosco: Calcula total
2. Backend: Crea preference
3. Kiosco: Muestra QR
4. Mercado Pago: Procesa pago
5. Webhook: Notifica
6. Backend: Completa transaction
7. Kiosco: Imprime ticket
```

## 7. Screens del Kiosco

### S1: Pantalla Inicio
- Logo de la tienda
- "Escanea un producto o busca"
- Botón táctil para buscar

### S2: Búsqueda
- Campo de búsqueda (teclado en pantalla)
- Lista de resultados
- Click para agregar al carrito

### S3: Carrito
- Lista de productos
- +/- cantidad
- Eliminar producto
- Subtotal
- Botón "Pagar"

### S4: Pago
- Total a pagar
- Botones: Efectivo | Tarjeta | QR
- (Si efectivo) Calculadora de cambio
- Botón "Confirmar"

### S5: Ticket
- Lista de productos
- Total pagado
- Cambio (si efectivo)
- "Gracias por su compra"
- "Nueva venta" / "Ver ticket"

## 8. Costos MVP

| Recurso | Costo |
|---------|-------|
| Dominio | $10/año |
| Hosting (Vercel/Railway) | $20/mes |
| PostgreSQL (Supabase/Railway) | $15/mes |
| Mercado Pago | 3.5% + IVA |
| Stripe | 3.5% + 15¢ |
| **Total mensual** | **~$35/mes + pagos** |

## 9. roadmap

### Fase 1: Backend API (2 semanas)
- [x] Setup proyecto
- [ ] Auth
- [ ] CRUD Productos
- [ ] CRUD Transacciones
- [ ] Pagos (Mercado Pago)

### Fase 2: Kiosco Frontend (3 semanas)
- [ ] Pantallas S1-S5
- [ ] Integración API
- [ ] Carrito
- [ ] Flujo de pago

### Fase 3: Admin Dashboard (2 semanas)
- [ ] Login
- [ ] Gestión productos
- [ ] Reportes

### Fase 4: Hardware Integration (2 semanas)
- [ ] Printer driver
- [ ] Cash module (simulado)
- [ ] Scanner (USB HID)

### Fase 5: Deploy & Test (1 semana)
- [ ] Deploy production
- [ ] Test end-to-end
- [ ] Bug fixes

---

**Última actualización:** 2026-03-22
