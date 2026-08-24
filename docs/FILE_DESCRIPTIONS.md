**Visão Geral do Projeto DonorFlow**

Este documento descreve, por ficheiro e pasta, o propósito de cada parte do projeto, a arquitetura geral e os principais fluxos (autenticação, pagamentos, projetos, relatórios). Serve para que um desenvolvedor novo entenda como o sistema está organizado e como as peças interagem.

**Arquitetura Geral**
- **Monorepo** com duas aplicações separadas: `backend/` (API Node.js + Prisma) e `frontend/` (React + Vite).
- **Backend**: expõe endpoints REST em `src/routes/*`, implementa lógica de negócio em `src/services/*`, usa `src/lib/*` para utilitários e `prisma` para acesso ao BD.
- **Frontend**: React app com rotas/páginas em `src/pages/*`, componentes reutilizáveis em `src/components/*`, e `src/services/api.js` como cliente HTTP para a API.

**Como ler este ficheiro**
- Cada secção abaixo lista ficheiros por pasta com uma breve explicação do propósito, porque existe e como se relaciona com o resto do sistema. Os nomes de ficheiro são links para o código.

**Backend (descrição por ficheiro)**

- **`backend/src/index.js`**: Ponto de entrada da API. Configura servidor (Express), aplica middlewares globais (JSON parsing, CORS, logger), monta as rotas (`/auth`, `/payments`, `/projects`, `/reports`) e adiciona o `errorHandler`. É o orchestrador — inicia a ligação ao Prisma (se necessário) e faz `listen()`.

- **`backend/package.json`**: Declara dependências, scripts (start, dev, test). Importante para reproduzir ambiente e comandos para desenvolver/rodar a API.

- **`backend/.env.example`**: Exemplo de variáveis de ambiente necessárias (p.ex. `DATABASE_URL`, `JWT_SECRET`). Não deve conter segredos reais; serve como template para `backend/.env` local.

- **`backend/src/lib/prisma.js`**: Inicializa e exporta o cliente Prisma. Centralizar a criação do cliente evita múltiplas instâncias e facilita uso em serviços e scripts. Também pode conter lógica para fechar a conexão em testes/commands.

- **`backend/src/lib/auth.js`**: Funções utilitárias relacionadas com autenticação (p.ex. criação/validação de JWT, hashing de passwords). Usado pelos serviços de autenticação e pelo middleware `auth.js`.

- **`backend/src/lib/utils.js`**: Utilitários gerais (formatadores, helpers de validação, manipulação de erros). Serviços e controllers importam funções daqui para evitar duplicação.

- **`backend/src/middleware/auth.js`**: Middleware que protege rotas que requerem autenticação. Lê token (ex.: `Authorization: Bearer ...`), valida via `lib/auth.js` e injeta `req.user` ou retorna 401. Fundamental para fluxos protegidos (criar pedido, aprovar pagamentos, etc.).

- **`backend/src/middleware/errorHandler.js`**: Middleware final que capta erros lançados nas rotas e serviços e formata uma resposta JSON consistente (status, mensagem, detalhes em dev). Mantém consistência de erro em toda API.

- **`backend/src/routes/auth.js`**: Define endpoints de autenticação (login, register, refresh token se existir). Recebe requests, valida dados, chama `authService` para lógica e retorna tokens/usuário.

- **`backend/src/routes/payments.js`**: Endpoints públicos/protegidos para criação, listagem e aprovação de pedidos de pagamento. Recebe payload, checa permissões via `auth` middleware, e delega operações a `paymentService`.

- **`backend/src/routes/projects.js`**: Endpoints CRUD para `projects`. O `projectService` contém a lógica de negócio (criar projeto, associar budget, listar por utilizador, etc.).

- **`backend/src/routes/reports.js`**: Endpoints para geração e consulta de relatórios — agregações via Prisma, filtros por datas/projetos, e geração de dados prontos para o frontend exibir gráficos/tabelas.

- **`backend/src/services/authService.js`**: Implementa a lógica de autenticação (criar utilizador, validar credenciais, gerar tokens). Interage com Prisma para persistir/ler utilizadores e com `lib/auth.js` para manipular tokens.

- **`backend/src/services/paymentService.js`**: Lógica central dos pagamentos: criar pedido, validar fundos, transições de estado (pendente → aprovado → pago), notificações (se houver). É o núcleo do fluxo financeiro.

- **`backend/src/services/projectService.js`**: Regras de negócio sobre projetos: criar, atualizar orçamentos, relacionar doações/pedidos a projetos.

- **`backend/src/services/reportService.js`**: Funções que executam queries agregadas no banco (sum, count, groupBy) para compor dashboards e relatórios auditáveis.

- **`backend/src/services/walletService.js`**: Abstração da carteira (saldo, reservados, transações). Permite separar lógica financeira da lógica de pedidos/pagamentos.

- **`backend/prisma/schema.prisma`**: Esquema do banco Prisma — modela entidades (User, Project, PaymentRequest, Transaction, AuditLog). Muda sempre que o modelo de dados evolui; geram-se migrações.

- **`backend/prisma/seed.js`**: Script de seed (dados iniciais) usado para popular a DB em desenvolvimento (usuários de teste, projetos de exemplo, carteiras com saldo). Útil para testes manuais e demos.


