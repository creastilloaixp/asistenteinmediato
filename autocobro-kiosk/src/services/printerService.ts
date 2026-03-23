const ESC = 0x1B
const GS = 0x1D
const commands = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x10],
  DOUBLE_HEIGHT_OFF: [GS, 0x21, 0x00],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x20],
  DOUBLE_WIDTH_OFF: [GS, 0x21, 0x00],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x30],
  DOUBLE_SIZE_OFF: [GS, 0x21, 0x00],
  TEXT_NORMAL: [ESC, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  LINE_FEED: [0x0A],
  CUT: [GS, 0x56, 0x00],
  PARTIAL_CUT: [GS, 0x56, 0x01],
  OPEN_CASH_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xFA],
}

function concat(...arrays: number[][]): number[] {
  return arrays.flat()
}

function textToBytes(text: string): number[] {
  const encoder = new TextEncoder()
  return Array.from(encoder.encode(text))
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(value)
}

function repeat(char: string, times: number): string {
  return char.repeat(times)
}

export interface ReceiptItem {
  name?: string
  productName?: string
  quantity: number
  unitPrice: number
}

export interface ReceiptData {
  storeName: string
  storeAddress?: string
  transactionId: string
  items: ReceiptItem[]
  subtotal: number
  tax?: number
  total: number
  paymentMethod: 'CASH' | 'CARD' | 'QR' | 'MERCADOPAGO' | 'STRIPE'
  cashReceived?: number
  change?: number
  date: string
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const lineWidth = 48
  const commandsList: number[][] = []
  
  commandsList.push(commands.INIT)
  
  commandsList.push(commands.ALIGN_CENTER)
  commandsList.push(commands.DOUBLE_SIZE_ON)
  commandsList.push(textToBytes(data.storeName))
  commandsList.push(commands.LINE_FEED)
  commandsList.push(commands.DOUBLE_SIZE_OFF)
  
  if (data.storeAddress) {
    commandsList.push(textToBytes(data.storeAddress))
    commandsList.push(commands.LINE_FEED)
  }
  
  commandsList.push(commands.LINE_FEED)
  
  commandsList.push(commands.ALIGN_LEFT)
  commandsList.push(textToBytes(`Ticket: ${data.transactionId.slice(0, 8).toUpperCase()}`))
  commandsList.push(commands.LINE_FEED)
  commandsList.push(textToBytes(`Fecha: ${data.date}`))
  commandsList.push(commands.LINE_FEED)
  commandsList.push(textToBytes(repeat('-', lineWidth)))
  commandsList.push(commands.LINE_FEED)
  
  commandsList.push(commands.BOLD_ON)
  commandsList.push(textToBytes('CANT  DESCRIPCIÓN           IMPORTE'))
  commandsList.push(commands.BOLD_OFF)
  commandsList.push(commands.LINE_FEED)
  commandsList.push(textToBytes(repeat('-', lineWidth)))
  commandsList.push(commands.LINE_FEED)
  
  for (const item of data.items) {
    const qty = item.quantity.toString().padEnd(4)
    const name = (item.name || item.productName || '').length > 20 
      ? (item.name || item.productName || '').slice(0, 18) + '..' 
      : (item.name || item.productName || '').padEnd(20)
    const price = formatCurrency(item.unitPrice * item.quantity).padStart(10)
    commandsList.push(textToBytes(`${qty} ${name} ${price}`))
    commandsList.push(commands.LINE_FEED)
  }
  
  commandsList.push(textToBytes(repeat('-', lineWidth)))
  commandsList.push(commands.LINE_FEED)
  
  commandsList.push(textToBytes(`Subtotal:${formatCurrency(data.subtotal).padStart(lineWidth - 10)}`))
  commandsList.push(commands.LINE_FEED)
  
  if (data.tax && data.tax > 0) {
    commandsList.push(textToBytes(`IVA:${formatCurrency(data.tax).padStart(lineWidth - 4)}`))
    commandsList.push(commands.LINE_FEED)
  }
  
  commandsList.push(commands.DOUBLE_SIZE_ON)
  commandsList.push(commands.BOLD_ON)
  commandsList.push(textToBytes(`TOTAL:${formatCurrency(data.total).padStart(lineWidth - 6)}`))
  commandsList.push(commands.BOLD_OFF)
  commandsList.push(commands.DOUBLE_SIZE_OFF)
  commandsList.push(commands.LINE_FEED)
  
