# Gulas Platform — Digital Menu, Kitchen Display & Business Intelligence

Plataforma digital para restauração e pedidos de mesa, concebida de raiz com arquitetura multi-tenant, zero-trust frontend, transações atómicas em base de dados, monitor de cozinha KDS em tempo real e centro de comando analítico executivo (Business Intelligence).

Atualmente configurada para a operação do restaurante Gulas — Pizza, Burger & Coffee (Vila das Aves, Portugal).

---

## 1. Visão Geral e Destaques Arquiteturais

A plataforma resolve os desafios operacionais, de segurança e de suporte à decisão de unidades de restauração modernas:

* **Zero-Trust Frontend:** O browser do cliente nunca é a fonte de verdade para preços, nomes de artigos ou totais de conta. O cliente submete unicamente identificadores de produto, quantidades e observações. O servidor valida a existência, disponibilidade, categoria ativa e calcula todos os montantes com precisão monetária em PostgreSQL.
* **Atomicidade Transacional:** A submissão de pedidos é processada através de uma função PostgreSQL transacional `SECURITY DEFINER` (`create_order_atomic`).
* **Segurança por Defeito (RLS):** Todas as tabelas possuem Row Level Security ativado. As tabelas `orders` e `order_items` encontram-se protegidas contra comandos diretos de `INSERT` público.
* **Multi-Tenant Nativo:** A identificação do restaurante é resolvida no servidor por slug ou sessão de staff, isolando produtos, categorias, mesas, contadores e pedidos entre diferentes estabelecimentos.
* **Autenticação & Autorização de Staff:** Gestão de acesso administrativo com verificação estrita de perfis (`owner`, `manager`, `staff`) associados ao restaurante em `public.profiles`.
* **Máquina de Estados de Cozinha:** Ciclo de vida estrito para transições de estado dos pedidos (`pending` -> `accepted` -> `preparing` -> `ready` -> `completed` / `cancelled`).
* **Monitor KDS em Tempo Real:** Painel operacional para tablet e desktop com métricas em tempo real, cartões táteis de pedidos, observações de clientes e botões contextuais com proteção contra duplo clique.
* **Supabase Realtime (Signal & Fetch):** Sincronização via WebSockets com padrão de reconciliação forçada após suspensão de ecrã ou reconexão Wi-Fi, garantindo estabilidade operacional.
* **Arquivo e Histórico:** Registo detalhado de pedidos concluídos e cancelados com filtros dinâmicos por mesa, estado e intervalo temporal.
* **Centro de Comando & BI Avançado:** Módulo analítico com matriz BCG de rentabilidade, cesta de compras (Market Basket / Cross-Selling), SLA de confeção, mineração semântica de preferências (NLP em português) e simulador preditivo de elasticidade de preços ("What-If").

---

## 2. Stack Tecnológica

* **Framework:** Next.js 16 (App Router com Turbopack)
* **Linguagem:** TypeScript 5 (tipagem estrita de ponta a ponta)
* **Biblioteca UI:** React 19 (Server Components e Client Components otimizados)
* **Estilização:** Tailwind CSS v4 com tokens semânticos e modo escuro executivo
* **Validação de Esquemas:** Zod v4 (validação de payloads, identificadores UUID e integridade de dados)
* **Base de Dados e Autenticação:** Supabase com PostgreSQL 15+
* **Sincronização em Tempo Real:** Supabase Realtime (WebSockets com Replicação Lógica)
* **Integração Supabase:** `@supabase/ssr` e `@supabase/supabase-js` (padrão singleton no browser e SSR server client)
* **Visualizações e Gráficos:** SVG nativo e Tailwind CSS (sem dependências externas pesadas)
* **Iconografia:** Lucide React

---

## 3. Estado dos Milestones

