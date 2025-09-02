import { db } from '@repo/db';
import { PaymentService } from './payment.service';

const paymentService = new PaymentService();

type CheckoutItem = { productId: string; qty: number };

export class OrderService {
  private async calculateCreditsPerUnit(product: any, euroPerCredit: number): Promise<number> {
    const price = Number(product.priceEuro || 0);
    const multiplier = Number(product.creditMultiplier || 1);
    const credits = Math.ceil((price * (multiplier > 0 ? multiplier : 1)) / euroPerCredit);
    return Math.max(1, credits);
  }

  async checkout(params: {
    userId: string;
    items: CheckoutItem[];
    paymentMethod: 'credits' | 'card' | 'mixed';
    idempotencyKey?: string;
  }): Promise<any> {
    const { userId, items, paymentMethod, idempotencyKey } = params;
    if (!Array.isArray(items) || items.length === 0) throw new Error('Carrito vacío');

    // Para créditos: necesitamos euroPerCredit; tomamos del primer producto -> su centro
    const firstItem = items[0];
    if (!firstItem) throw new Error('Primer item del carrito no válido');
    const firstProduct = await (db as any).product.findUnique({ where: { id: firstItem.productId }, include: { center: true } });
    if (!firstProduct) throw new Error('Producto no encontrado');
    const settings: any = firstProduct?.center?.settings || {};
    const creditsCfg: any = settings.credits || {};
    const euroPerCredit: number | undefined = typeof creditsCfg.euroPerCredit === 'number' ? creditsCfg.euroPerCredit : 1;
    const ePerC = euroPerCredit && euroPerCredit > 0 ? euroPerCredit : 1;

    // Calcular totales
    const products: any[] = await (db as any).product.findMany({ where: { id: { in: items.map(i => i.productId) } } });
    const byId: Map<string, any> = new Map<string, any>(products.map((p: any) => [p.id, p]));
    let totalEuro = 0;
    let totalCredits = 0;

    for (const it of items) {
      const p = byId.get(it.productId);
      if (!p || !p.isActive || p.stockQty < it.qty) throw new Error('Stock insuficiente');
      const unit = Number(p.priceEuro || 0);
      totalEuro += unit * it.qty;
      const cpu = await this.calculateCreditsPerUnit(p, ePerC);
      totalCredits += cpu * it.qty;
    }

    // Transacción de creación de pedido
    const order = await (db as any).$transaction(async (tx: any) => {
      // Idempotencia
      if (idempotencyKey) {
        const existing = await tx.order.findUnique({ where: { idempotency_key: idempotencyKey } }).catch(() => null);
        if (existing) return existing;
      }

      // Crear pedido PENDING
      // Limitar columnas devueltas para evitar "RETURNING type" cuando la columna aún no existe en BBDD
      const created = await tx.order.create({
        data: {
          userId,
          status: 'PENDING',
          totalEuro,
          paymentMethod: paymentMethod.toUpperCase(),
          creditsUsed: paymentMethod === 'credits' ? totalCredits : paymentMethod === 'mixed' ? Math.min(totalCredits, Number.MAX_SAFE_INTEGER) : 0,
          idempotencyKey: idempotencyKey || null,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          totalEuro: true,
          paymentMethod: true,
          creditsUsed: true,
          idempotencyKey: true,
          createdAt: true,
        },
      });

      // Crear líneas y reservar stock (disminuir inmediatamente para evitar oversell)
      for (const it of items) {
        const p = byId.get(it.productId);
        if (!p || !p.isActive || p.stockQty < it.qty) throw new Error('Stock insuficiente');
        const cpu = await this.calculateCreditsPerUnit(p, ePerC);
        await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: p.id,
            qty: it.qty,
            unitPriceEuro: p.priceEuro,
            taxRate: Number(p.taxRate || 0),
            creditsPerUnit: cpu,
          },
        });
        await tx.product.update({ where: { id: p.id }, data: { stockQty: { decrement: it.qty } } });
        await tx.inventoryMovement.create({ data: { productId: p.id, type: 'OUT', qty: it.qty, reason: 'ORDER' } });
      }

      return created;
    });

    // Pagar
    if (paymentMethod === 'credits') {
      // Debitar créditos e idempotencia por Order.id
      await (db as any).$transaction(async (tx: any) => {
        if (idempotencyKey) {
          const existing = await tx.walletLedger.findUnique({ where: { idempotency_key: idempotencyKey } }).catch(() => null);
          if (existing) return;
        }
        const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsBalance: true } });
        if (!user || (user.creditsBalance || 0) < totalCredits) throw new Error('Saldo de créditos insuficiente');
        await tx.user.update({ where: { id: userId }, data: { creditsBalance: { decrement: totalCredits } } });
        await tx.walletLedger.create({
          data: {
            userId,
            type: 'DEBIT',
            reason: 'ORDER',
            credits: totalCredits,
            balanceAfter: (user.creditsBalance || 0) - totalCredits,
            metadata: { orderId: order.id },
            idempotencyKey: idempotencyKey || null,
          },
        });
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
        await tx.outboxEvent.create({ data: { eventType: 'ORDER_PAID', eventData: { orderId: order.id, method: 'CREDITS' } as any } });
      });
      return { order, clientSecret: null };
    }

    if (paymentMethod === 'card') {
      // 🔧 DEBUG: Verificar que el total no sea 0
      console.log('🔍 DEBUG CHECKOUT CARD:', {
        orderId: order.id,
        totalEuro: order.totalEuro,
        totalNumber: Number(order.totalEuro || 0),
        items: items.map(i => ({ productId: i.productId, qty: i.qty }))
      });
      
      // Validación adicional
      const orderTotal = Number(order.totalEuro || 0);
      if (orderTotal <= 0) {
        throw new Error(`Total de la orden inválido: €${orderTotal}. Verifique que los productos tengan precio válido.`);
      }
      
      // Integración Redsys: devolvemos URL de redirección a ruta que auto-postea el formulario a Redsys
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const redirectUrl = `${apiUrl}/api/payments/redsys/redirect?oid=${encodeURIComponent(order.id)}`;
      return { order, clientSecret: null, redirectUrl };
    }

    // mixed: podría implementarse en fase posterior
    throw new Error('Método de pago no soportado');
  }
}

export const orderService = new OrderService();



