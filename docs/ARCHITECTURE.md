# DonorFlow: arquitetura e operacao

## 1. Visao geral

DonorFlow e um MVP de rastreabilidade de fundos com um ledger interno simulado. O sistema nao movimenta dinheiro real. A cadeia principal e:

```text
Donor -> Project -> Wallet -> SubWallet -> PaymentRequest -> Approval -> Transaction -> LedgerEntry -> Reports
```

A aplicacao tem tres perfis:

- **Donor:** cria projetos, financia carteiras, cria subcarteiras e aprova pedidos.
- **Recipient:** consulta projetos atribuidos e envia pedidos de pagamento.
- **Admin:** supervisiona utilizadores, projetos, fornecedores e logs de auditoria.

## 2. Tecnologias e motivo de uso

| Tecnologia | Camada | Motivo |
|---|---|---|
| React 19 | Frontend | Componentes reutilizaveis e estado de interface por perfil. |
| Vite | Frontend | Desenvolvimento rapido e build de producao simples. |
| Tailwind CSS 4 | Frontend | Estilos consistentes e responsivos com baixo acoplamento. |
| React Router | Frontend | Rotas publicas e protegidas por autenticacao. |
| Recharts | Frontend | Graficos de gastos no dashboard e nos relatorios. |
| Node.js + Express | Backend | API HTTP leve, organizada por rotas e middleware. |
| PostgreSQL | Dados | Relacoes, consistencia e suporte a valores `Decimal`. |
| Prisma | Persistencia | Schema declarativo, queries relacionais e cliente tipado em runtime. |
| bcryptjs | Seguranca | Hash das palavras-passe; nunca guardar palavra-passe em texto puro. |
| jsonwebtoken | Sessao | Tokens Bearer com expiracao para a autenticacao do MVP. |

## 3. Estrutura de pastas

```text
backend/
  prisma/schema.prisma       Schema Prisma oficial e fonte do modelo de dados
  prisma/seed.js              Dados de demonstracao idempotentes
  src/index.js                Entrada HTTP, CORS, middleware e montagem das rotas
  src/routes/                 Contrato HTTP, validacao basica e autorizacao
  src/services/               Regras de negocio e acesso ao Prisma
  src/middleware/             Autenticacao e tratamento de erros
  src/lib/                    Prisma, JWT e utilitarios transversais

frontend/
  src/main.jsx                Bootstrap React, Router e AuthProvider
  src/App.jsx                 Mapa de rotas e areas protegidas
  src/context/AuthContext.jsx Estado da sessao no navegador
  src/services/api.js         Cliente HTTP e conversao de erros
  src/components/             Layout, navegacao e componentes partilhados
  src/pages/                  Ecras por fluxo e perfil
  vite.config.js              Dev server e proxy /api

docs/
  ARCHITECTURE.md             Este guia operacional
  FILE_DESCRIPTIONS.md        Descricao resumida dos ficheiros
```

`backend/src/prisma/schema.prisma` existe, mas esta vazio e **nao e usado** pelo Prisma. Nao o editar como schema. O unico schema oficial e `backend/prisma/schema.prisma`.

## 4. Fluxo da aplicacao

### Arranque

1. `frontend/src/main.jsx` monta o React e o `AuthProvider`.
2. O frontend chama a API em `/api`; em desenvolvimento o Vite encaminha para `http://localhost:5000`.
3. `backend/src/index.js` carrega variaveis de ambiente, configura CORS, JSON, health checks e rotas.
4. Cada rota protegida passa por `authenticate`, que valida o JWT e recarrega o utilizador no banco.

### Autenticacao

- `POST /api/auth/register` cria o utilizador e devolve token.
- `POST /api/auth/login` compara a palavra-passe com bcrypt e devolve token.
- O frontend guarda o token em `localStorage` com a chave `donorflow_token`.
- O token expira em 7 dias.
- `authorize(...)` bloqueia perfis que nao tenham permissao para a rota.

### Fundos e pedidos

1. O donor cria um projeto.
2. O donor financia o projeto; essa primeira operacao cria a `Wallet` e grava um credito no ledger.
3. O donor cria `SubWallet` dentro da carteira.
4. O recipient cria um `PaymentRequest` para uma subcarteira valida.
5. `walletService.js` verifica saldo, limite, fornecedor, documento e compatibilidade de finalidade.
6. O donor aprova, rejeita ou congela o pedido.
7. Uma aprovacao cria `Transaction` e debito em `LedgerEntry`; rejeicao nao cria transacao.
8. Dashboards e relatorios calculam os totais a partir do ledger.

## 5. Modelo de dados

- **User:** identidade, email unico, hash da palavra-passe e papel.
- **Organization:** organizacoes supervisionadas pelo admin.
- **Project:** projeto, donor, recipient opcional, orcamento e estado.
- **Wallet:** uma carteira por projeto; regista moeda, estado e creditos.
- **SubWallet:** divisao de finalidade da carteira, com alocacao e limite de aprovacao.
- **Payee:** fornecedor ou beneficiario do pagamento e estado de verificacao.
- **PaymentRequest:** pedido do recipient ligado a projeto, subcarteira e payee.
- **Approval:** decisao do donor, comentario e data.
- **Transaction:** pagamento concluido ligado unicamente a um pedido.
- **LedgerEntry:** movimentos de credito/debito e referencia opcional a carteira, subcarteira e transacao.
- **AuditLog:** trilha de acoes importantes e seus dados resumidos.

