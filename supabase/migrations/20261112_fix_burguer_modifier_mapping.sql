-- Corrige a associação dos modificadores aos burgers reais
-- São Miguel Burger: 0084 -> 0019
UPDATE public.product_modifiers
SET
    product_id = 'b1111111-0019-4000-8000-000000000019'::uuid,
    id = (
        'd1111111-0019-4000-8000-0000000000'
        || lpad(sort_order::text, 2, '0')
    )::uuid
WHERE product_id = 'b1111111-0084-4000-8000-000000000084'::uuid;

-- Cheeseburger Bacon Edition: 0085 -> 0020
UPDATE public.product_modifiers
SET
    product_id = 'b1111111-0020-4000-8000-000000000020'::uuid,
    id = (
        'd1111111-0020-4000-8000-0000000000'
        || lpad(sort_order::text, 2, '0')
    )::uuid
WHERE product_id = 'b1111111-0085-4000-8000-000000000085'::uuid;

-- Gulas Burger: 0086 -> 0021
UPDATE public.product_modifiers
SET
    product_id = 'b1111111-0021-4000-8000-000000000021'::uuid,
    id = (
        'd1111111-0021-4000-8000-0000000000'
        || lpad(sort_order::text, 2, '0')
    )::uuid
WHERE product_id = 'b1111111-0086-4000-8000-000000000086'::uuid;