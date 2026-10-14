# Gulas Platform â€” Digital Menu, Kitchen Display & Business Intelligence

Plataforma digital para restauraÃ§Ã£o e pedidos de mesa, concebida de raiz com arquitetura multi-tenant, zero-trust frontend, transaÃ§Ãµes atÃ³micas em base de dados, monitor de cozinha KDS em tempo real, acompanhamento de pedidos ao vivo no cliente (Live Order Tracking) e centro de comando analÃ­tico executivo (Business Intelligence).

Atualmente configurada para a operaÃ§Ã£o do restaurante Gulas â€” Pizza, Burger & Coffee (Vila das Aves, Portugal).

---

## 1. VisÃ£o Geral e Destaques Arquiteturais

A plataforma resolve os desafios operacionais, de seguranÃ§a e de suporte Ã  decisÃ£o de unidades de restauraÃ§Ã£o modernas:

* **Zero-Trust Frontend:** O browser do cliente nunca Ã© a fonte de verdade para preÃ§os, nomes de artigos ou totais de conta. O cliente submete unicamente identificadores de produto, quantidades e observaÃ§Ãµes. O servidor valida a existÃªncia, disponibilidade, categoria ativa e calcula todos os montantes com precisÃ£o monetÃ¡ria em PostgreSQL.
* **Atomicidade Transacional:** A submissÃ£o de pedidos Ã© processada atravÃ©s de uma funÃ§Ã£o PostgreSQL transacional `SECURITY DEFINER` (`create_order_atomic`).
* **SeguranÃ§a por Defeito (RLS):** Todas as tabelas possuem Row Level Security ativado. As tabelas `orders` e `order_items` encontram-se protegidas contra comandos diretos de `INSERT` pÃºblico.
* **Multi-Tenant Nativo:** A identificaÃ§Ã£o do restaurante Ã© resolvida no servidor por slug ou sessÃ£o de staff, isolando produtos, categorias, mesas, contadores e pedidos entre diferentes estabelecimentos.
* **AutenticaÃ§Ã£o & AutorizaÃ§Ã£o de Staff:** GestÃ£o de acesso administrativo com verificaÃ§Ã£o estrita de perfis (`owner`, `manager`, `staff`) associados ao restaurante em `public.profiles` e `public.staff_members`.
* **MÃ¡quina de Estados de Cozinha:** Ciclo de vida estrito para transiÃ§Ãµes de estado dos pedidos (`pending` -> `accepted` -> `preparing` -> `ready` -> `completed` / `cancelled`).
* **Monitor KDS em Tempo Real:** Painel operacional para tablet e desktop com mÃ©tricas em tempo real, cartÃµes tÃ¡teis de pedidos com temporizadores de SLA, agrupamento consolidado de artigos para confeÃ§Ã£o e botÃµes com proteÃ§Ã£o contra duplo clique.
* **GestÃ£o RÃ¡pida de Stock (Quick Stock):** Gaveta tÃ¡til no KDS para comutaÃ§Ã£o instantÃ¢nea de disponibilidade de artigos (`is_available`), com propagaÃ§Ã£o em tempo real para o menu do cliente.
* **Live Order Tracking no Cliente:** Acompanhamento discreto e em tempo real no menu do cliente via WebSockets, com stepper visual de 4 etapas, suporte a mÃºltiplos pedidos simultÃ¢neos e persistÃªncia no armazenamento local do dispositivo.
* **Supabase Realtime (Signal & Fetch):** SincronizaÃ§Ã£o via WebSockets com padrÃ£o de reconciliaÃ§Ã£o forÃ§ada apÃ³s suspensÃ£o de ecrÃ£ ou reconexÃ£o Wi-Fi, garantindo estabilidade operacional contÃ­nua em ambientes de cozinha e sala.
* **Arquivo e HistÃ³rico:** Registo detalhado de pedidos concluÃ­dos e cancelados com filtros dinÃ¢micos por mesa, estado e intervalo temporal.
* **Centro de Comando & BI AvanÃ§ado:** MÃ³dulo analÃ­tico com matriz BCG de rentabilidade, cesta de compras (Market Basket / Cross-Selling), SLA de confeÃ§Ã£o, mineraÃ§Ã£o semÃ¢ntica de preferÃªncias (NLP em portuguÃªs) e simulador preditivo de elasticidade de preÃ§os ("What-If").

---

## 2. Stack TecnolÃ³gica