Relacoes criticas:

```mermaid
flowchart LR
  U[User] -->|donor| P[Project]
  U -->|recipient| P
  P --> W[Wallet]
  W --> SW[SubWallet]
  SW --> PR[PaymentRequest]
  PR --> A[Approval]
  PR --> T[Transaction]
  T --> L[LedgerEntry]
  W --> L
  P --> AL[AuditLog]
```

Regras de integridade que devem ser preservadas:

- `Project` tem um donor e pode ter um recipient.
- `Wallet.projectId` e unico: um projeto nao pode ter duas carteiras.
- `SubWallet` pertence a uma `Wallet`.
- `PaymentRequest` deve apontar para uma subcarteira do mesmo projeto.
- `Transaction.paymentRequestId` e unico: um pedido nao deve ser pago duas vezes.
- Valores financeiros devem continuar como `Decimal` no banco; converter para `Number` apenas na resposta da API.
- Apos uma aprovacao, o debito e a transacao devem ser tratados como uma operacao atomica antes de evoluir o sistema para producao.

## 6. Ambiente e comandos

Backend `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
JWT_SECRET="use-a-long-random-secret"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

Frontend em desenvolvimento usa o proxy do `frontend/vite.config.js`. Em producao, definir `VITE_API_URL` com a URL publica da API, por exemplo `https://api.example.com/api`, ou configurar o servidor web para encaminhar `/api`.

Comandos locais:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Validacoes antes da apresentacao:

```bash
cd backend
npm run db:check

cd ../frontend
npm run build
```

`db:push` e adequado ao MVP/local. Para producao, usar migrations versionadas com `prisma migrate deploy`, apos criar e rever a primeira migration. Nao executar `prisma migrate reset` num banco de apresentacao ou producao.

## 7. Hospedagem

1. Criar PostgreSQL gerido e guardar `DATABASE_URL` apenas nos secrets do provedor.
2. Definir `JWT_SECRET` longo, aleatorio e diferente em cada ambiente.
3. Definir `FRONTEND_URL` com a origem exata do frontend para restringir CORS.
4. Backend: `npm install`, `npx prisma generate`, aplicar migrations e iniciar com `npm start`.
5. Frontend: definir `VITE_API_URL` antes de `npm run build` e publicar o diretorio `dist`.
6. Verificar `GET /api/health` e `GET /api/health/db` apos o deploy.
7. Nunca usar contas demo ou `password123` em ambiente publico.
8. O MVP usa `localStorage` para JWT; antes de um uso real, avaliar cookie HttpOnly, rate limiting, logging estruturado, validacao de payloads e headers de seguranca.

## 8. Arquivos que exigem mais cuidado

| Arquivo | Por que e sensivel |
|---|---|
| `backend/prisma/schema.prisma` | Altera tabelas, relacoes e tipos financeiros. Requer migration e revisao de dados. |
| `backend/src/services/walletService.js` | Calcula saldo, alocacao e regras financeiras. Um erro altera valores apresentados. |
| `backend/src/services/paymentService.js` | Cria pedidos, aprovacoes, transacoes e debitos. E o ponto mais critico do fluxo financeiro. |
| `backend/src/services/projectService.js` | Controla carteira, financiamento, subcarteiras e acesso a projetos. |
| `backend/src/middleware/auth.js` | Define autenticacao e permissoes por perfil. |
| `backend/src/lib/auth.js` | Define assinatura e validade dos tokens. |
| `backend/src/index.js` | Configura CORS, rotas, porta e health checks. |
| `frontend/src/context/AuthContext.jsx` | Mantem a sessao e o token do utilizador. |
| `frontend/src/services/api.js` | Define URL da API, headers e tratamento de erros. |
| `frontend/src/App.jsx` | Define rotas protegidas e superficies acessiveis por perfil. |
| `frontend/src/components/Layout.jsx` | Define sidebar, navegacao e logout para todos os perfis. |
| `frontend/vite.config.js` | Define proxy local; nao substitui configuracao de API em producao. |
| `backend/prisma/seed.js` | Pode inserir ou alterar dados usados na demonstracao; deve ser idempotente. |

Antes de alterar qualquer arquivo desta lista: executar `git diff`, entender o fluxo afetado, fazer uma mudanca pequena, rodar `npm run db:check` quando houver banco envolvido e rodar `npm run build` no frontend quando houver mudanca de interface.

## 9. Riscos conhecidos e proximos reforcos

- Nao existe suite automatizada de testes no projeto; o smoke test manual e essencial antes da apresentacao.
- O processamento de aprovacao deve ganhar uma transacao Prisma para evitar estado parcial se uma escrita falhar.
- As rotas aceitam validacao basica; adicionar schema validation (por exemplo Zod) antes de expor a API publicamente.
- O endpoint de registro permite criar o papel `admin`; em producao, a criacao de admins deve ser restrita.
- O CORS depende de uma origem configurada corretamente; revisar isso junto com o dominio publicado.
- O projeto usa `db:push` e nao possui migrations versionadas visiveis; estabelecer migrations antes de alterar o schema em producao.
- O frontend nao deve assumir que respostas de API sempre existem; manter estados de carregamento e erro ao adicionar novas telas.

Esta arquitetura e adequada para uma apresentacao e para um MVP controlado. Ela fica mais resistente quando as regras acima sao tratadas como contratos e cada mudanca e acompanhada por uma verificacao pequena e repetivel.
