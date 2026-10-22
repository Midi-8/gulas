-- ============================================================================
-- GULAS RESTAURANT PLATFORM — PROCEDIMENTO MANUAL DE LIMPEZA DE PEDIDOS DE TESTE
-- Ficheiro: supabase/manual_procedures/clean_test_orders.sql
-- Alvo: Projeto Supabase emjhabwmuvmjwshbkgvt
-- Estado: PROCEDIMENTO MANUAL (NÃO EXECUTAR AUTOMATICAMENTE COMO MIGRAÇÃO)
-- ============================================================================
-- AVISO CRÍTICO DE RISCO:
-- 1. Este procedimento apaga TODOS os registos das tabelas public.orders e
--    public.order_items (não apenas a Mesa 4).
-- 2. RISCO DE REEXECUÇÃO: Se for executado posteriormente com a loja aberta ou
--    em produção real, provocará perda irreversível de vendas e histórico ativo!
-- 3. NÃO DEVE constar na pasta supabase/migrations para evitar que ferramentas
--    de deploy (CI/CD ou supabase db push) executem esta limpeza sem intenção.
-- ============================================================================

BEGIN;

-- 1. CRIAÇÃO DE SCHEMA DE ARQUIVO ISOLADO COM ACESSO RESTRITO
-- Impede que os backups fiquem no schema public e fiquem expostos a consultas anon/authenticated
CREATE SCHEMA IF NOT EXISTS _backup_archive;
REVOKE ALL ON SCHEMA _backup_archive FROM PUBLIC, anon, authenticated;
GRANT ALL ON SCHEMA _backup_archive TO postgres, service_role;

-- 2. CRIAÇÃO DE TABELAS DE BACKUP COM CARIMBO TEMPORAL ÚNICO
-- O uso de carimbo único (timestamp) impede que execuções posteriores reutilizem
-- tabelas antigas vazias ou desatualizadas via IF NOT EXISTS.
DO $$
DECLARE
    v_timestamp TEXT := to_char(NOW(), 'YYYYMMDD_HH24MISS');
    v_sql_orders TEXT;
    v_sql_items TEXT;
    v_orders_count INTEGER;
    v_items_count INTEGER;
BEGIN
    -- Contagem prévia
    SELECT COUNT(*) INTO v_orders_count FROM public.orders;
    SELECT COUNT(*) INTO v_items_count FROM public.order_items;
    
    RAISE NOTICE '>>> [PRÉ-LIMPEZA] A iniciar limpeza. Registos a arquivar: % pedidos e % itens.', v_orders_count, v_items_count;

    -- Criação dinâmica de snapshots carimbados
    v_sql_orders := format('CREATE TABLE _backup_archive.orders_snapshot_%s AS SELECT * FROM public.orders;', v_timestamp);
    v_sql_items  := format('CREATE TABLE _backup_archive.order_items_snapshot_%s AS SELECT * FROM public.order_items;', v_timestamp);
    
    EXECUTE v_sql_orders;
    EXECUTE v_sql_items;

    -- Ativar RLS e revogar acesso nas tabelas de backup recém-criadas
    EXECUTE format('ALTER TABLE _backup_archive.orders_snapshot_%s ENABLE ROW LEVEL SECURITY;', v_timestamp);
    EXECUTE format('ALTER TABLE _backup_archive.order_items_snapshot_%s ENABLE ROW LEVEL SECURITY;', v_timestamp);
    EXECUTE format('REVOKE ALL ON _backup_archive.orders_snapshot_%s FROM PUBLIC, anon, authenticated;', v_timestamp);
    EXECUTE format('REVOKE ALL ON _backup_archive.order_items_snapshot_%s FROM PUBLIC, anon, authenticated;', v_timestamp);

    RAISE NOTICE '>>> [BACKUP CRIADO] Snapshots guardados com sucesso em _backup_archive com carimbo %.', v_timestamp;
END $$;

-- 3. ELIMINAÇÃO CONTROLADA E ATÓMICA DOS DADOS ATIVOS
-- Elimina as linhas filhas (order_items) e depois as ordens (orders)
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
        RAISE EXCEPTION 'FALHA DE INTEGRIDADE: Restam % pedidos e % itens na base ativa. A reverter transação.', v_orders_after, v_items_after;
    END IF;
    
    RAISE NOTICE '>>> [PÓS-LIMPEZA] Base de dados limpa com sucesso. 0 pedidos e 0 itens na base ativa.';
END $$;

COMMIT;

-- ============================================================================
-- PROTOCOLO DE RECUPERAÇÃO / ROLLBACK
-- ============================================================================
-- Caso ocorra necessidade de restauro imediato, identificar a tabela carimbada
-- gerada em _backup_archive (ex: orders_snapshot_20261015_120000) e executar:
--
-- BEGIN;
-- INSERT INTO public.orders 
-- SELECT * FROM _backup_archive.orders_snapshot_YYYYMMDD_HHMMSS 
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO public.order_items 
-- SELECT * FROM _backup_archive.order_items_snapshot_YYYYMMDD_HHMMSS 
-- ON CONFLICT (id) DO NOTHING;
-- COMMIT;
--
-- ============================================================================
-- POLÍTICA DE RETENÇÃO DO BACKUP
-- ============================================================================
-- As tabelas em _backup_archive devem ser preservadas por um período de segurança
-- de 15 a 30 dias após a entrada em produção. Após este prazo e confirmação do
-- fecho de caixa e relatórios analíticos, o schema pode ser removido pelo DBA:
-- DROP SCHEMA _backup_archive CASCADE;
-- ============================================================================