* **Framework:** Next.js 16 (App Router com Turbopack)
* **Linguagem:** TypeScript 5 (tipagem estrita de ponta a ponta)
* **Biblioteca UI:** React 19 (Server Components e Client Components otimizados)
* **EstilizaÃ§Ã£o & Design System:** Tailwind CSS v4 com paleta oficial da marca Gulas (Branco Quente `#F5F4F1`, Castanho Escuro `#5E4939`, Caramelo `#C09573`)
* **ValidaÃ§Ã£o de Esquemas:** Zod v4 (validaÃ§Ã£o de payloads, identificadores UUID e integridade de dados)
* **Base de Dados e AutenticaÃ§Ã£o:** Supabase com PostgreSQL 15+
* **SincronizaÃ§Ã£o em Tempo Real:** Supabase Realtime (WebSockets com ReplicaÃ§Ã£o LÃ³gica)
* **IntegraÃ§Ã£o Supabase:** `@supabase/ssr` e `@supabase/supabase-js` (padrÃ£o singleton no browser e SSR server client)
* **Ãudio e Haptics:** Web Audio API pura (tons sintetizados em cÃ³digo) e `navigator.vibrate` sem ficheiros de Ã¡udio pesados
* **VisualizaÃ§Ãµes e GrÃ¡ficos:** SVG nativo e Tailwind CSS (sem dependÃªncias externas pesadas)
* **Iconografia:** Lucide React

---

## 3. Estado dos Milestones

| Milestone | DesignaÃ§Ã£o | Estado | DescriÃ§Ã£o |
| :--- | :--- | :--- | :--- |
| **M1** | Digital Menu Interface | ConcluÃ­do | Menu mobile-first, navegaÃ§Ã£o por categorias, drawer de carrinho, pesquisa com filtros e modais de detalhe. |
| **M2** | Supabase Multi-Tenant Integration | ConcluÃ­do | Esquema relacional, Row Level Security, catÃ¡logo de artigos, categorias e mesas com isolamento por restaurante. |
| **M3** | Real Ordering System | ConcluÃ­do | Server Actions (`createOrder`), validaÃ§Ã£o Zod, RPC PostgreSQL atÃ³mica e prevenÃ§Ã£o de pedidos duplicados. |
| **M4.1** | Staff Auth & Protected Routes | ConcluÃ­do | AutenticaÃ§Ã£o de staff, controlo de permissÃµes por perfil (`owner`, `manager`, `staff`) e rotas administrativas protegidas. |
| **M4.2** | Order Management Backend | ConcluÃ­do | Server Actions de gestÃ£o (`getActiveOrders`, `getOrderById`, `updateOrderStatus`) e mÃ¡quina de estados estrita. |
| **M4.3** | Kitchen Display System (KDS) UI | ConcluÃ­do | Dashboard interativo de cozinha com KPIs operacionais, cartÃµes detalhados, temporizadores de SLA e aÃ§Ãµes de transiÃ§Ã£o. |
| **M4.4** | Supabase Realtime KDS & Ãudio | ConcluÃ­do | SincronizaÃ§Ã£o via WebSockets com reconciliaÃ§Ã£o em retoma de rede/foco, sintetizador de Ã¡udio Web Audio API e vibraÃ§Ã£o. |
| **M4.5** | Order History & Multi-Filters | ConcluÃ­do | HistÃ³rico de pedidos finalizados com pesquisa por ID/nÃºmero, filtros por mesa/perÃ­odo e modal de inspeÃ§Ã£o. |
| **M5** | Business Intelligence & Analytics | ConcluÃ­do | Centro de comando executivo (`/admin/analytics`) com matriz BCG, cross-selling, SLA, NLP de notas e simulador What-If. |
| **M6** | Quick Stock & Live Order Tracking | ConcluÃ­do | ComutaÃ§Ã£o rÃ¡pida de disponibilidade no KDS, banner persistente e modal com stepper para acompanhamento de pedidos no menu. |

---

## 4. MÃ³dulos do Sistema

### 4.1. Menu Digital e Pedidos de Mesa (Cliente)
* NavegaÃ§Ã£o fluida por categorias com barra adesiva superior.
* Pesquisa em tempo real com filtros por alergÃ©nios e destaques.
* AtualizaÃ§Ã£o instantÃ¢nea de artigos esgotados via WebSockets (selo "Temporariamente Esgotado" e desativaÃ§Ã£o de compra).
* Drawer de carrinho com revisÃ£o detalhada e inserÃ§Ã£o de notas personalizadas.
* SeleÃ§Ã£o manual de mesa ou bloqueio automÃ¡tico de mesa atravÃ©s de URL/QR Code (`/menu/[slug]/table/[tableNumber]`).
* Modal de confirmaÃ§Ã£o com integraÃ§Ã£o direta no sistema de rastreio em tempo real.

### 4.2. Live Order Tracking (Cliente)
* PÃ­lula flutuante persistente no rodapÃ© do menu (`ActiveOrderBanner`) com leitura em cache estÃ¡tica imutÃ¡vel para prevenir ciclos de renderizaÃ§Ã£o do `useSyncExternalStore`.
* Modal de detalhe (`ActiveOrderDetailModal`) com stepper de 4 etapas:
  * Recebido (`pending`)
  * Em PreparaÃ§Ã£o (`preparing`)
  * Pronto / A Caminho (`ready`)
  * ConcluÃ­do (`completed`)
