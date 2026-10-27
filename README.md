# Gulas Platform — Digital Menu, Kitchen Display & Business Intelligence

Plataforma digital completa para restauração e pedidos de mesa, concebida de raiz com arquitetura multi-tenant, zero-trust frontend, transações atómicas em base de dados, monitor de cozinha KDS em tempo real, acompanhamento de pedidos ao vivo no cliente (Live Order Tracking) e centro de comando analítico executivo (Business Intelligence).

Atualmente configurada para a operação do restaurante **Gulas — Pizza, Burger & Coffee** (Vila das Aves, Portugal).

[![Status](https://img.shields.io/badge/Status-Produ%C3%A7%C3%A3o%20Ready-success.svg)](#)
[![Framework](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38bdf8.svg)](https://tailwindcss.com)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL%2015+-3ecf8e.svg)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-KDS%20Tablet%20Ready-purple.svg)](#)

---

## 1. Visão Geral e Destaques Arquiteturais

A plataforma resolve os desafios operacionais, de segurança e de suporte à decisão de unidades de restauração modernas:

* **Zero-Trust Frontend:** O browser do cliente nunca é a fonte de verdade para preços, nomes de artigos ou totais de conta. O cliente submete unicamente identificadores de produto, quantidades e observações. O servidor valida a existência, disponibilidade, categoria ativa e calcula todos os montantes com precisão monetária em PostgreSQL.
* **Atomicidade Transacional:** A submissão de pedidos é processada através de uma função PostgreSQL transacional `SECURITY DEFINER` (`create_order_atomic`), garantindo criação de cabeçalho e linhas em bloco único ou rollback completo.
* **Segurança por Defeito (RLS):** Todas as tabelas possuem Row Level Security ativado. As tabelas `orders` e `order_items` encontram-se protegidas contra comandos diretos de `INSERT` público, com autorização granular para staff e clientes.
* **Multi-Tenant Nativo:** A identificação do restaurante é resolvida no servidor por slug ou sessão de staff, isolando produtos, categorias, mesas, contadores e pedidos entre diferentes estabelecimentos.
* **Autenticação & Autorização de Staff:** Gestão de acesso administrativo com verificação estrita de perfis (`owner`, `manager`, `staff`) associados ao restaurante em `public.profiles` e `public.staff_members`.
* **Máquina de Estados de Cozinha:** Ciclo de vida estrito para transições de estado dos pedidos (`pending` ➔ `accepted` ➔ `preparing` ➔ `ready` ➔ `completed` / `cancelled`).
* **Monitor KDS em Tempo Real:** Painel operacional para tablet e desktop com métricas em tempo real, cartões táteis de pedidos com temporizadores de SLA, agrupamento consolidado de artigos para confeção e botões com proteção contra duplo clique.
* **Gestão Rápida de Stock (Quick Stock):** Gaveta tátil no KDS para comutação instantânea de disponibilidade de artigos (`is_available`), com propagação em tempo real para o menu do cliente via WebSockets.
* **Live Order Tracking no Cliente:** Acompanhamento discreto e em tempo real no menu do cliente via WebSockets, com stepper visual de 4 etapas, suporte nativo a múltiplos pedidos simultâneos e persistência no armazenamento local do dispositivo.
* **Supabase Realtime (Signal & Fetch):** Sincronização via WebSockets com padrão de reconciliação forçada após suspensão de ecrã ou reconexão Wi-Fi, garantindo estabilidade operacional contínua em ambientes de cozinha e sala.
* **Arquivo e Histórico:** Registo detalhado de pedidos concluídos e cancelados com filtros dinâmicos por mesa, estado e intervalo temporal.
* **Centro de Comando & BI Avançado:** Módulo analítico executivo com matriz BCG de rentabilidade de menu, análise de cross-selling (Market Basket), SLA de confeção, mineração semântica de notas (NLP em português) e simulador preditivo de elasticidade de preços ("What-If").

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Descrição |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Renderização híbrida SSR/RSC com Turbopack |
| **Linguagem** | TypeScript 5.x | Tipagem estrita de ponta a ponta sem `any` implícito |
| **Biblioteca UI** | React 19 | Server Components e Client Components otimizados |
| **Estilização** | Tailwind CSS v4 | Design system com paleta oficial da marca Gulas |
| **Validação** | Zod v4 | Validação estrita de payloads, esquemas UUID e inputs |
| **Base de Dados** | PostgreSQL 15+ (Supabase) | Funções transacionais atómicas, RLS, triggers e índices |
| **Realtime** | Supabase Realtime | WebSockets com replicação lógica e canais broadcast |
| **Integração** | `@supabase/ssr` & JS SDK | Cliente singleton no browser e SSR client seguro |
| **Áudio & Haptics** | Web Audio API & Vibration | Tons sintetizados em código (880Hz / 1100Hz) sem ficheiros pesados |
| **Gráficos & BI** | SVG Nativo & CSS Grid | Renderização pura e responsiva de sparklines e matriz BCG |
| **Iconografia** | Lucide React | Conjunto consistente de ícones vetoriais |

---

## 3. Estado dos Milestones de Desenvolvimento

| Milestone | Designação | Estado | Descrição |
| :--- | :--- | :---: | :--- |
| **M1** | Digital Menu Interface | Concluído | Menu mobile-first, navegação por categorias, drawer de carrinho, pesquisa com filtros e modais de detalhe. |
| **M2** | Supabase Multi-Tenant Integration | Concluído | Esquema relacional, Row Level Security, catálogo de artigos, categorias e mesas com isolamento por restaurante. |
| **M3** | Real Ordering System | Concluído | Server Actions (`createOrder`), validação Zod, RPC PostgreSQL atómica e prevenção de pedidos duplicados. |
| **M4.1** | Staff Auth & Protected Routes | Concluído | Autenticação de staff, controlo de permissões por perfil (`owner`, `manager`, `staff`) e rotas administrativas protegidas. |
| **M4.2** | Order Management Backend | Concluído | Server Actions de gestão (`getActiveOrders`, `getOrderById`, `updateOrderStatus`) e máquina de estados estrita. |
| **M4.3** | Kitchen Display System (KDS) UI | Concluído | Dashboard interativo de cozinha com KPIs operacionais, cartões táteis, temporizadores de SLA e ações de transição. |
| **M4.4** | Supabase Realtime KDS & Áudio | Concluído | Sincronização via WebSockets com reconciliação em retoma de rede/foco, sintetizador de áudio Web Audio API e vibração. |
| **M4.5** | Order History & Multi-Filters | Concluído | Histórico de pedidos finalizados com pesquisa por ID/número, filtros por mesa/período e modal de inspeção. |
| **M5** | Business Intelligence & Analytics | Concluído | Centro de comando executivo (`/admin/analytics`) com matriz BCG, cross-selling, SLA, NLP de notas e simulador What-If. |
| **M6** | Quick Stock & Live Order Tracking | Concluído | Comutação rápida de disponibilidade no KDS, banner persistente e modal com stepper para acompanhamento de pedidos no menu. |
| **M7** | Production Go-Live Hardening | Concluído | Otimização de build Next.js, domínios de imagem Supabase, isolamento de migrações destrutivas e PWA Manifest. |

---

## 4. Módulos do Sistema

### 4.1. Menu Digital e Pedidos de Mesa (Cliente)
* Navegação fluida por categorias com barra adesiva superior (`CategoryNav`).
* Pesquisa em tempo real com filtros por alergénios e destaques (`SearchBar`).
* Atualização instantânea de artigos esgotados via WebSockets (selo "Temporariamente Esgotado" e desativação de compra).
* Drawer de carrinho com revisão detalhada e inserção de notas personalizadas (`CartDrawer`).
* Seleção manual de mesa ou bloqueio automático de mesa através de URL/QR Code (`/menu/[slug]/table/[tableNumber]`).
* Modal de confirmação com integração direta no sistema de rastreio em tempo real.

### 4.2. Live Order Tracking (Cliente)
* Pílula flutuante persistente no rodapé do menu (`ActiveOrderBanner`) com leitura em cache estática imutável para prevenir ciclos de renderização do `useSyncExternalStore`.
* Modal de detalhe (`ActiveOrderDetailModal`) com stepper de 4 etapas:
  * Recebido (`pending`)
  * Em Preparação (`preparing`)
  * Pronto / A Caminho (`ready`)
  * Concluído (`completed`)
* Suporte nativo a múltiplos pedidos simultâneos no mesmo dispositivo (ex.: pedido principal seguido de bebidas/sobremesas) com navegação por separadores e limpeza automática após conclusão.

### 4.3. Monitor de Cozinha KDS (Operação)
* Vista em grelha adaptada a tablets e ecrãs táteis de cozinha (`OrderDashboard`).
* Temporizadores dinâmicos de SLA por pedido com código de cores:
  * **Verde (< 10 min):** Dentro do tempo normal
  * **Amarelo (10 a 19 min):** Atenção / Tempo prolongado
  * **Vermelho (>= 20 min):** Crítico / Atraso operacional
* Barra de agregação de artigos em preparação (`ConsolidatedItems`) que soma as quantidades totais de artigos idênticos em confeção para otimizar o trabalho da bancada.
* Alertas sonoros sintetizados por Web Audio API (tons a 880Hz e 1100Hz) e vibração háptica, com ativação por gesto explícito do utilizador para conformidade com navegadores modernos.
* Janela de reversão de conclusão de 6 segundos ("Desfazer") para recuperar pedidos marcados por engano.
* Gaveta de Gestão Rápida de Stock (`QuickStockDrawer`) para desativar e ativar artigos esgotados com um único toque.

### 4.4. Histórico e Auditoria de Pedidos
* Tabela consolidada de pedidos concluídos e cancelados (`OrderHistoryView`).
* Filtros rápidos por período (Hoje, 7 Dias, 30 Dias ou Todo o Histórico).
* Pesquisa direta por número de pedido ou mesa.
* Modal com discriminação de artigos, preços unitários e timestamps de ciclo de vida (`OrderHistoryDetailModal`).

### 4.5. Centro de Comando & BI Avançado (`/admin/analytics`)
* **Faixa de KPIs com Sparklines Nativos:** Faturação total, ticket médio por cliente, cumprimento de SLA de cozinha (< 20 minutos), ritmo de pedidos por hora e projeção de fecho de turno/mês.
* **Engenharia de Menu (Matriz BCG):** Classificação automática de produtos em Estrelas (alto volume, alta margem), Cavalos de Batalha (alto volume, margem menor), Quebra-Cabeças (baixo volume, margem elevada) e Inertes (candidatos a revisão). Fallback automático de custo a 32% para produtos sem custo unitário cadastrado.
* **Análise de Cross-Selling (Market Basket):** Identificação dos pares de artigos mais frequentemente pedidos em conjunto com cálculo de afinidade e receita média do combo.
* **Histograma de Fluxo Horário:** Gráfico SVG de fluxo de pedidos distribuído por hora do dia com scroll horizontal responsivo e etiquetas persistentes sem sobreposição.
* **Mineração Semântica de Observações (NLP em Português):** Separação automática entre preferências operacionais de clientes ("sem cebola", "bem passado", "ao ponto") e deteção de fugas de margem por extras não cobrados ("molho extra", "mais batatas", "dose reforçada").
* **Simulador Estratégico "What-If":** Ferramenta interativa de suporte à decisão que permite ao gestor simular aumentos médios de preço com sensibilidade de elasticidade de procura e calcular o impacto projetado no lucro bruto em tempo real.
* **Exportação de Dados:** Geração de relatórios consolidados em formato CSV (delimitador ponto e vírgula e codificação UTF-8 com BOM `﻿` para compatibilidade com Microsoft Excel e Apple Numbers).

---

## 5. Design System e Identidade Visual Gulas

O ecossistema adota uma estética minimalista, quente e funcional, concebida para ambientes gastronómicos:

| Token | Código HEX | Utilização |
|---|---|---|
| **Branco Quente** | `#F5F4F1` | Fundo principal da aplicação |
| **Superfície Suave** | `#EAE5DF` | Fundo secundário e zonas de descanso |
| **Cartões / Cards** | `#FFFFFF` | Superfícies ativas, modais e cartões de produto |
| **Bordas & Linhas** | `#E5DED6` | Divisórias e contornos de componentes |
| **Texto Títulos** | `#35271F` | Títulos e ênfase visual |
| **Texto Corpo** | `#4C453F` | Texto corrido e descrições secundárias |
| **Castanho Escuro** | `#5E4939` | Identidade primária da marca |
| **Caramelo** | `#C09573` | Acentos, botões de ação e destaques |

> **Flat Design em Cozinha:** Foram eliminados vidros foscos pesados e transparências agressivas em áreas de trabalho, assegurando legibilidade máxima sob luz natural ou iluminação de bancada de cozinha.

---

## 6. Arquitetura de Dados (PostgreSQL)

O modelo de dados é estruturado em tabelas relacionais com integridade referencial estrita e políticas de RLS ativas:

1. **`restaurants`**: Configuração central do restaurante (nome, slug, morada, horários e estado de abertura).
2. **`profiles`**: Registo de utilizadores com associação ao restaurante e papel de autorização (`owner`, `manager`, `staff`).
3. **`staff_members`**: Vínculo operacional entre utilizadores autenticados e o respetivo restaurante.
4. **`categories`**: Categorias de produtos com ordenação de exibição (`display_order`).
5. **`products`**: Catálogo de artigos com preço de venda, custo de produção, disponibilidade (`is_available`) e etiquetas de alérgenos.
6. **`tables`**: Mesas ativas do restaurante identificadas por número e nome de sala.
7. **`restaurant_counters`**: Sequenciadores atómicos para numeração incremental e legível de pedidos (`order_number`).
8. **`orders`**: Registo de cabeçalho de pedido com `table_number`, totais monetários, notas do cliente e timestamps de auditoria.
9. **`order_items`**: Linhas de pedido imutáveis com snapshot histórico de preço de venda e custo na data da compra.

---

## 7. Ciclo de Vida do Pedido

```
[ pending ] ──────> [ accepted ] ──────> [ preparing ] ──────> [ ready ] ──────> [ completed ]
     │                    │                    │
     └────────────────────┴────────────────────┴──────────────────────────────> [ cancelled ]
```

* **Transições Operacionais Válidas:**
  * `pending` ➔ `accepted` ou `cancelled`
  * `accepted` ➔ `preparing` ou `cancelled`
  * `preparing` ➔ `ready` ou `cancelled`
  * `ready` ➔ `completed`
  * `completed` e `cancelled` são estados finais permanentes que alimentam os módulos de Histórico e Analytics.

---

## 8. Estrutura de Diretórios

```text
gulas/
├── src/
│   ├── actions/
│   │   ├── analytics.ts             # Motor de BI, cálculos BCG, cross-selling, NLP e CSV
│   │   ├── auth.ts                  # Autenticação de staff e gestão de sessão
│   │   ├── order-management.ts      # Ações do KDS, reversão e histórico de pedidos
│   │   ├── orders.ts                # Submissão pública de pedidos e consulta de estado
│   │   ├── product-stock.ts         # Comutação rápida de disponibilidade de stock
│   │   └── test-bench.ts            # Ações de disparo de pedidos simulados para bancada
│   ├── app/
│   │   ├── admin/
│   │   │   ├── (protected)/
│   │   │   │   ├── layout.tsx       # Layout com verificação de autenticação de staff
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx     # Centro de Comando & BI Executivo
│   │   │   │   └── orders/
│   │   │   │       ├── page.tsx     # Monitor KDS de cozinha em tempo real
│   │   │   │       └── history/
│   │   │   │           └── page.tsx # Histórico e arquivo de pedidos
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
│   │   ├── manifest.ts              # PWA Web App Manifest dinâmico para tablet
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
│   │   │   ├── kds/
│   │   │   │   └── ConsolidatedItems.tsx       # Agrupamento de artigos em preparação
│   │   │   ├── orders/
│   │   │   │   ├── OrderCard.tsx           # Cartão tátil de pedido no KDS
│   │   │   │   ├── OrderDashboard.tsx      # Grelha KDS com KPIs operacionais
│   │   │   │   ├── OrderItemsList.tsx      # Listagem de artigos e observações
│   │   │   │   ├── OrderStatusActions.tsx  # Botões de transição de estado
│   │   │   │   └── OrderStatusBadge.tsx    # Badges visuais de estado
│   │   │   └── stock/
│   │   │       └── QuickStockDrawer.tsx    # Gaveta tátil de gestão de stock
│   │   ├── menu/
│   │   │   ├── ActiveOrderBanner.tsx    # Pílula flutuante de rastreio de pedido
│   │   │   ├── ActiveOrderDetailModal.tsx # Modal com stepper e abas multi-pedido
│   │   │   ├── CartDrawer.tsx           # Gaveta lateral de revisão de carrinho
│   │   │   ├── CategoryNav.tsx          # Navegação adesiva de categorias
│   │   │   ├── FloatingCartBar.tsx      # Barra flutuante de checkout
│   │   │   ├── OrderConfirmationModal.tsx # Acompanhamento imediato pós-submissão
│   │   │   ├── ProductCard.tsx          # Cartão de artigo do menu
│   │   │   ├── ProductDetailModal.tsx   # Modal com detalhes e notas do artigo
│   │   │   ├── RestaurantHeader.tsx     # Cabeçalho do menu com seleção de mesa
│   │   │   ├── RestaurantMenuView.tsx   # Vista principal agregadora do menu
│   │   │   └── SearchBar.tsx            # Pesquisa com filtros rápidos
│   │   └── ui/
│   │       ├── Badge.tsx                # Etiqueta visual utilitária
│   │       └── Toast.tsx                # Notificações contextuais
│   ├── context/
│   │   └── CartContext.tsx              # Gestão de estado global do carrinho de compras
│   ├── hooks/
│   │   ├── useActiveOrderTracker.tsx    # Hook de rastreio de pedidos e sincronização
│   │   ├── useKdsAlerts.ts              # Síntese Web Audio e vibração para KDS
│   │   ├── useOrdersRealtime.ts         # Hook KDS com reconciliação em retoma de rede
│   │   ├── useOrderTimer.ts             # Temporizador reativo de minutos de pedido
│   │   └── useScreenWakeLock.ts         # Manutenção de ecrã ativo para tablet de cozinha
│   ├── lib/
│   │   ├── auth/
│   │   │   └── staff.ts                 # Verificação de credenciais e perfil de staff
│   │   ├── supabase/
│   │   │   ├── client.ts                # Cliente singleton para o browser
│   │   │   ├── server.ts                # Cliente SSR para Server Components/Actions
│   │   │   └── types.ts                 # Tipos TypeScript sincronizados com PostgreSQL
│   │   └── validations/
│   │       ├── auth.ts                  # Validação de credenciais de login
│   │       ├── order-management.ts      # Validação de transições de estado
│   │       └── order.ts                 # Validação de submissão de pedidos
│   ├── services/
│   │   └── restaurantService.ts         # Camada de consulta de dados públicos do menu
│   └── types/
│       └── restaurant.ts                # Interfaces e modelos centrais da aplicação
├── supabase/
│   ├── migrations/                      # Ficheiros SQL de migração versionados
│   ├── manual_procedures/               # Procedimentos manuais isolados (limpeza/backup)
│   └── seed.sql                         # Dados reais e catálogo do restaurante Gulas
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 9. Instalação e Execução Local

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica-aqui
NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG=gulas
```

### 3. Executar o Servidor de Desenvolvimento
```bash
npm run dev
```

O projeto ficará acessível em [http://localhost:3000](http://localhost:3000).

---

## 10. Rotas Disponíveis

### Menu Público (Cliente)
* **`/`** — Apresentação da plataforma e atalhos rápidos de navegação.
* **`/menu/gulas`** — Menu digital do restaurante Gulas com seleção de mesa no carrinho e banner de Live Order Tracking.
* **`/menu/gulas/table/4`** — Menu digital com a Mesa 4 fixa e bloqueada no contexto.

### Administração & Operação (Staff Autenticado)
* **`/admin/login`** — Formulário de autenticação de staff.
* **`/admin/orders`** — Monitor KDS de cozinha em tempo real, gaveta Quick Stock e alertas sonoros.
* **`/admin/orders/history`** — Histórico e arquivo com pesquisa e filtros combinados.
* **`/admin/analytics`** — Centro de comando executivo, matriz BCG, SLA, análise semântica e simulador What-If.

### Diagnóstico & Testes
* **`/test`** — Rota de bancada para disparo e simulação de pedidos controlados.

---

## 11. Validação de Código e Qualidade

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

## 12. Políticas de Segurança e Boas Práticas

1. **Princípio do Menor Privilégio:** A chave privilegiada `service_role` nunca é exposta no cliente nem em Server Actions com execução de utilizador.
2. **Isolamento de Restaurante no Servidor:** Todas as consultas e mutações administrativas filtram estritamente por `restaurant_id` resolvido via `getAuthenticatedStaff()`.
3. **Resiliência a Desconexões:** Os hooks de subscrição em tempo real detetam automaticamente eventos de suspensão de ecrã (`visibilitychange`) e retoma de ligação de rede (`online`), efetuando reconciliações forçadas com a base de dados.
4. **Resoluções Seguras de Custos:** Caso o custo de um produto não esteja configurado, o motor de BI aplica estimativas com base em margens padrão da restauração (32%), evitando divisões por zero ou falhas de processamento.
5. **Estabilidade de Snapshot em SSR:** Todas as leituras locais de estado baseadas em `useSyncExternalStore` utilizam referências imutáveis de módulo, prevenindo loops de re-renderização infinitos entre o servidor e o cliente.

---

## 13. Tablet da Cozinha: PWA Manifest & Screen Wake Lock

### 1. Web App Manifest (`src/app/manifest.ts`)
* **Nome:** Gulas KDS — Monitor de Cozinha (`short_name`: Gulas KDS).
* **Rota Inicial:** `/admin/orders` (preserva autenticação e redireciona para `/admin/login` se a sessão expirar).
* **Display:** `standalone` com orientação `landscape` para bancada.
* **Ícones Produzidos:**
  * `public/icons/icon-192x192.png` (PNG 192x192)
  * `public/icons/icon-512x512.png` (PNG 512x512)
  * `public/icons/apple-touch-icon.png` (PNG 180x180 para iPadOS)
  * `public/icons/icon.svg` (Vetor SVG centrado no emblema original da marca)

### 2. Screen Wake Lock (`src/hooks/useScreenWakeLock.ts`)
Implementado no componente `OrderDashboard.tsx`:
* **Consistência SSR / Hidratação:** Renderização inicial neutra que previne hydration mismatch entre o servidor Next.js e o cliente.
* **Identificador de Geração (`generationRef`):** Protege contra *stale promises*. Se o utilizador desativar o lock ou o componente desmontar enquanto o browser ainda está a processar a solicitação, o sentinel obtido é descartado de imediato e o lock não é reativado.
* **Isolamento de Sentinelas:** Listeners antigos não afetam novos locks.
* **Recuperação de Foco:** Reativação automática ao regressar à página (`visibilitychange`).
* **Design e Acessibilidade:** Indicador visual discreto e acessível (`Sun`/`SunDim`) integrado no cabeçalho operacional do KDS, com botão para manter ecrã ativo ou tentar novamente sem bloquear pedidos.

---

## 14. Procedimento de Limpeza de Pedidos de Teste (Procedimento Manual)

Para repor o estado limpo da base de dados antes do arranque operacional, foi preparado o script manual em:
`supabase/manual_procedures/clean_test_orders.sql`

> [!WARNING]
> **Aviso Crítico de Risco Operacional:**
> - O comando `DELETE FROM public.order_items; DELETE FROM public.orders;` elimina **todos** os registos destas duas tabelas (não apenas a Mesa 4).
> - **Isolamento de Migrações:** O script foi expressamente colocado fora de `supabase/migrations/` para prevenir que ferramentas de CI/CD ou `supabase db push` apaguem pedidos acidentalmente durante deploys.
> - **Risco de Reexecução:** Se este procedimento for corrido com o restaurante em laboração real, haverá perda de vendas ativas. Só deve ser executado no momento da transição pré-produção.
> - **Estado:** **PROCEDIMENTO MANUAL PREPARADO (NÃO EXECUTADO)**. Não foi executado nem aplicado à base de dados.

### Protocolo de Proteção e Salvaguarda:
1. **Schema de Arquivo Restrito (`_backup_archive`):** O backup não é colocado no schema public. Cria o schema `_backup_archive` e revoga todos os privilégios a `PUBLIC`, `anon` e `authenticated`, concedendo acesso exclusivo a `postgres` e `service_role`.
2. **Snapshots com Carimbo Temporal Único:** Gera tabelas carimbadas dinamicamente (`orders_snapshot_YYYYMMDD_HH24MISS`), eliminando o risco do `CREATE TABLE IF NOT EXISTS` reutilizar backups antigos sem salvar os dados atuais.
3. **Rollback e Retenção:** O script documenta o comando de restauração a partir do snapshot carimbado e fixa uma retenção recomendada de 15 a 30 dias antes de `DROP SCHEMA _backup_archive CASCADE`.

---

## 15. Auditoria de Segurança Supabase, RLS & Autorização de Pedidos

Migração proposta e especificada em:
`supabase/migrations/20261015_security_audit_and_rls_hardening.sql`

> [!IMPORTANT]
> **Estado de Implementação:** **ESPECIFICADO LOCALMENTE (NÃO APLICADO REMOTAMENTE)**. As alterações de RLS, grants e RPC requerem revisão e execução controlada no Supabase SQL Editor. Não foram aplicadas na base de dados remota.

### Matriz de Controlo de Acessos Proposta
| Tabela / Recurso | Utilizador Anónimo (Cliente) | Staff Autenticado (Próprio Restaurante) | Staff (Outro Restaurante) |
| :--- | :--- | :--- | :--- |
| `restaurants` | SELECT (Apenas se `is_active = true`) | SELECT / UPDATE (`id = profile.restaurant_id`) | Bloqueado |
| `categories` | SELECT (`is_active = true` de rest. ativo) | ALL (`restaurant_id = profile.restaurant_id`) | Bloqueado |
| `products` | SELECT (Colunas públicas; **cost revogado**) | ALL (`restaurant_id = profile.restaurant_id`) | Bloqueado (cost não acessível) |
| `tables` | SELECT (`is_active = true` de rest. ativo) | ALL (`restaurant_id = profile.restaurant_id`) | Bloqueado |
| `orders` | Bloqueado para SELECT direto | ALL (`restaurant_id = profile.restaurant_id`) | Bloqueado |
| `order_items` | Bloqueado para SELECT direto | ALL (`order_id` do restaurante do staff) | Bloqueado |
| `restaurant_counters` | Bloqueado | SELECT (`restaurant_id = profile.restaurant_id`) | Bloqueado |

### Vetores de Segurança Auditados e Corrigidos no Código:
1. **Revogação de Public Read Orders:** Elimina a migração `20261012_public_read_orders.sql` que concedia `USING (true)`, expondo todos os pedidos a qualquer utilizador com a chave anon.
2. **Autorização Real do Cliente via `tracking_token`:**
   - O UUID do pedido por si só **não é prova de propriedade**.
   - A arquitetura prevê a introdução de `tracking_token VARCHAR(64)` gerado na criação do pedido, retornado unicamente ao cliente que submeteu o carrinho e persistido localmente.
   - A RPC `get_public_order_status(p_order_id, p_tracking_token)` valida o par exato (`id`, `tracking_token`), rejeitando consultas não autorizadas.
3. **Proteção Anti-Escalação em `profiles`:**
   - Criação de trigger `protect_profile_privileges` para impedir que utilizadores autenticados alterem o seu `restaurant_id` (troca de tenant) ou promovam o seu `role` para `owner` via cliente.
4. **Isolamento de Custos (`products.cost`):**
   - O serviço do menu público (`restaurantService.ts`) projeta apenas campos públicos, omitindo `cost`.
   - Na base de dados, revoga-se `SELECT (cost)` a `anon` e utilizadores `authenticated` que não sejam o staff autorizado do restaurante.
5. **Realtime e RLS:**
   - Ao revogar o `SELECT` aberto em `orders`, subscrições genéricas de `postgres_changes` por clientes anónimos não recebem eventos. A arquitetura suporta sincronização via canais de `broadcast` do Supabase e reconciliação sob demanda via Server Action.

---

## 16. Checklist Pré-Lançamento no Supabase Remoto

* [ ] Executar no SQL Editor do Supabase para ativar Realtime nas ruturas de stock:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  ```
* [ ] Aplicar no Supabase remoto a migração de reforço de Row Level Security e tokens de rastreio (`supabase/migrations/20261015_security_audit_and_rls_hardening.sql`).
* [ ] Confirmar configuração das variáveis de ambiente na Vercel/Hosting (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG=gulas`).

---

*© Gulas Platform — Desenvolvido para Gulas (Pizza, Burger & Coffee). Todos os direitos reservados.*
