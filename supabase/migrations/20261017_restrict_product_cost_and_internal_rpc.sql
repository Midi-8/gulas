-- ============================================================================
-- GULAS: restricao de custos e de RPC interna
-- Data: 2026-10-17
--
-- Pre-requisito:
-- A estrutura e as funcoes da migration de seguranca anterior devem existir.
--
-- Este ficheiro:
-- 1. Limita a leitura direta de products a colunas publicas.
-- 2. Retira aos clientes a execucao direta da numeracao de pedidos.
-- 3. Fixa o search_path de duas funcoes previamente revistas.
--
-- Nao elimina dados e nao altera o corpo de create_order_atomic.
-- ============================================================================

BEGIN;

-- 1. Retirar SELECT geral e repor apenas colunas publicas.
REVOKE SELECT ON TABLE public.products
FROM PUBLIC, anon, authenticated;

GRANT SELECT (
    id,
    restaurant_id,
    category_id,
    name,
    slug,
    description,
    price,
    image_url,
    is_available,
    display_order,
    badges,
    unit_quantity,
    includes_notes,
    customization_note,
    allergens,
    prep_time_minutes,
    created_at,
    updated_at
)
ON TABLE public.products
TO anon, authenticated;

-- 2. A numeracao deve ser chamada internamente pela criacao do pedido.
REVOKE EXECUTE
ON FUNCTION public.get_next_order_number(UUID)
FROM PUBLIC, anon, authenticated;

-- 3. Ajustar apenas funcoes cujo corpo ja foi inspecionado.
ALTER FUNCTION public.get_public_order_status(UUID, TEXT)
SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.protect_profile_privileges()
SET search_path = pg_catalog, public, pg_temp;

-- 4. Validar as restricoes antes de concluir a transacao.
DO $$
BEGIN
    IF pg_catalog.has_column_privilege(
        'anon',
        'public.products',
        'cost',
        'SELECT'
    ) OR pg_catalog.has_column_privilege(
        'authenticated',
        'public.products',
        'cost',
        'SELECT'
    ) THEN
        RAISE EXCEPTION
            'Validacao falhou: cost continua acessivel aos clientes.';
    END IF;

    IF pg_catalog.has_function_privilege(
        'anon',
        'public.get_next_order_number(uuid)',
        'EXECUTE'
    ) OR pg_catalog.has_function_privilege(
        'authenticated',
        'public.get_next_order_number(uuid)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION
            'Validacao falhou: numeracao continua acessivel aos clientes.';
    END IF;
END;
$$;

COMMIT;