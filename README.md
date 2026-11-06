# Gulas Platform

Plataforma integrada de menu digital, gestão de pedidos em sala e take-away, e monitor de cozinha em tempo real (Kitchen Display System), desenvolvida para a operação do restaurante Gulas em Vila das Aves, Portugal.

Construída sobre Next.js 16 (App Router), React 19, TypeScript e Supabase (PostgreSQL com Row Level Security e Realtime).

---

## Funcionalidades Principais

### Menu Digital e Pedidos
* Interface otimizada para dispositivos móveis com catálogo visual de produtos, filtros por categoria e pesquisa em tempo real.
* Suporte a pedidos no restaurante com identificação ou bloqueio de mesa via leitura de QR Code.
* Suporte a pedidos de Take-Away com recolha de dados de cliente para levantamento ao balcão.
* Validação rigorosa de disponibilidade de artigos antes da submissão do carrinho.

### Monitor de Cozinha (KDS)
* Painel operacional em tempo real concebido para tablets e ecrãs de cozinha, com suporte a ecrã inteiro nativo.
* Temporizadores dinâmicos com código de alerta visual para controlo de tempos de preparação (SLA).
* Agrupamento consolidado de artigos para otimização da preparação em bancada.
* Modo escuro de alto contraste concebido para ambientes de confeção.
* Alertas sonoros sintetizados via Web Audio API e suporte a manutenção de ecrã ativo (Screen Wake Lock).
* Gaveta de gestão rápida de stock (Quick Stock) para esgotar ou reativar artigos com um toque.

### Acompanhamento em Direto (Live Order Tracking)
* Barra flutuante e modal interativo com atualização em tempo real do estado do pedido para o cliente.
* Persistência local e suporte a múltiplos pedidos sequenciais no mesmo dispositivo.
* Consulta protegida por credencial temporária de rastreio (tracking token).

### Histórico e Relatórios
* Registo cronológico completo de pedidos concluídos e cancelados.
* Filtros combinados por estado, mesa, tipo de serviço (sala ou take-away) e intervalo temporal.
* Modal de inspeção com discriminação de artigos, preços unitários e registo temporal.
* Mecanismo de reversão rápida de pedidos marcados como concluídos.

### Inteligência de Negócio e Análise (BI)
* Painel executivo com métricas de faturação, ticket médio e tempo médio de preparação.
* Matriz BCG para classificação de rentabilidade e popularidade do menu.
* Análise de combinações frequentes de artigos (Market Basket Analysis).
* Histograma de distribuição de pedidos por hora do dia.
* Simulador preditivo de ajuste de preços com elasticidade de procura.
* Exportação de dados operacionais em formato CSV compatível com folhas de cálculo.

---

## Arquitetura e Segurança

* **Zero-Trust Frontend:** O cliente apenas envia identificadores de produto e quantidades. Todos os preços, cálculos monetários e validações de catálogo são efetuados no servidor com precisão relacional.
* **Transações Atómicas:** A criação do pedido é executada através da função PostgreSQL transacional `create_order_atomic`, assegurando a inserção íntegra do cabeçalho e linhas ou cancelamento total em caso de erro.
* **Segurança por Defeito (RLS):** Todas as tabelas possuem Row Level Security ativado. Consultas diretas e mutações não autorizadas são bloqueadas ao nível da base de dados.
* **Controlo de Acessos Administrativos:** Sessões protegidas com verificação de perfil de colaborador (`owner`, `manager`, `staff`) através de cookies HttpOnly assinados.
* **Resiliência de Rede:** Mecanismo de reconciliação de estado após perda temporária de ligação à internet ou suspensão de ecrã do dispositivo.

---

## Stack Tecnológica

* **Framework:** Next.js 16 (App Router com Turbopack)
* **Linguagem:** TypeScript 5
* **Interface:** React 19
* **Estilização:** Tailwind CSS v4
* **Base de Dados:** PostgreSQL 15+ (Supabase)
* **Comunicação em Tempo Real:** Supabase Realtime (WebSockets)
* **Validação de Dados:** Zod
* **Iconografia:** Lucide React

---

## Estrutura do Projeto