**Frontend (descrição por ficheiro)**

- **`frontend/package.json`**: Dependências do React + scripts (`dev`, `build`, `preview`). Define comandos para arrancar a app localmente.

- **`frontend/vite.config.js`**: Configuração do Vite (alias, proxies). Pode conter proxy para `http://localhost:PORT/api` para evitar CORS em dev.

- **`frontend/index.html`**: Página HTML base carregada pelo Vite — contém o `div#root` onde a app React é montada.

- **`frontend/src/main.jsx`**: Inicialização do React — monta a app (`App.jsx`) em `#root`, injeta `AuthContext` e configura roteamento.

- **`frontend/src/App.jsx`**: Componente de topo que define rotas, layout global e proteções de rota (usando `ProtectedRoute.jsx`). Orquestra presença de `AuthContext` e renderiza as páginas.

- **`frontend/src/index.css`**: Estilos globais da aplicação.

- **`frontend/src/context/AuthContext.jsx`**: Contexto React responsável por guardar o estado de autenticação (token, user), fornecer funções `login`, `logout` e renovar token. Componentes consomem este contexto para saber se o usuário está autenticado e para exibir UI condicional.

- **`frontend/src/services/api.js`**: Cliente HTTP (ex.: `fetch` ou `axios`) configurado com baseURL para a API backend; injeta token Authorization nas requests e centraliza tratamento de erros e interceptors.

- **`frontend/src/components/Layout.jsx`**: Layout principal (nav, sidebar, footer). Usado por todas as páginas para manter consistência visual.

- **`frontend/src/components/ProtectedRoute.jsx`**: Componente wrapper que verifica `AuthContext` e redireciona para `LoginPage` se o utilizador não estiver autenticado.

- **`frontend/src/components/StatCard.jsx`**: Componente UI para mostrar métricas simples (total doações, saldo, pedidos pendentes) usados no dashboard.

- **`frontend/src/components/UI.jsx`**: Componentes UI genéricos (botões, modals, inputs) compartilhados entre páginas.

- **`frontend/src/pages/*`** (cada ficheiro): Páginas concretas que representam ecrãs da aplicação — `DashboardPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `ProjectsPage.jsx`, `ProjectDetailPage.jsx`, `PaymentRequestsPage.jsx`, `NewPaymentRequestPage.jsx`, `PayeesPage.jsx`, `TransactionsPage.jsx`, `ReportsPage.jsx`, `AuditLogsPage.jsx`, `ApprovalsPage.jsx`, `UsersPage.jsx`.
  - Cada página consome `api.js` para obter/dar post aos endpoints correspondentes e usa componentes do `components/` para UI.


**Fluxos Principais (resumo)**

- **Autenticação**: `LoginPage` envia credenciais a `POST /auth/login` -> `authService` valida via Prisma -> se OK gera JWT e devolve user + token -> `AuthContext` armazena token e user. Rotas protegidas verificam token com `auth` middleware que injeta `req.user`.

- **Criar pedido de pagamento**: Usuário autenticado submete formulário em `NewPaymentRequestPage` -> `POST /payments` -> `paymentService` valida, cria `PaymentRequest` e possivelmente reserva fundos no `walletService` -> notifica aprovadores (email/alerta) -> fluxo de aprovação segue manualmente por `ApprovalsPage`.

- **Aprovação e pagamento**: Aprovedor usa `ApprovalsPage` para aprovar -> `paymentService` atualiza estado para `approved` -> `walletService` realiza transação (cria `Transaction`, atualiza saldos) -> `reportService` regista no `AuditLog`.

- **Relatórios e auditoria**: `ReportsPage` pede dados agregados a `/reports` -> `reportService` executa queries agregadas no Prisma e devolve dados prontos para gráficos; `AuditLogs` guarda mudanças críticas (quem aprovou, quando, valores).


**Notas sobre como a lógica foi organizada (por que assim)**
- Separação Controller/Service: as `routes/*` apenas mappam endpoints e validam input básico; toda regra de negócio vive em `services/*` para facilitar testes e reutilização.
- `lib/*` contém funcionalidades transversais (auth, prisma client, utils) para evitar duplicação e acoplamento.
- Prisma como ORM: permite modelar o esquema em `schema.prisma` e gerar cliente tipado; facilita migrações e queries complexas.
- Frontend com Context: `AuthContext` centraliza estado de sessão evitando prop-drilling e simplifica `ProtectedRoute`.


**Segurança e boas práticas recomendadas**
- Nunca commitar ficheiros `.env` com segredos.
- Adicionar validação robusta do lado servidor (ex.: Joi/Zod) para todas as entradas.
- Implementar rate-limiting nas rotas públicas (login, register) e logging de auditoria para ações críticas.


**Próximos passos que eu posso executar**
- Gerar documentação mais detalhada por ficheiro (extrair funções e comentar dentro de cada ficheiro). (Posso fazer isto automático para ficheiros JS/JSX se desejares.)
- Criar `docs/ARCHITECTURE.md` com diagramas e sequência de chamadas (posso incluir Mermaid).
- Adicionar um `CONTRIBUTING.md` com fluxo Git (feature branches, PRs, CI).

Se queres, começo por gerar documentação detalhada automaticamente para cada ficheiro JS/JSX e adiciono comentários no repositório. Indica-me qual opção preferes.
