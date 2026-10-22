BEGIN;

DELETE FROM public.order_items;
DELETE FROM public.orders;

COMMIT;
