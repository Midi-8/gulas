import { z } from 'zod';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ISO_DATETIME_WITH_TIMEZONE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const isoDateTimeWithTimezoneSchema = z
  .string()
  .trim()
  .min(1, 'A versão temporal do pedido é obrigatória.')
  .refine(
    (value) =>
      ISO_DATETIME_WITH_TIMEZONE_REGEX.test(value) &&
      !Number.isNaN(new Date(value).getTime()),
    'Data de atualização inválida.'
  );

export const allowedNextStatuses = [
  'accepted',
  'preparing',
  'ready',
  'completed',
  'cancelled',
] as const;

export type ValidNextStatus = (typeof allowedNextStatuses)[number];

export const getOrderByIdSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1, 'O identificador do pedido é obrigatório.')
    .regex(UUID_REGEX, 'Identificador de pedido inválido (deve ser UUID).'),
});

export const updateOrderStatusSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1, 'O identificador do pedido é obrigatório.')
    .regex(UUID_REGEX, 'Identificador de pedido inválido (deve ser UUID).'),
  nextStatus: z.enum(allowedNextStatuses, {
    message: 'Estado de pedido inválido.',
  }),
  expectedUpdatedAt: isoDateTimeWithTimezoneSchema.optional(),
});

export const reopenOrderSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1, 'O identificador do pedido é obrigatório.')
    .regex(UUID_REGEX, 'Identificador de pedido inválido (deve ser UUID).'),
  expectedUpdatedAt: isoDateTimeWithTimezoneSchema.optional(),
});

export type GetOrderByIdInput = z.infer<typeof getOrderByIdSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ReopenOrderInput = z.infer<typeof reopenOrderSchema>;

export const ALLOWED_STATUS_TRANSITIONS: Record<
  string,
  readonly ValidNextStatus[]
> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
} as const;

export function isValidStatusTransition(
  currentStatus: string,
  nextStatus: string
): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];

  return Boolean(
    allowed && allowed.includes(nextStatus as ValidNextStatus)
  );
}