* Suporte nativo a mÃºltiplos pedidos simultÃ¢neos no mesmo dispositivo (ex.: pedido principal seguido de bebidas/sobremesas) com navegaÃ§Ã£o por separadores e limpeza automÃ¡tica apÃ³s conclusÃ£o.

### 4.3. Monitor de Cozinha KDS (OperaÃ§Ã£o)
* Vista em grelha adaptada a tablets e ecrÃ£s tÃ¡teis de cozinha.
* Temporizadores dinÃ¢micos de SLA por pedido com cÃ³digo de cores:
  * Menos de 10 minutos: Normal
  * 10 a 19 minutos: AtenÃ§Ã£o
  * 20 ou mais minutos: CrÃ­tico
* Barra de agregaÃ§Ã£o de artigos em preparaÃ§Ã£o (`ConsolidatedItems`) que soma as quantidades totais de artigos idÃªnticos em confeÃ§Ã£o.
* Alertas sonoros sintetizados por Web Audio API (tons a 880Hz e 1100Hz) e vibraÃ§Ã£o hÃ¡til, com ativaÃ§Ã£o por gesto explÃ­cito do utilizador para conformidade com navegadores modernos.
* Janela de reversÃ£o de conclusÃ£o de 6 segundos ("Desfazer") para recuperar pedidos marcados por engano.
* Gaveta de GestÃ£o RÃ¡pida de Stock (`QuickStockDrawer`) para desativar e ativar artigos esgotados com um toque.

### 4.4. HistÃ³rico e Auditoria de Pedidos
* Tabela consolidada de pedidos concluÃ­dos e cancelados.
* Filtros rÃ¡pidos por perÃ­odo (Hoje, 7 Dias, 30 Dias ou Todo o HistÃ³rico).
* Pesquisa direta por nÃºmero de pedido ou mesa.
* Modal com discriminaÃ§Ã£o de artigos, preÃ§os unitÃ¡rios e timestamps de ciclo de vida.

### 4.5. Centro de Comando & BI AvanÃ§ado (/admin/analytics)
* **Faixa de KPIs com Sparklines Nativos:** FaturaÃ§Ã£o total, ticket mÃ©dio por cliente, cumprimento de SLA de cozinha (< 20 minutos), ritmo de pedidos por hora e projeÃ§Ã£o de fecho de turno/mÃªs.
* **Engenharia de Menu (Matriz BCG):** ClassificaÃ§Ã£o automÃ¡tica de produtos em Estrelas (alto volume, alta margem), Cavalos de Batalha (alto volume, margem menor), Quebra-CabeÃ§as (baixo volume, margem elevada) e Inertes (candidatos a revisÃ£o). Fallback automÃ¡tico de custo a 32% para produtos sem custo unitÃ¡rio cadastrado.
* **AnÃ¡lise de Cross-Selling (Market Basket):** IdentificaÃ§Ã£o dos pares de artigos mais frequentemente pedidos em conjunto com cÃ¡lculo de afinidade e receita mÃ©dia do combo.
* **Histograma de Fluxo HorÃ¡rio:** GrÃ¡fico SVG de fluxo de pedidos distribuÃ­do por hora do dia com largura mÃ­nima de 800px, scroll horizontal responsivo e etiquetas persistentes sem sobreposiÃ§Ã£o.
* **MineraÃ§Ã£o SemÃ¢ntica de ObservaÃ§Ãµes (NLP em PortuguÃªs):** SeparaÃ§Ã£o automÃ¡tica entre preferÃªncias operacionais de clientes ("sem cebola", "bem passado", "ao ponto") e deteÃ§Ã£o de fugas de margem por extras nÃ£o cobrados ("molho extra", "mais batatas", "dose reforÃ§ada").
* **Simulador EstratÃ©gico "What-If":** Ferramenta interativa de suporte Ã  decisÃ£o que permite ao gestor simular aumentos mÃ©dios de preÃ§o com sensibilidade de elasticidade de procura e calcular o impacto projetado no lucro bruto em tempo real.
* **ExportaÃ§Ã£o de Dados:** GeraÃ§Ã£o de relatÃ³rios consolidados em formato CSV (delimitador ponto e vÃ­rgula e codificaÃ§Ã£o UTF-8 com BOM `\uFEFF` para compatibilidade com Excel e Numbers).

---

## 5. Design System e Identidade Visual Gulas

O ecossistema adota uma estÃ©tica minimalista, quente e funcional, concebida para ambientes gastronÃ³micos:

* **Fundo Principal (Branco Quente):** `#F5F4F1`
* **Fundo SecundÃ¡rio / SuperfÃ­cies Suaves:** `#EAE5DF`
* **CartÃµes e SuperfÃ­cies:** `#FFFFFF`
* **Bordas e DivisÃ³rias:** `#E5DED6`
* **Texto Principal / TÃ­tulos:** `#35271F`
* **Texto SecundÃ¡rio / Corpo:** `#4C453F`
* **Identidade Principal (Castanho Escuro):** `#5E4939`
* **Cor de Destaque (Caramelo):** `#C09573`
* **SuperfÃ­cies Planas (Flat Design):** EliminaÃ§Ã£o de vidros foscos pesados e transparÃªncias agressivas em Ã¡reas de trabalho, garantindo mÃ¡xima legibilidade sob luz natural ou de cozinha.

---

## 6. Arquitetura de Dados (PostgreSQL)

O modelo de dados Ã© estruturado em tabelas relacionais com integridade referencial estrita e polÃ­ticas de RLS ativas:

1. **`restaurants`**: ConfiguraÃ§Ã£o central do restaurante (nome, slug, morada, horÃ¡rios e estado de abertura).
2. **`profiles`**: Registo de utilizadores com associaÃ§Ã£o ao restaurante e papel de autorizaÃ§Ã£o (`owner`, `manager`, `staff`).
3. **`staff_members`**: VÃ­nculo operacional entre utilizadores autenticados e o respetivo restaurante.
4. **`categories`**: Categorias de produtos com ordenaÃ§Ã£o de exibiÃ§Ã£o (`display_order`).
5. **`products`**: CatÃ¡logo de artigos com preÃ§o de venda, custo de produÃ§Ã£o, disponibilidade (`is_available`) e etiquetas de alÃ©rgenos.
6. **`tables`**: Mesas ativas do restaurante identificadas por nÃºmero e nome de sala.
7. **`restaurant_counters`**: Sequenciadores atÃ³micos para numeraÃ§Ã£o incremental e legÃ­vel de pedidos (`order_number`).
8. **`orders`**: Registo de cabeÃ§alho de pedido com `table_number`, totais monetÃ¡rios, notas do cliente e timestamps de auditoria.
9. **`order_items`**: Linhas de pedido imutÃ¡veis com snapshot histÃ³rico de preÃ§o de venda e custo na data da compra.

---

## 7. Ciclo de Vida do Pedido

```
[ pending ] â”€â”€â”€â”€â”€â”€> [ accepted ] â”€â”€â”€â”€â”€â”€> [ preparing ] â”€â”€â”€â”€â”€â”€> [ ready ] â”€â”€â”€â”€â”€â”€> [ completed ]
     â”‚                    â”‚                    â”‚
     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€> [ cancelled ]
```

* **TransiÃ§Ãµes Operacionais VÃ¡lidas:**
  * `pending` -> `accepted` ou `cancelled`
  * `accepted` -> `preparing` ou `cancelled`
  * `preparing` -> `ready` ou `cancelled`
  * `ready` -> `completed`
  * `completed` e `cancelled` sÃ£o estados finais permanentes que alimentam os mÃ³dulos de HistÃ³rico e Analytics.

---

## 8. Estrutura de DiretÃ³rios