| Milestone | Designação | Estado | Descrição |
| :--- | :--- | :--- | :--- |
| **M1** | Digital Menu Interface | Concluído | Menu mobile-first, navegação por categorias, drawer de carrinho, pesquisa com filtros e modais de detalhe. |
| **M2** | Supabase Multi-Tenant Integration | Concluído | Esquema relacional, Row Level Security, catálogo de artigos, categorias e mesas com isolamento por restaurante. |
| **M3** | Real Ordering System | Concluído | Server Actions (`createOrder`), validação Zod, RPC PostgreSQL atómica e prevenção de pedidos duplicados. |
| **M4.1** | Staff Auth & Protected Routes | Concluído | Autenticação de staff, controlo de permissões por perfil (`owner`, `manager`, `staff`) e rotas administrativas protegidas. |
| **M4.2** | Order Management Backend | Concluído | Server Actions de gestão (`getActiveOrders`, `getOrderById`, `updateOrderStatus`) e máquina de estados estrita. |
| **M4.3** | Kitchen Display System (KDS) UI | Concluído | Dashboard interativo de cozinha com contadores operacionais (KPIs), cartões detalhados e ações de transição. |
| **M4.4** | Supabase Realtime KDS | Concluído | Sincronização em tempo real via WebSockets com reconciliação automática em retoma de rede e foco de ecrã. |
| **M4.5** | Order History & Multi-Filters | Concluído | Histórico de pedidos finalizados com pesquisa por ID/número, filtros por mesa/período e modal de inspeção. |
| **M5** | Business Intelligence & Analytics | Concluído | Centro de comando executivo (`/admin/analytics`) com matriz BCG, cross-selling, SLA, NLP e simulador What-If. |

---

## 4. Módulos do Sistema

### 4.1. Menu Digital e Pedidos de Mesa (Cliente)
* Navegação fluida por categorias com barra adesiva superior.
* Pesquisa em tempo real com filtros por alergénios e destaques.
* Drawer de carrinho com revisão detalhada e inserção de notas personalizadas.
* Seleção manual de mesa ou bloqueio automático de mesa através de URL/QR Code (`/menu/[slug]/table/[tableNumber]`).
* Modal de confirmação com acompanhamento do estado do pedido.

### 4.2. Monitor de Cozinha KDS (Operação)
* Vista em grelha responsiva adaptada a tablets e ecrãs táteis de cozinha.
* Badges de estado contextuais com contagem decrescente e alertas visuais para pedidos em atraso.
* Discriminação de observações do cliente e de alérgenos com destaque visual.
* Botões de avanço de fluxo protegidos contra cliques repetidos.
* Alertas sonoros sintetizados nativos para novos pedidos.

### 4.3. Histórico e Auditoria de Pedidos
* Tabela consolidada de pedidos concluídos e cancelados.
* Filtros rápidos por período (Hoje, 7 Dias, 30 Dias ou Todo o Histórico).
* Pesquisa direta por número de pedido ou mesa.
* Modal com discriminação de artigos, preços unitários e timestamps de ciclo de vida.

### 4.4. Centro de Comando & BI Avançado (/admin/analytics)
* **Faixa de KPIs com Sparklines Nativos:** Faturação total, ticket médio por cliente, cumprimento de SLA de cozinha (< 20 minutos), ritmo de pedidos por hora e projeção de fecho de turno/mês.
* **Engenharia de Menu (Matriz BCG):** Classificação automática de produtos em Estrelas (alto volume, alta margem), Cavalos de Batalha (alto volume, margem menor), Quebra-Cabeças (baixo volume, margem elevada) e Inertes (candidatos a revisão).
* **Análise de Cross-Selling (Market Basket):** Identificação dos pares de artigos mais frequentemente pedidos em conjunto com cálculo de probabilidade e receita média do combo.
* **Pressão Operacional de Cozinha:** Histograma SVG de fluxo de pedidos distribuído por hora do dia com indicação de picos de almoço e jantar.
* **Mineração Semântica de Observações (NLP em Português):** Separação automática entre preferências operacionais de clientes ("sem cebola", "bem passado", "ao ponto") e deteção de fugas de margem por extras não cobrados ("molho extra", "mais batatas", "dose reforçada").
* **Simulador Estratégico "What-If":** Ferramenta interativa de suporte à decisão que permite ao gestor simular aumentos médios de preço com sensibilidade de elasticidade de procura e calcular o impacto projetado no lucro bruto em tempo real.
* **Exportação de Dados:** Geração de relatórios consolidados em formato CSV (delimitador ponto e vírgula e codificação UTF-8 BOM para compatibilidade com Excel e Numbers).

---

## 5. Arquitetura de Dados (PostgreSQL)

O modelo de dados é estruturado em tabelas relacionais com integridade referencial estrita e políticas de RLS ativas:

