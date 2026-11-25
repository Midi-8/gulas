-- ============================================================================
-- GULAS – RPC para leitura completa de pedidos por owners
-- Migration: 20261130_owner_read_orders_rpc.sql
-- Cria função SECURITY DEFINER que devolve todos os campos de orders e order_items
-- Apenas perfis com role = 'owner' podem executar.
-- ============================================================================

BEGIN;

-- Remove se já existir (idempotente)
DROP FUNCTION IF EXISTS public.gulas_owner_read_orders_v1(p_restaurant_id UUID);

CREATE OR REPLACE FUNCTION public.gulas_owner_read_orders_v1(p_restaurant_id UUID)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = auth.uid();
    IF v_role <> 'owner' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: apenas owners podem ler pedidos completos.' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
    SELECT o.* FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id;
END;
$$;

-- Grant execute to authenticated (the function itself checks role)
GRANT EXECUTE ON FUNCTION public.gulas_owner_read_orders_v1(UUID) TO authenticated;

COMMIT;