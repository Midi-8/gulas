-- ============================================================================
-- GULAS RESTAURANT PLATFORM — PROCEDIMENTO DE LIMPEZA DE PEDIDOS DE TESTE
-- Migration: 20261015_clean_test_orders.sql
-- Alvo: Projeto Supabase emjhabwmuvmjwshbkgvt
-- Estado: PREPARADO (NÃO EXECUTADO — Requer confirmação e execução pelo utilizador)
-- ============================================================================
-- AVISO CRÍTICO:
-- Este script apaga TODOS os pedidos e itens de pedidos das tabelas public.orders
-- e public.order_items (não apenas a Mesa 4).
-- Preserva: restaurantes, categorias, produtos, mesas, perfis e restaurant_counters.
-- ============================================================================

BEGIN;

-- 1. SALVAGUARDA TRANSITÓRIA (Cópia recuperável dos dados antes da eliminação)
CREATE TABLE IF NOT EXISTS public._backup_orders_20261015 AS
SELECT * FROM public.orders;

CREATE TABLE IF NOT EXISTS public._backup_order_items_20261015 AS
SELECT * FROM public.order_items;

-- 2. VERIFICAÇÃO PRÉVIA DE CONTAGENS
DO $$
DECLARE
    v_orders_count INTEGER;
    v_items_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orders_count FROM public.orders;
    SELECT COUNT(*) INTO v_items_count FROM public.order_items;
    RAISE NOTICE '>>> [PRÉ-LIMPEZA] Encontrados: % pedidos e % itens de pedido.', v_orders_count, v_items_count;
END $$;

-- 3. ELIMINAÇÃO TRANSACIONAL CONTROLADA (Respeitando integridade referencial)
-- Elimina primeiro as linhas filhas (order_items) e depois as linhas pai (orders)
DELETE FROM public.order_items;
DELETE FROM public.orders;

-- 4. VERIFICAÇÃO PÓS-LIMPEZA
DO $$
DECLARE
    v_orders_after INTEGER;
    v_items_after INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orders_after FROM public.orders;
    SELECT COUNT(*) INTO v_items_after FROM public.order_items;
    
    IF v_orders_after > 0 OR v_items_after > 0 THEN
        RAISE EXCEPTION 'FALHA NA LIMPEZA: Restam % pedidos e % itens na base ativa.', v_orders_after, v_items_after;
    END IF;
    
    RAISE NOTICE '>>> [PÓS-LIMPEZA] Limpeza concluída com sucesso! 0 pedidos e 0 itens na base ativa.';
END $$;

COMMIT;

-- ============================================================================
-- PROCEDIMENTO DE ROLLBACK / RECUPERAÇÃO DOS DADOS
-- Caso seja necessário repor os pedidos eliminados, executar o bloco abaixo:
-- ============================================================================
-- BEGIN;
-- INSERT INTO public.orders SELECT * FROM public._backup_orders_20261015 ON CONFLICT DO NOTHING;
-- INSERT INTO public.order_items SELECT * FROM public._backup_order_items_20261015 ON CONFLICT DO NOTHING;
-- COMMIT;