1. **`restaurants`**: Configuração central do restaurante (nome, slug, morada, horários e estado de abertura).
2. **`profiles`**: Registo de utilizadores com associação ao restaurante e papel de autorização (`owner`, `manager`, `staff`).
3. **`categories`**: Categorias de produtos com ordenação de exibição (`display_order`).
4. **`products`**: Catálogo de artigos com preço de venda, custo de produção, disponibilidade e etiquetas de alérgenos.
5. **`tables`**: Mesas ativas do restaurante identificadas por número e nome de sala.
6. **`restaurant_counters`**: Sequenciadores atómicos para numeração incremental e legível de pedidos (`order_number`).
7. **`orders`**: Registo de cabeçalho de pedido com `table_number`, totais monetários, notas do cliente e timestamps de auditoria.
8. **`order_items`**: Linhas de pedido imutáveis com snapshot histórico de preço de venda e custo na data da compra.

---

## 6. Ciclo de Vida do Pedido

```
[ pending ] ──────> [ accepted ] ──────> [ preparing ] ──────> [ ready ] ──────> [ completed ]
     │                    │                    │
     └────────────────────┴────────────────────┴────────> [ cancelled ]
```

* **Transições Operacionais Válidas:**
  * `pending` -> `accepted` ou `cancelled`
  * `accepted` -> `preparing` ou `cancelled`
  * `preparing` -> `ready` ou `cancelled`
  * `ready` -> `completed`
  * `completed` e `cancelled` são estados finais permanentes que alimentam os módulos de Histórico e Analytics.

---

## 7. Estrutura de Diretórios

```
gulas/
├── src/
│   ├── actions/
│   │   ├── analytics.ts             # Motor de BI, cálculos BCG, cross-selling, NLP e CSV
│   │   ├── auth.ts                  # Autenticação de staff e gestão de sessão
│   │   ├── order-management.ts      # Ações do KDS e histórico de pedidos
│   │   ├── orders.ts                # Submissão pública de pedidos com RPC atómica
│   │   └── test-bench.ts            # Ações de disparo de pedidos simulados para bancada
│   ├── app/
│   │   ├── admin/
│   │   │   ├── (protected)/
│   │   │   │   ├── layout.tsx       # Layout com verificação de autenticação de staff
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx     # Centro de Comando & BI Executivo
│   │   │   │   ├── orders/
│   │   │   │   │   ├── page.tsx     # Monitor KDS de cozinha em tempo real
│   │   │   │   │   └── history/
│   │   │   │   │       └── page.tsx # Histórico e arquivo de pedidos
│   │   │   ├── login/
│   │   │   │   └── page.tsx         # Página de login administrativo
│   │   │   ├── layout.tsx           # Layout base da administração
│   │   │   └── page.tsx             # Redirecionamento da raiz administrativa
│   │   ├── menu/
│   │   │   └── [restaurantSlug]/
│   │   │       ├── page.tsx         # Menu digital público
│   │   │       └── table/[tableNumber]/
│   │   │           └── page.tsx     # Menu com mesa bloqueada por contexto
│   │   ├── test/
│   │   │   └── page.tsx             # Rota de diagnóstico e testes de bancada
│   │   ├── globals.css              # Sistema de design e estilos globais Tailwind v4
│   │   ├── layout.tsx               # Root Layout com provedores de contexto
│   │   └── page.tsx                 # Página de apresentação da plataforma
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminHeader.tsx      # Cabeçalho da administração com dados de staff
│   │   │   ├── AdminNav.tsx         # Navegação entre KDS, Histórico e Analytics
│   │   │   ├── LogoutButton.tsx     # Ação segura de encerramento de sessão
│   │   │   ├── analytics/
│   │   │   │   └── AnalyticsDashboardView.tsx # Dashboard executivo e simulador What-If
│   │   │   ├── history/
│   │   │   │   ├── OrderHistoryDetailModal.tsx # Inspeção detalhada de pedido
│   │   │   │   └── OrderHistoryView.tsx        # Tabela e filtros de histórico
│   │   │   └── orders/
│   │   │       ├── OrderCard.tsx           # Cartão tátil de pedido no KDS
│   │   │       ├── OrderDashboard.tsx      # Grelha KDS com KPIs operacionais
│   │   │       ├── OrderItemsList.tsx      # Listagem de artigos e observações
│   │   │       ├── OrderStatusActions.tsx  # Botões de transição de estado
│   │   │       └── OrderStatusBadge.tsx    # Badges visuais de estado
│   │   ├── menu/
│   │   │   ├── CartDrawer.tsx       # Gaveta lateral de revisão de carrinho
│   │   │   ├── CategoryNav.tsx      # Navegação adesiva de categorias
│   │   │   ├── FloatingCartBar.tsx  # Barra flutuante de checkout
│   │   │   ├── OrderConfirmationModal.tsx # Acompanhamento de pedido submetido
│   │   │   ├── ProductCard.tsx      # Cartão de artigo do menu
│   │   │   ├── ProductDetailModal.tsx # Modal com detalhes e notas do artigo
│   │   │   ├── RestaurantHeader.tsx # Cabeçalho do menu com seleção de mesa
│   │   │   ├── RestaurantMenuView.tsx # Vista principal agregadora do menu
│   │   │   └── SearchBar.tsx        # Pesquisa com filtros rápidos
│   │   └── ui/
│   │       ├── Badge.tsx            # Etiqueta visual utilitária
│   │       └── Toast.tsx            # Notificações contextuais
│   ├── context/
│   │   └── CartContext.tsx          # Gestão de estado global do carrinho de compras
│   ├── hooks/
│   │   └── useOrdersRealtime.ts     # Hook com resiliência a reconexão e foco
│   ├── lib/
│   │   ├── auth/
│   │   │   └── staff.ts             # Verificação de credenciais e perfil de staff
│   │   ├── supabase/
│   │   │   ├── client.ts            # Cliente singleton para o browser
│   │   │   ├── server.ts            # Cliente SSR para Server Components/Actions
│   │   │   └── types.ts             # Tipos TypeScript sincronizados com PostgreSQL
│   │   └── validations/
│   │       ├── auth.ts              # Validação de credenciais de login
│   │       ├── order-management.ts # Validação de transições de estado
│   │       └── order.ts             # Validação de submissão de pedidos
│   ├── services/
│   │   └── restaurantService.ts     # Camada de consulta de dados públicos do menu
│   └── types/
│       └── restaurant.ts            # Interfaces e modelos centrais da aplicação
├── supabase/
│   ├── migrations/                  # Ficheiros SQL de migração versionados
│   └── seed.sql                     # Dados iniciais para ambiente de desenvolvimento
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 8. Instalação e Execução Local

### Pré-requisitos
* Node.js >= 18.17.0
* npm >= 9.0.0
* Instância ativa do Supabase (Cloud ou Local via CLI)

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um ficheiro `.env.local` na raiz do projeto com as credenciais do seu projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-aqui
NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG=gulas
```