```text
gulas/
├── src/
│   ├── actions/
│   │   ├── analytics.ts             # Processamento de métricas e exportação de relatórios
│   │   ├── auth.ts                  # Autenticação e gestão de sessão de colaboradores
│   │   ├── order-management.ts      # Ações do KDS, histórico e reversão de pedidos
│   │   ├── orders.ts                # Submissão pública de pedidos e consulta de estado
│   │   └── product-stock.ts         # Controlo rápido de disponibilidade de artigos
│   ├── app/
│   │   ├── admin/
│   │   │   ├── (protected)/
│   │   │   │   ├── layout.tsx       # Layout restrito a colaboradores autenticados
│   │   │   │   ├── analytics/       # Centro de inteligência de negócio
│   │   │   │   └── orders/          # Monitor KDS e histórico de pedidos
│   │   │   ├── login/               # Autenticação de staff
│   │   │   └── layout.tsx           # Layout base da administração
│   │   ├── menu/
│   │   │   └── [restaurantSlug]/    # Menu digital público e rotas com mesa fixa
│   │   ├── globals.css              # Configuração global de estilos e temas
│   │   ├── layout.tsx               # Layout raiz com provedores de contexto
│   │   ├── manifest.ts              # Manifesto PWA para instalação em tablet
│   │   └── page.tsx                 # Página de apresentação do restaurante
│   ├── components/
│   │   ├── admin/                   # Componentes do monitor KDS, histórico e BI
│   │   ├── menu/                    # Componentes do menu digital, carrinho e rastreio
│   │   └── ui/                      # Componentes visuais utilitários
│   ├── context/
│   │   └── CartContext.tsx          # Gestão de estado do carrinho de compras
│   ├── data/
│   │   ├── gulasCatalog.ts          # Definição tipada do catálogo oficial
│   │   └── mockRestaurant.ts        # Dados de contingência e formatação monetária
│   ├── hooks/
│   │   ├── useActiveOrderTracker.tsx # Sincronização do estado de pedidos do cliente
│   │   ├── useKdsAlerts.ts          # Síntese de áudio e vibração para novos pedidos
│   │   ├── useOrdersRealtime.ts     # Subscrição WebSockets para o KDS
│   │   ├── useOrderTimer.ts         # Cálculo reativo do tempo de espera
│   │   └── useScreenWakeLock.ts     # Prevenção de suspensão de ecrã em tablets
│   ├── lib/
│   │   ├── auth/                    # Validação de perfil de colaboradores
│   │   ├── supabase/                # Clientes Supabase para browser e servidor
│   │   └── validations/             # Esquemas de validação de formulários e pedidos
│   ├── services/
│   │   └── restaurantService.ts     # Consulta de catálogo e detalhes de restaurante
│   └── types/
│       └── restaurant.ts            # Tipos e interfaces centrais da aplicação
├── supabase/
│   ├── migrations/                  # Ficheiros SQL de migração de esquema e funções
│   ├── manual_procedures/           # Scripts de manutenção e arquivo seguro
│   └── seed.sql                     # Carga inicial de dados
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Instalação e Execução

### Pré-requisitos
* Node.js versão 18.17 ou superior
* npm versão 9 ou superior
* Instância ativa do Supabase (Cloud ou local via CLI)

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/Midi-8/gulas.git
cd gulas
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie o ficheiro `.env.local` na raiz do projeto com as credenciais da instância Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://exemplo-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=exemplo-chave-publica-anonima
NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG=gulas
```

### 3. Executar em Ambiente de Desenvolvimento
```bash
npm run dev
```

A aplicação fica acessível no endereço `http://localhost:3000`.

### 4. Compilação para Produção
```bash
# Verificação estática de tipos
npx tsc --noEmit

# Verificação de padrões de código
npm run lint

# Compilação da aplicação Next.js
npm run build

# Execução em modo de produção
npm start
```

---

## Rotas Principais

### Área do Cliente
* `/` — Página inicial de apresentação do restaurante, especialidades e opções de serviço.
* `/menu/gulas` — Menu digital oficial com seleção livre de mesa ou take-away.
* `/menu/gulas/table/[numero]` — Menu digital com mesa bloqueada por leitura de QR Code.

### Área Administrativa (Acesso Restrito)
* `/admin/login` — Autenticação de funcionários e gerência.
* `/admin/orders` — Monitor de cozinha em tempo real (KDS), gestão de stock e alertas.
* `/admin/orders/history` — Histórico consolidado de pedidos com filtros avançados.
* `/admin/analytics` — Painel executivo de indicadores de negócio, rentabilidade e simulação.

---

## Licença

Projeto desenvolvido para Gulas — Pizza, Burger & Coffee (Vila das Aves, Portugal). Todos os direitos reservados.