```
gulas/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ actions/
â”‚   â”‚   â”œâ”€â”€ analytics.ts             # Motor de BI, cÃ¡lculos BCG, cross-selling, NLP e CSV
â”‚   â”‚   â”œâ”€â”€ auth.ts                  # AutenticaÃ§Ã£o de staff e gestÃ£o de sessÃ£o
â”‚   â”‚   â”œâ”€â”€ order-management.ts      # AÃ§Ãµes do KDS, reversÃ£o e histÃ³rico de pedidos
â”‚   â”‚   â”œâ”€â”€ orders.ts                # SubmissÃ£o pÃºblica de pedidos e consulta de estado
â”‚   â”‚   â”œâ”€â”€ product-stock.ts         # ComutaÃ§Ã£o rÃ¡pida de disponibilidade de stock
â”‚   â”‚   â””â”€â”€ test-bench.ts            # AÃ§Ãµes de disparo de pedidos simulados para bancada
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ admin/
â”‚   â”‚   â”‚   â”œâ”€â”€ (protected)/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ layout.tsx       # Layout com verificaÃ§Ã£o de autenticaÃ§Ã£o de staff
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ analytics/
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx     # Centro de Comando & BI Executivo
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ orders/
â”‚   â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx     # Monitor KDS de cozinha em tempo real
â”‚   â”‚   â”‚   â”‚   â”‚   â””â”€â”€ history/
â”‚   â”‚   â”‚   â”‚   â”‚       â””â”€â”€ page.tsx # HistÃ³rico e arquivo de pedidos
â”‚   â”‚   â”‚   â”œâ”€â”€ login/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ page.tsx         # PÃ¡gina de login administrativo
â”‚   â”‚   â”‚   â”œâ”€â”€ layout.tsx           # Layout base da administraÃ§Ã£o
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx             # Redirecionamento da raiz administrativa
â”‚   â”‚   â”œâ”€â”€ menu/
â”‚   â”‚   â”‚   â””â”€â”€ [restaurantSlug]/
â”‚   â”‚   â”‚       â”œâ”€â”€ page.tsx         # Menu digital pÃºblico
â”‚   â”‚   â”‚       â””â”€â”€ table/[tableNumber]/
â”‚   â”‚   â”‚           â””â”€â”€ page.tsx     # Menu com mesa bloqueada por contexto
â”‚   â”‚   â”œâ”€â”€ test/
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx             # Rota de diagnÃ³stico e testes de bancada
â”‚   â”‚   â”œâ”€â”€ globals.css              # Sistema de design e estilos globais Tailwind v4
â”‚   â”‚   â”œâ”€â”€ layout.tsx               # Root Layout com provedores de contexto
â”‚   â”‚   â””â”€â”€ page.tsx                 # PÃ¡gina de apresentaÃ§Ã£o da plataforma
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ admin/
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminHeader.tsx      # CabeÃ§alho da administraÃ§Ã£o com dados de staff
â”‚   â”‚   â”‚   â”œâ”€â”€ AdminNav.tsx         # NavegaÃ§Ã£o entre KDS, HistÃ³rico e Analytics
â”‚   â”‚   â”‚   â”œâ”€â”€ LogoutButton.tsx     # AÃ§Ã£o segura de encerramento de sessÃ£o
â”‚   â”‚   â”‚   â”œâ”€â”€ analytics/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ AnalyticsDashboardView.tsx # Dashboard executivo e simulador What-If
â”‚   â”‚   â”‚   â”œâ”€â”€ history/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ OrderHistoryDetailModal.tsx # InspeÃ§Ã£o detalhada de pedido
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ OrderHistoryView.tsx        # Tabela e filtros de histÃ³rico
â”‚   â”‚   â”‚   â”œâ”€â”€ kds/
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ ConsolidatedItems.tsx       # Agrupamento de artigos em preparaÃ§Ã£o
â”‚   â”‚   â”‚   â”œâ”€â”€ orders/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ OrderCard.tsx           # CartÃ£o tÃ¡til de pedido no KDS
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ OrderDashboard.tsx      # Grelha KDS com KPIs operacionais
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ OrderItemsList.tsx      # Listagem de artigos e observaÃ§Ãµes
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ OrderStatusActions.tsx  # BotÃµes de transiÃ§Ã£o de estado
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ OrderStatusBadge.tsx    # Badges visuais de estado
â”‚   â”‚   â”‚   â””â”€â”€ stock/
â”‚   â”‚   â”‚       â””â”€â”€ QuickStockDrawer.tsx    # Gaveta tÃ¡til de gestÃ£o de stock
â”‚   â”‚   â”œâ”€â”€ menu/
â”‚   â”‚   â”‚   â”œâ”€â”€ ActiveOrderBanner.tsx    # PÃ­lula flutuante de rastreio de pedido
â”‚   â”‚   â”‚   â”œâ”€â”€ ActiveOrderDetailModal.tsx # Modal com stepper e abas multi-pedido
â”‚   â”‚   â”‚   â”œâ”€â”€ CartDrawer.tsx           # Gaveta lateral de revisÃ£o de carrinho
â”‚   â”‚   â”‚   â”œâ”€â”€ CategoryNav.tsx          # NavegaÃ§Ã£o adesiva de categorias
â”‚   â”‚   â”‚   â”œâ”€â”€ FloatingCartBar.tsx      # Barra flutuante de checkout
â”‚   â”‚   â”‚   â”œâ”€â”€ OrderConfirmationModal.tsx # Acompanhamento imediato pÃ³s-submissÃ£o
â”‚   â”‚   â”‚   â”œâ”€â”€ ProductCard.tsx          # CartÃ£o de artigo do menu
â”‚   â”‚   â”‚   â”œâ”€â”€ ProductDetailModal.tsx   # Modal com detalhes e notas do artigo
â”‚   â”‚   â”‚   â”œâ”€â”€ RestaurantHeader.tsx     # CabeÃ§alho do menu com seleÃ§Ã£o de mesa
â”‚   â”‚   â”‚   â”œâ”€â”€ RestaurantMenuView.tsx   # Vista principal agregadora do menu
â”‚   â”‚   â”‚   â””â”€â”€ SearchBar.tsx            # Pesquisa com filtros rÃ¡pidos
â”‚   â”‚   â””â”€â”€ ui/
â”‚   â”‚       â”œâ”€â”€ Badge.tsx                # Etiqueta visual utilitÃ¡ria
â”‚   â”‚       â””â”€â”€ Toast.tsx                # NotificaÃ§Ãµes contextuais
â”‚   â”œâ”€â”€ context/
â”‚   â”‚   â””â”€â”€ CartContext.tsx              # GestÃ£o de estado global do carrinho de compras
â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”œâ”€â”€ useActiveOrderTracker.tsx    # Hook de rastreio de pedidos e sincronizaÃ§Ã£o
â”‚   â”‚   â”œâ”€â”€ useKdsAlerts.ts              # SÃ­ntese Web Audio e vibraÃ§Ã£o para KDS
â”‚   â”‚   â”œâ”€â”€ useOrdersRealtime.ts         # Hook KDS com reconciliaÃ§Ã£o em retoma de rede
â”‚   â”‚   â””â”€â”€ useOrderTimer.ts             # Temporizador reativo de minutos de pedido
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â”‚   â””â”€â”€ staff.ts                 # VerificaÃ§Ã£o de credenciais e perfil de staff
â”‚   â”‚   â”œâ”€â”€ supabase/
â”‚   â”‚   â”‚   â”œâ”€â”€ client.ts                # Cliente singleton para o browser
â”‚   â”‚   â”‚   â”œâ”€â”€ server.ts                # Cliente SSR para Server Components/Actions
â”‚   â”‚   â”‚   â””â”€â”€ types.ts                 # Tipos TypeScript sincronizados com PostgreSQL
â”‚   â”‚   â””â”€â”€ validations/
â”‚   â”‚       â”œâ”€â”€ auth.ts                  # ValidaÃ§Ã£o de credenciais de login
â”‚   â”‚       â”œâ”€â”€ order-management.ts     # ValidaÃ§Ã£o de transiÃ§Ãµes de estado
â”‚   â”‚       â””â”€â”€ order.ts                 # ValidaÃ§Ã£o de submissÃ£o de pedidos
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â””â”€â”€ restaurantService.ts         # Camada de consulta de dados pÃºblicos do menu
â”‚   â””â”€â”€ types/
â”‚       â””â”€â”€ restaurant.ts                # Interfaces e modelos centrais da aplicaÃ§Ã£o
â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ migrations/                      # Ficheiros SQL de migraÃ§Ã£o versionados
â”‚   â””â”€â”€ seed.sql                         # Dados reais e catÃ¡logo do restaurante Gulas
â”œâ”€â”€ package.json
â”œâ”€â”€ tsconfig.json
â””â”€â”€ next.config.ts
```

