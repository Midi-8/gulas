import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Schema de validação para IDs de modificadores enviados pelo cliente.
 * O servidor valida existência, pertença ao produto e preço real (Zero-Trust).
 * O cliente envia APENAS os IDs — nunca preços, labels ou deltas.
 */
export const orderItemSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'O identificador do produto é obrigatório.')
    .regex(UUID_REGEX, 'Identificador de produto inválido (deve ser UUID).'),
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
  modifierIds: z
    .array(
      z.string().trim().regex(UUID_REGEX, 'UUID de modificador inválido.')
    )
    .optional()
    .default([])
    .refine(
      (ids) => new Set(ids).size === ids.length,
      { message: 'Não é permitido selecionar o mesmo modificador mais do que uma vez no mesmo artigo.' }
    ),
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
        // Dois itens com o mesmo productId mas modifierIds distintos = linhas separadas (permitido).
        // Dois itens com o mesmo productId e modifierIds exatamente iguais = linha duplicada (rejeitado).
        const signatures = items.map((item) => {
          const sortedModIds = [...(item.modifierIds || [])].sort().join(',');
          return `${item.productId}__mods:[${sortedModIds}]`;
        });
        const uniqueSignatures = new Set(signatures);
        return uniqueSignatures.size === signatures.length;
      },
      {
        message: 'Artigos idênticos com as mesmas opções devem ser agrupados numa só linha.',
      }
    ),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
