import { z } from 'zod';

export const orderItemSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'O identificador do produto é obrigatório.')
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'Identificador de produto inválido (deve ser UUID).'
    ),
  quantity: z
    .number()
    .int('A quantidade deve ser um número inteiro.')
    .min(1, 'A quantidade mínima por produto é 1.')
    .max(50, 'A quantidade máxima por produto é 50.'),
  notes: z
    .string()
    .trim()
    .max(500, 'As observações do produto não podem exceder 500 caracteres.')
    .nullish()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export const createOrderSchema = z.object({
  restaurantSlug: z
    .string()
    .trim()
    .min(1, 'O slug do restaurante é obrigatório.')
    .max(100, 'O slug do restaurante é demasiado longo.'),
  tableNumber: z
    .number()
    .int('O número da mesa deve ser um número inteiro.')
    .min(0, 'O número da mesa deve ser maior ou igual a 0.')
    .max(999, 'Número da mesa inválido.'),
  customerNotes: z
    .string()
    .trim()
    .max(1000, 'As observações do pedido não podem exceder 1000 caracteres.')
    .nullish()
    .transform((val) => (val && val.length > 0 ? val : null)),
  items: z
    .array(orderItemSchema)
    .min(1, 'O carrinho deve conter pelo menos 1 artigo.')
    .max(50, 'O pedido não pode conter mais de 50 artigos distintos.')
    .refine(
      (items) => {
        const ids = items.map((item) => item.productId);
        const uniqueIds = new Set(ids);
        return uniqueIds.size === ids.length;
      },
      {
        message: 'Cada produto só pode aparecer uma vez no pedido.',
      }
    ),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