  commandsList.push(textToBytes(repeat('-', lineWidth)))
  commandsList.push(commands.LINE_FEED)
  
  const paymentMethods: Record<string, string> = {
    CASH: 'EFECTIVO',
    CARD: 'TARJETA',
    QR: 'QR/PAGO MÓVIL'
  }
  
  commandsList.push(textToBytes(`Forma de pago: ${paymentMethods[data.paymentMethod] || data.paymentMethod}`))
  commandsList.push(commands.LINE_FEED)
  
  if (data.paymentMethod === 'CASH' && data.cashReceived && data.change) {
    commandsList.push(textToBytes(`Efectivo:${formatCurrency(data.cashReceived).padStart(lineWidth - 10)}`))
    commandsList.push(commands.LINE_FEED)
    commandsList.push(textToBytes(`Cambio:${formatCurrency(data.change).padStart(lineWidth - 7)}`))
    commandsList.push(commands.LINE_FEED)
  }
  
  commandsList.push(commands.LINE_FEED)
  commandsList.push(commands.ALIGN_CENTER)
  commandsList.push(textToBytes(repeat('-', lineWidth)))
  commandsList.push(commands.LINE_FEED)
  commandsList.push(commands.BOLD_ON)
  commandsList.push(textToBytes('¡GRACIAS POR SU COMPRA!'))
  commandsList.push(commands.BOLD_OFF)
  commandsList.push(commands.LINE_FEED)
  commandsList.push(textToBytes(repeat('-', lineWidth)))
  commandsList.push(commands.LINE_FEED)
  commandsList.push(commands.LINE_FEED)
  commandsList.push(commands.LINE_FEED)
  
  commandsList.push(commands.PARTIAL_CUT)
  
  return new Uint8Array(concat(...commandsList))
}

async function getUSBDevice(filters: { vendorId: number }[]) {
  if (typeof navigator === 'undefined' || !('usb' in (navigator as any))) return null;

  const usb = (navigator as any).usb;
  
  // Primero intentamos con dispositivos ya autorizados para evitar el error de "user gesture"
  const pairedDevices = await usb.getDevices() as any[];
  const alreadyPaired = pairedDevices.find((d: any) => 
    filters.some(f => f.vendorId === d.vendorId)
  );

  if (alreadyPaired) return alreadyPaired;

  // Si no hay ninguno emparejado, solicitamos permiso (ESTO REQUERIRÁ GESTO DE USUARIO)
  try {
    return await (navigator as any).usb.requestDevice({ filters });
  } catch (err) {
    console.warn('User did not select a device or browser blocked request:', err);
    return null;
  }
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  const receipt = buildReceipt(data)
  
  if (typeof navigator !== 'undefined' && 'usb' in navigator) {
    const filters = [
      { vendorId: 0x0416 },
      { vendorId: 0x04B8 },
      { vendorId: 0x0519 },
      { vendorId: 0x0483 },
    ];

    const device = await getUSBDevice(filters);
    
    if (device) {
      try {
        await device.open()
        await device.selectConfiguration(1)
        await device.claimInterface(0)
        
        const endpoint = device.configuration.interfaces[0].alternate.endpoints.find((e: any) => e.direction === 'out')
        
        if (endpoint) {
          await device.transferOut(endpoint.endpointNumber, receipt)
        }
        
        await device.close()
        return
      } catch (err) {
        console.warn('USB transfer failed:', err)
      }
    } else {
      console.warn('USB printer not found or access denied (gesture required?)');
    }
  }
  
  // Fallback a ventana de impresión si USB no está disponible
  const blob = new Blob([new Uint8Array(receipt)], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  
  const printWindow = window.open(url, '_blank', 'width=300,height=600')
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print()
    }
  }
  
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export async function openCashDrawer(): Promise<void> {
  const command = new Uint8Array(commands.OPEN_CASH_DRAWER)
  
  if (typeof navigator !== 'undefined' && 'usb' in navigator) {
    const device = await getUSBDevice([{ vendorId: 0x0416 }]);
    
    if (device) {
      try {
        await device.open()
        await device.selectConfiguration(1)
        await device.claimInterface(0)
        
        const endpoint = device.configuration.interfaces[0].alternate.endpoints.find((e: any) => e.direction === 'out')
        
        if (endpoint) {
          await device.transferOut(endpoint.endpointNumber, command)
        }
        
        await device.close()
      } catch (err) {
        console.warn('USB cash drawer transfer failed:', err)
      }
    }
  }
}