---

## 9. InstalaÃ§Ã£o e ExecuÃ§Ã£o Local

### PrÃ©-requisitos
* Node.js >= 18.17.0
* npm >= 9.0.0
* InstÃ¢ncia ativa do Supabase (Cloud ou Local via CLI)

### 1. Instalar DependÃªncias
```bash
npm install
```

### 2. Configurar VariÃ¡veis de Ambiente
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

O projeto ficarÃ¡ acessÃ­vel em [http://localhost:3000](http://localhost:3000).

---

## 10. Rotas DisponÃ­veis

### Menu PÃºblico (Cliente)
* **`/`** â€” ApresentaÃ§Ã£o da plataforma e atalhos rÃ¡pidos de navegaÃ§Ã£o.
* **`/menu/gulas`** â€” Menu digital do restaurante Gulas com seleÃ§Ã£o de mesa no carrinho e banner de Live Order Tracking.
* **`/menu/gulas/table/4`** â€” Menu digital com a Mesa 4 fixa e bloqueada no contexto.

### AdministraÃ§Ã£o & OperaÃ§Ã£o (Staff Autenticado)
* **`/admin/login`** â€” FormulÃ¡rio de autenticaÃ§Ã£o de staff.
* **`/admin/orders`** â€” Monitor KDS de cozinha em tempo real, gaveta Quick Stock e alertas sonoros.
* **`/admin/orders/history`** â€” HistÃ³rico e arquivo com pesquisa e filtros combinados.
* **`/admin/analytics`** â€” Centro de comando executivo, matriz BCG, SLA, anÃ¡lise semÃ¢ntica e simulador What-If.

### DiagnÃ³stico & Testes
* **`/test`** â€” Rota de bancada para disparo e simulaÃ§Ã£o de pedidos controlados.

---

## 11. ValidaÃ§Ã£o de CÃ³digo e Qualidade

O repositÃ³rio cumpre integralmente os requisitos de compilaÃ§Ã£o estrita e linting:

```bash
# Executar anÃ¡lise estÃ¡tica de cÃ³digo com ESLint
npm run lint

# Executar verificaÃ§Ã£o de tipos TypeScript sem emitir ficheiros
npx tsc --noEmit

# Compilar build de produÃ§Ã£o Next.js (App Router + Turbopack)
npm run build
```

---

## 12. PolÃ­ticas de SeguranÃ§a e Boas PrÃ¡ticas

1. **PrincÃ­pio do Menor PrivilÃ©gio:** A chave privilegiada `service_role` nunca Ã© exposta no cliente nem em Server Actions com execuÃ§Ã£o de utilizador.
2. **Isolamento de Restaurante no Servidor:** Todas as consultas e mutaÃ§Ãµes administrativas filtram estritamente por `restaurant_id` resolvido via `getAuthenticatedStaff()`.
3. **ResiliÃªncia a DesconexÃµes:** Os hooks de subscriÃ§Ã£o em tempo real detetam automaticamente eventos de suspensÃ£o de ecrÃ£ (`visibilitychange`) e retoma de ligaÃ§Ã£o de rede (`online`), efetuando reconciliaÃ§Ãµes forÃ§adas com a base de dados.
4. **ResoluÃ§Ãµes Seguras de Custos:** Caso o custo de um produto nÃ£o esteja configurado, o motor de BI aplica estimativas com base em margens padrÃ£o da restauraÃ§Ã£o (32%), evitando divisÃµes por zero ou falhas de processamento.
5. **Estabilidade de Snapshot em SSR:** Todas as leituras locais de estado baseadas em `useSyncExternalStore` utilizam referÃªncias imutÃ¡veis de mÃ³dulo, prevenindo loops de re-renderizaÃ§Ã£o infinitos entre o servidor e o cliente.

---

## 13. Procedimento Seguro de Limpeza de Pedidos de Teste

Para repor o estado limpo da base de dados antes da entrada em operaç\u00e3o real, foi desenvolvido um procedimento transacional com c\u00f3pia de salvaguarda em supabase/migrations/20261015_clean_test_orders.sql.

> [!WARNING]
> A instruç\u00e3o DELETE FROM public.order_items; DELETE FROM public.orders; elimina **todos** os registos existentes nestas tabelas e n\u00e3o apenas pedidos de teste da Mesa 4. Os contadores de pedidos (estaurant_counters) e o cat\u00e1logo s\u00e3o preservados intactos.

### Protocolo de Execuç\u00e3o Segura:
1. **C\u00f3pia Recuper\u00e1vel Transit\u00f3ria:** Antes de qualquer remoç\u00e3o, o script arquiva automaticamente os registos em _backup_orders_20261015 e _backup_order_items_20261015.
2. **Verificaç\u00e3o de Contagens (Pr\u00e9 e P\u00f3s):** O bloco PL/pgSQL valida e imprime as contagens antes do DELETE e confirma se o total remanescente \u00e9 rigorosamente 0.
3. **Transacionalidade At\u00f3mica:** Todo o processo ocorre dentro de BEGIN ... COMMIT. Se ocorrer qualquer erro, \u00e9 executado ROLLBACK autom\u00e1tico.
4. **Estado Atual:** **PREPARADO LOCALMENTE (N\u00c3O EXECUTADO)**. Aguarda autorizaç\u00e3o e execuç\u00e3o manual via Supabase SQL Editor.

---

## 14. Seguran\u00e7a Supabase, RLS & Isolamento Multi-Tenant

Auditoria e refor\u00e7o de seguran\u00e7a formalizados na migraç\u00e3o supabase/migrations/20261015_security_audit_and_rls_hardening.sql:

### Matriz de Controlo de Acessos
| Tabela / Recurso | Utilizador An\u00f3nimo (Cliente) | Staff Autenticado (Pr\u00f3prio Restaurante) | Staff (Outro Restaurante) |
| :--- | :--- | :--- | :--- |
| estaurants | SELECT (Apenas se is_active = true) | SELECT / UPDATE (id = profile.restaurant_id) | Bloqueado |
| categories | SELECT (is_active = true de rest. ativo) | ALL (estaurant_id = profile.restaurant_id) | Bloqueado |
| products | SELECT (Colunas p\u00fablicas; **cost revogado**) | ALL (estaurant_id = profile.restaurant_id) | Bloqueado |
| 	ables | SELECT (is_active = true de rest. ativo) | ALL (estaurant_id = profile.restaurant_id) | Bloqueado |
| orders | Bloqueado para SELECT direto (Acesso via RPC get_public_order_status por UUID) | ALL (estaurant_id = profile.restaurant_id) | Bloqueado |
| order_items | Bloqueado para SELECT direto | ALL (order_id pertencente ao restaurante do staff) | Bloqueado |
| estaurant_counters | Bloqueado | SELECT (estaurant_id = profile.restaurant_id) | Bloqueado |

### Pontos Chave de Seguran\u00e7a Implementados:
* **Revogaç\u00e3o de Public Read Orders:** Eliminada a pol\u00edtica aberta USING (true) que expunha todos os pedidos a qualquer utilizador com a chave p\u00fablica.
* **RPC Segura de Estado de Pedido (get_public_order_status):** Clientes an\u00f3nimos s\u00f3 conseguem consultar o estado do seu pr\u00f3prio pedido se fornecerem o UUID exato retornado aquando da criaç\u00e3o, sem expor margens ou custos internos.
* **Proteç\u00e3o Column-Level de Custos:** A coluna cost de products foi omitida da projeç\u00e3o do menu p\u00fablico e o seu grant revogado para non.

---

## 15. Configuraç\u00e3o de Vari\u00e1veis de Ambiente & Produç\u00e3o

### Ficheiro Local (.env.local \u2014 Ignorado pelo Git):
`env
NEXT_PUBLIC_SUPABASE_URL=https://emjhabwmuvmjwshbkgvt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_8gy1y8hhb_fCnAz1brYe9Q_VrbpuV2u
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8gy1y8hhb_fCnAz1brYe9Q_VrbpuV2u
NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG=gulas
`

> [!NOTE]
> O c\u00f3digo suporta tanto NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY como NEXT_PUBLIC_SUPABASE_ANON_KEY. Ambas est\u00e3o alinhadas para a chave p\u00fablica v\u00e1lida. Chaves privilegiadas (service_role) n\u00e3o se encontram expostas nem s\u00e3o necess\u00e1rias no cliente.

### Requisitos para Produç\u00e3o (Vercel / Hosting Remoto):
Configurar nas vari\u00e1veis de ambiente do projeto (ambientes **Production** e **Preview**):
* NEXT_PUBLIC_SUPABASE_URL
* NEXT_PUBLIC_SUPABASE_ANON_KEY
* NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
* NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG

---

## 16. Tablet da Cozinha: PWA Manifest & Screen Wake Lock

### 1. Web App Manifest (src/app/manifest.ts)
* **Nome:** Gulas KDS \u2014 Monitor de Cozinha (short_name: Gulas KDS)
* **Rota Inicial:** /admin/orders (preserva autenticaç\u00e3o e redireciona para /admin/login se n\u00e3o autenticado)
* **Modo de Exibiç\u00e3o:** standalone em orientaç\u00e3o landscape (horizontal de bancada)
* **\u00cdcones Produzidos:** 
  * public/icons/icon-192x192.png (PNG v\u00e1lido 192x192)
  * public/icons/icon-512x512.png (PNG v\u00e1lido 512x512)
  * public/icons/apple-touch-icon.png (180x180 para iPadOS)
  * public/icons/icon.svg (Vetor SVG de alta definiç\u00e3o)

### 2. Screen Wake Lock (src/hooks/useScreenWakeLock.ts)
Integrado no componente OrderDashboard.tsx:
* Solicita o bloqueio de suspens\u00e3o de ecr\u00e3 (screen) de forma segura.
* Monitoriza mudan\u00e7as de visibilidade (isibilitychange) e recupera o lock automaticamente ao regressar \u00e0 p\u00e1gina.
* Trata o evento elease do sistema operativo sem quebrar a aplicaç\u00e3o.
* Compatibilidade com React Strict Mode (limpeza correta de listeners e sentinelas ass\u00edncronas na desmontagem).
* Indicador visual discreto e acess\u00edvel no topo do KDS com bot\u00e3o de comutaç\u00e3o / tentativa manual.

> [!IMPORTANT]
> **Limites T\u00e9cnicos do Wake Lock:**
> - Exige contexto seguro (HTTPS ou localhost).
> - N\u00e3o impede todas as formas de suspens\u00e3o geridas pelo sistema operativo (bateria cr\u00edtica, bot\u00e3o f\u00edsico de energia).
> - N\u00e3o bloqueia o tablet numa \u00fanica aplicaç\u00e3o. Para um Kiosk Mode completo na cozinha, deve ativar-se o modo "Fixar Aplicaç\u00e3o" (Android Pinning) ou "Acesso Guiado" (iPadOS Guided Access) nas definiç\u00f5es f\u00edsicas do tablet.

---

## 17. Registo de Testes e Validaç\u00e3o

* **Compilaç\u00e3o TypeScript (
px tsc --noEmit):** 0 erros.
* **An\u00e1lise Est\u00e1tica (
pm run lint):** 0 erros e 0 avisos.
* **Build de Produç\u00e3o (
pm run build):** Sucesso integral, incluindo rotas din\u00e2micas e rota est\u00e1tica /manifest.webmanifest.
* **Projeç\u00e3o de Dados:** Confirmada aus\u00eancia de exposiç\u00e3o de cost no menu digital p\u00fablico.
* **Testes em Dispositivo F\u00edsico:** Pendentes de validaç\u00e3o em tablet real de bancada na cozinha do restaurante.
* **Registo de Horas:** O controlo de horas do projeto deve ser atualizado com tempos reais ap\u00f3s validaç\u00e3o operacional.