### 3. Executar o Servidor de Desenvolvimento
```bash
npm run dev
```

O projeto ficará acessível em [http://localhost:3000](http://localhost:3000).

---

## 9. Rotas Disponíveis

### Menu Público (Cliente)
* **`/`** — Apresentação da plataforma e atalhos rápidos de navegação.
* **`/menu/gulas`** — Menu digital do restaurante Gulas com seleção de mesa no carrinho.
* **`/menu/gulas/table/4`** — Menu digital com a Mesa 4 fixa e pré-selecionada.

### Administração & Operação (Staff Autenticado)
* **`/admin/login`** — Formulário de autenticação de staff.
* **`/admin/orders`** — Monitor KDS de cozinha em tempo real.
* **`/admin/orders/history`** — Histórico e arquivo com pesquisa e filtros combinados.
* **`/admin/analytics`** — Centro de comando executivo, matriz BCG, SLA e simulador What-If.

### Diagnóstico & Testes
* **`/test`** — Rota de bancada para disparo e simulação de pedidos controlados.

---

## 10. Validação de Código e Qualidade

O repositório cumpre integralmente os requisitos de compilação estrita e linting:

```bash
# Executar análise estática de código com ESLint
npm run lint

# Executar verificação de tipos TypeScript sem emitir ficheiros
npx tsc --noEmit

# Compilar build de produção Next.js (App Router + Turbopack)
npm run build
```

---

## 11. Políticas de Segurança e Boas Práticas

1. **Princípio do Menor Privilégio:** A chave privilegiada `service_role` nunca é exposta no cliente nem em Server Actions com execução de utilizador.
2. **Isolamento de Restaurante no Servidor:** Todas as consultas e mutações administrativas filtram estritamente por `restaurant_id` resolvido via `getAuthenticatedStaff()`.
3. **Resiliência a Desconexões:** O hook de subscrição em tempo real deteta automaticamente eventos de suspensão de ecrã (`visibilitychange`) e retoma de ligação de rede (`online`), efetuando reconciliações forçadas com a base de dados.
4. **Resoluções Seguras de Custos:** Caso o custo de um produto não esteja configurado, o motor de BI aplica estimativas com base em margens padrão da restauração, evitando divisões por zero ou falhas de processamento.
