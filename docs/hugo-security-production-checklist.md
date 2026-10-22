# Relatório de Auditoria de Segurança e Checklist de Produção (Hugo)

Data da Auditoria: 18 de Outubro de 2026  
Auditor / Responsável: Hugo  
Projeto: Gulas Restaurant Platform  
Branch: `feature/kds-hugo`

---

## 1. Confirmação de Variáveis de Ambiente Locais (.env / .env.local)

- [x] **`NEXT_PUBLIC_SUPABASE_URL`**: Presente e configurada no ambiente local (composto por URL válido `https://*.supabase.co`).
- [x] **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Presente e configurada no ambiente local (chave pública com prefixo anónimo `sb_publishable...` / JWT anon).
- [x] **Consistência de ficheiros**: O ficheiro `.env` foi sincronizado com `.env.local` mantendo as chaves locais intactas.

---

## 2. Verificação do Repositório Git (.gitignore)

- [x] **Nenhum ficheiro com credenciais reais está rastreado no Git**:
  - `git ls-files -- "*env*"` devolve exclusivamente `.env.example`.
  - O ficheiro `.gitignore` inclui explicitamente:
    - `.env`
    - `.env*.local`
    - `.env.production`
    - `.env.staging`
  - Foi verificado que `.env` e `.env.local` permanecem não rastreados (*untracked*) e ignorados pelo Git.

---

## 3. Auditoria de Segredos e Chaves Hardcoded

- [x] **Ausência de `service_role` no código-fonte**:
  - Uma pesquisa recursiva em `src/` confirmou que nenhuma chave `service_role`, segredo JWT ou chave privada está escrita diretamente em código TypeScript/JavaScript.
  - Apenas existem menções de segurança a documentar a proibição do uso de `service_role` no cliente e concessões DDL SQL em migrações para o Supabase (`GRANT ... TO service_role`).
- [x] **Validação do `.env.example`**:
  - Contém exclusivamente valores fictícios (*placeholders*).

---

## 4. Configuração das Variáveis de Ambiente de Produção na Vercel

Caso o projeto esteja alojado na Vercel, seguir estes passos:

1. Aceder ao painel do projeto na Vercel: [vercel.com](https://vercel.com).
2. Selecionar o projeto **Gulas**.
3. Navegar até **Settings** > **Environment Variables**.
4. Adicionar as seguintes variáveis (selecionando os ambientes **Production**, **Preview** e **Development** conforme necessário):
   - **`NEXT_PUBLIC_SUPABASE_URL`**: O URL da instância Supabase de produção (ex.: `https://emjhabwmuvmjwshbkgvt.supabase.co`).
   - **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: A chave anónima pública (*anon public key*) obtida em Supabase > **Project Settings** > **API**.
5. Clicar em **Save**.

---

## 5. Aviso Crítico de Segurança: `service_role key`

> [!CAUTION]
> **NUNCA expor nem configurar a chave `service_role` no frontend, no `.env`, no repositório Git ou em variáveis com prefixo `NEXT_PUBLIC_`:**
> - A chave `service_role` **ignora todas as políticas de Row Level Security (RLS)** da base de dados PostgreSQL.
> - Se for exposta no frontend ou no bundle do browser, qualquer utilizador da internet terá acesso total para ler, alterar ou apagar todos os dados do restaurante (incluindo receitas, custos, perfis de utilizador e configurações do sistema).
> - Se alguma ação administrativa requerer `service_role` no futuro, esta deve ser executada exclusivamente no backend seguro (Edge Functions / Server Actions isoladas) sem o prefixo `NEXT_PUBLIC_` e nunca enviada ao cliente.

---

## 6. Passos para Redeploy após Configuração das Variáveis

Como o Next.js injecta variáveis com o prefixo `NEXT_PUBLIC_` durante o build (*build time*), qualquer alteração às variáveis de ambiente exige um novo build para ter efeito:

1. Aceder ao separador **Deployments** no painel da Vercel.
2. Localizar o deploy mais recente (ou o commit da branch `feature/kds-hugo` / `main`).
3. Clicar nos três pontos verticais (`...`) no canto direito do deploy.
4. Selecionar **Redeploy**.
5. Certificar-se de desmarcar "Use existing Build Cache" caso pretenda garantir a reconstrução limpa com as novas variáveis.
6. Aguardar pela conclusão do build e verificar no browser se a aplicação comunica com sucesso com o Supabase.
