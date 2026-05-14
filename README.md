#Gestão de Clientes e Pedidos

Aplicação fullstack para gerenciar **clientes** e **pedidos**, com validações de negócio, regras de domínio (CPF válido, idade mínima de 18 anos, pedido com pelo menos um item, total recalculado pelo servidor, edição bloqueada após 24 horas da criação) e catálogo de produtos.

Desenvolvida como desafio técnico. Backend em C#/.NET 8, frontend em Angular, banco PostgreSQL no Supabase, deploy do backend no Render e frontend na Vercel.

---

## Sumário

1. [Stack e arquitetura](#stack-e-arquitetura)
2. [Pré-requisitos](#pré-requisitos)
3. [Estrutura do repositório](#estrutura-do-repositório)
4. [Como rodar localmente](#como-rodar-localmente)
5. [Como usar o sistema](#como-usar-o-sistema)
6. [Endpoints da API](#endpoints-da-api)
7. [Testes](#testes)
8. [Deploy](#deploy-em-produção)
9. [Troubleshooting](#troubleshooting)
10. [Decisões técnicas](#decisões-técnicas)

---

## Stack e arquitetura

| Camada | Tecnologia |
|---|---|
| Backend | C# .NET 8, ASP.NET Core Web API, **Clean Architecture leve** (Domain / Application / Infrastructure / Api) |
| ORM | Entity Framework Core 8 + Npgsql |
| Validação | FluentValidation no boundary + invariantes no domínio |
| Logging | Serilog |
| Banco | PostgreSQL 17 hospedado no **Supabase** |
| Frontend | Angular 18 standalone components, signals, RxJS |
| UI | Tailwind CSS + PrimeNG 17 (lara-light-blue) |
| Container | Docker multi-stage para o backend |
| Deploy Backend | Render.com (free tier) |
| Deploy Frontend | Vercel |
| Testes | xUnit + FluentAssertions (49 testes unitários) |

Diagrama em alto nível:

```
Browser (Angular SPA)  ─HTTPS──►  Render (.NET API)  ─PG SSL──►  Supabase Postgres
   (Vercel CDN)                     (Docker)                       (us-west-2)
```

---

## Pré-requisitos

Para rodar localmente você precisa:

| Ferramenta | Versão | Link |
|---|---|---|
| **.NET SDK** | 8.0+ | https://dotnet.microsoft.com/download/dotnet/8.0 |
| **Node.js** | 20 LTS+ | https://nodejs.org/ |
| **Git** | qualquer recente | https://git-scm.com/ |
| Docker (opcional) | só pra testar o build do backend antes do deploy | https://www.docker.com/products/docker-desktop |

Acesso a um PostgreSQL — pode ser o do Supabase (recomendado), ou um local.

Para deploy você vai precisar de contas gratuitas em:
- **GitHub** (hospedar o código)
- **Supabase** (banco gerenciado)
- **Render** (backend)
- **Vercel** (frontend)

---

## Estrutura do repositório

```
desafiomt/
├── backend/
│   ├── DesafioMt.sln
│   ├── src/
│   │   ├── DesafioMt.Domain/          Entidades (Customer, Order, OrderItem, Product),
│   │   │                              Value Objects (Cpf, Address), DomainException
│   │   ├── DesafioMt.Application/     Use Cases (Services), DTOs, Validators (FluentValidation),
│   │   │                              Abstrações dos repositórios
│   │   ├── DesafioMt.Infrastructure/  EF Core DbContext, Configurations, Repositórios
│   │   └── DesafioMt.Api/             Controllers, Program.cs, Middleware de exceções, Swagger
│   ├── tests/
│   │   └── DesafioMt.Tests/           49 testes unitários (domínio e regras)
│   ├── Dockerfile                     Build multi-stage para Render
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── models/            interfaces (Customer, Order, Product...)
│   │   │   │   ├── services/          HttpClient services + LayoutService (menu mobile) + CepService (ViaCEP)
│   │   │   │   ├── utils/             formatadores
│   │   │   │   └── validators/        validators reativos (CPF, idade)
│   │   │   ├── layout/                main-layout + sidebar + topbar (responsivo, hamburger no mobile)
│   │   │   └── features/
│   │   │       ├── clientes/          list, detail, form
│   │   │       └── pedidos/           list, detail, form (com modal de item)
│   │   ├── environments/
│   │   │   ├── environment.ts             produção (URL do Render)
│   │   │   └── environment.development.ts dev (http://localhost:5036)
│   │   └── styles.scss                Tailwind + overrides PrimeNG
│   ├── vercel.json                    SPA rewrite + headers
│   ├── tailwind.config.js
│   └── angular.json
├── database/
│   └── schema.sql                     Script PostgreSQL para criar todas as tabelas do zero
├── render.yaml                        Blueprint que configura o serviço no Render automaticamente
└── README.md
```

---

## Como rodar localmente

Cinco minutos do clone à aplicação funcionando.

### 1. Clonar o repositório

```bash
git clone <URL-DO-SEU-REPO>
cd desafiomt
```

### 2. Configurar o banco

Você tem três opções:

**Opção A — Supabase (recomendado, mais rápido):**

1. Crie uma conta em https://supabase.com e um projeto novo
2. No SQL Editor do dashboard, rode o conteúdo de [`database/schema.sql`](database/schema.sql)
3. Em **Project Settings → Database → Connection string**, copie a "Session pooler" (porta 5432). Vai ser algo como:
   ```
   postgresql://postgres.SEU_PROJECT_REF:SUA_SENHA@aws-1-us-west-2.pooler.supabase.com:5432/postgres
   ```

**Opção B — PostgreSQL local:**

```bash
psql -U postgres -d desafiomt -f database/schema.sql
```

**Opção C — Docker local:**

```bash
docker run -d --name desafiomt-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17
docker exec -i desafiomt-pg psql -U postgres -d postgres < database/schema.sql
```

### 3. Configurar a connection string do backend

Crie o arquivo `backend/src/DesafioMt.Api/appsettings.Development.json` (ignorado pelo git) com:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-1-us-west-2.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.SEU_PROJECT_REF;Password=SUA_SENHA;SslMode=Require;Trust Server Certificate=true"
  }
}
```

Formato Npgsql; ajuste host/usuário/senha conforme a opção que escolheu.

### 4. Rodar o backend

```bash
cd backend
dotnet restore
dotnet run --project src/DesafioMt.Api
```

API sobe em **http://localhost:5036**.

Validar que está OK:

- http://localhost:5036/health → `{"status":"ok",...}`
- http://localhost:5036/health/db → `{"db":"ok","serverVersion":"17.x"}`
- http://localhost:5036/swagger → documentação interativa

### 5. Rodar o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm start
```

Aplicação sobe em **http://localhost:4200** e abre automaticamente.

Pronto. Você deve ver a listagem de clientes (vazia se o banco está limpo).

### 6. (Opcional) Seed de dados de exemplo

O `database/schema.sql` cria só a estrutura. Se quiser popular com dados de teste, use a UI:

- **Clientes**: na tela `/clientes/novo`, preencha. Use CPFs válidos como `111.444.777-35`, `529.982.247-25`, `390.533.447-05`.
- **Produtos**: o catálogo de produtos vem vazio. Insira via SQL:
  ```sql
  INSERT INTO produtos (name, unit_price) VALUES
    ('Caneta Esferográfica Azul', 2.50),
    ('Caderno 200 folhas', 28.90),
    ('Mouse USB', 39.90);
  ```
- **Pedidos**: cadastre via tela `/pedidos/novo`.

---

## Como usar o sistema

### Clientes

- **/clientes** — listagem com paginação (10 por página, opções 10/25/50), busca por nome em tempo real, contador total
- **/clientes/novo** — formulário com:
  - Nome, CPF (máscara automática, validação de checksum), E-mail, Data de nascimento (idade ≥ 18)
  - Endereço com **CEP-first**: digite o CEP, ele consulta o ViaCEP e preenche Rua/Bairro/Cidade/UF automaticamente; foco vai para Número
- **/clientes/{id}** — detalhe: dados pessoais, endereço, card com total gasto e listagem dos pedidos
- **/clientes/{id}/editar** — mesma tela do novo, com dados carregados
- **Excluir** — botão na listagem; bloqueado se o cliente tem pedidos (HTTP 409)

### Pedidos

- **/pedidos** — listagem com filtros (nome do cliente em tempo real, intervalo de datas) e paginação. Mostra na faixa azul o **total filtrado** (soma de todos pedidos da busca corrente)
- **/pedidos/novo** — formulário com:
  - Cliente (dropdown com busca por nome ou CPF)
  - Data do pedido (datetime-local em horário de Brasília)
  - Itens: clique "+ Adicionar item" para abrir o modal — escolha produto do catálogo (com busca), defina quantidade e preço de venda. O preço de tabela vem do catálogo automaticamente; você pode dar desconto/acréscimo editando "Preço Venda"
- **/pedidos/{id}** — detalhe com lista de itens e indicadores de desconto/acréscimo
- **/pedidos/{id}/editar** — só permitido **dentro de 24h** da criação. Depois disso, o botão Editar fica desabilitado tanto na lista quanto no detalhe; tentativa de PUT retorna **HTTP 409 Conflict** mesmo se chamada direto na API

### Regras de negócio resumidas

| Regra | Onde é validada |
|---|---|
| CPF único e válido (checksum) | Front + FluentValidation + Domain VO + UNIQUE no banco |
| E-mail formato + único | Front + FluentValidation + Domain + UNIQUE no banco |
| Idade ≥ 18 | Front + FluentValidation + Customer.SetBirthDate |
| Pedido com pelo menos 1 item | Front (modal Adicionar) + FluentValidation + Order.ctor/Update |
| Total recalculado pelo servidor | Order.RecalculateTotal + CHECK no banco (subtotal=qty*sold_price) |
| Edição bloqueada após 24h | Front (UX) + Order.CanBeModified retorna 409 |
| Nome/preço de tabela do item vem do catálogo | OrderService.BuildItemsAsync (sobrescreve dto.UnitPrice e dto.ProductName quando há productId) |
| Cliente com pedidos não pode ser excluído | CustomerService + FK ON DELETE RESTRICT |

---

## Endpoints da API

Todas as rotas devolvem JSON. Erros seguem RFC 7807 (`application/problem+json`).

### Clientes
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/customers?name=&page=&pageSize=` | Lista com filtro por nome e paginação |
| GET | `/api/customers/{id}` | Detalhe |
| POST | `/api/customers` | Cria |
| PUT | `/api/customers/{id}` | Atualiza |
| DELETE | `/api/customers/{id}` | Remove (409 se tem pedidos) |
| GET | `/api/customers/{id}/total-spent` | Soma de todos os pedidos do cliente |

### Pedidos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/orders?customerId=&customerName=&from=&to=&page=&pageSize=` | Lista filtrada (datas no fuso BRT) |
| GET | `/api/orders/{id}` | Detalhe com itens |
| POST | `/api/orders` | Cria |
| PUT | `/api/orders/{id}` | Atualiza (409 se >24h) |

### Produtos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/products?name=` | Lista do catálogo (filtro por nome) |

### Saúde
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/health/db` | Testa conexão com o banco |
| GET | `/swagger` | Documentação interativa Swagger UI |

### Códigos de status
- **200** — sucesso (GET, PUT)
- **201** — criado (POST)
- **204** — sucesso sem conteúdo (DELETE)
- **400** — validação falhou ou regra de domínio violada
- **404** — recurso não encontrado
- **409** — conflito (duplicado, ou pedido > 24h)
- **500** — erro inesperado (sempre logado)

Exemplo de erro de validação:
```json
{
  "title": "Validação falhou",
  "status": 400,
  "detail": "Um ou mais campos são inválidos.",
  "errors": {
    "Cpf": ["CPF é obrigatório."],
    "Email": ["E-mail inválido."]
  }
}
```

---

## Testes

```bash
cd backend
dotnet test
```

Esperado: **49 testes verdes** cobrindo:
- CPF: formato, dígitos, all-same, checksum, formatação
- Customer: nome obrigatório, e-mail válido, idade ≥ 18, update
- Order: pelo menos 1 item, recálculo do total, janela das 24h
- OrderItem: subtotal a partir de sold_price, preços não negativos, qty > 0

---

## Deploy em produção

Ordem recomendada (sequência importa porque o frontend precisa saber o URL do backend):

```
GitHub → Supabase → Render (backend) → Vercel (frontend) → ajuste CORS se preciso
```

### Passo 1 — GitHub

1. Crie um repositório novo (público ou privado) em https://github.com/new — sem README/license/.gitignore (o projeto já tem)
2. No terminal:

```bash
cd c:\Projetos\desafiomt
git init -b main
git add .
git commit -m "Versão inicial do projeto"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

### Passo 2 — Supabase (se ainda não fez)

1. Crie projeto em https://supabase.com (região `us-west-2` — Oregon, mesma do Render para minimizar latencia) e defina uma senha forte (anote)
2. No SQL Editor, cole e execute o conteúdo de [`database/schema.sql`](database/schema.sql)
3. Em **Project Settings → Database → Connection string**, copie a **Session pooler** (porta 5432):
   ```
   postgresql://postgres.PROJECT_REF:SUA_SENHA@aws-1-us-west-2.pooler.supabase.com:5432/postgres
   ```

### Passo 3 — Render (backend)

1. Acesse https://render.com e faça login com o GitHub
2. **New → Blueprint** e selecione o repositório. O Render lê o [`render.yaml`](render.yaml) e cria o serviço automaticamente como Web Service Docker, com root directory `backend`
3. Confirme a criação. O Render começa o primeiro deploy.
4. Vá no serviço criado em **Environment** e adicione a variável secreta:
   - **Key**: `ConnectionStrings__DefaultConnection`
   - **Value**: `Host=aws-1-us-west-2.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.PROJECT_REF;Password=SUA_SENHA;SslMode=Require;Trust Server Certificate=true`

   Use o formato Npgsql (não o URI do passo 2 — converta separando por `;`).

5. Aguarde o deploy completar (5 a 10 min na primeira vez). O Render gera um URL tipo `https://desafiomt-api.onrender.com`
6. Valide:
   - `https://desafiomt-api.onrender.com/health` → 200
   - `https://desafiomt-api.onrender.com/health/db` → `{"db":"ok",...}`
   - `https://desafiomt-api.onrender.com/swagger` → UI carrega

### Passo 4 — Atualizar URL do backend no frontend

Edite [`frontend/src/environments/environment.ts`](frontend/src/environments/environment.ts) e troque o `apiUrl` pelo URL real do Render obtido no passo 3:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://desafiomt-api.onrender.com'  // seu URL aqui
};
```

Faça commit e push:

```bash
git add frontend/src/environments/environment.ts
git commit -m "Configurar URL do backend de produção"
git push
```

### Passo 5 — Vercel (frontend)

1. Acesse https://vercel.com e faça login com o GitHub
2. **Add New → Project** e selecione o repositório
3. Configurações na tela de import:
   - **Framework Preset**: Other (o `vercel.json` cuida do resto)
   - **Root Directory**: `frontend` (clicar em "Edit" e selecionar)
   - **Build Command**: `npm run build` (já no `vercel.json`)
   - **Output Directory**: `dist/frontend/browser` (já no `vercel.json`)
   - **Install Command**: `npm install`
4. Clique em **Deploy**. Leva ~2 minutos
5. URL final tipo `https://SEU_REPO.vercel.app`. Toda push na main gera novo deploy.

### Passo 6 — CORS

O backend já libera `https://*.vercel.app` por padrão (`render.yaml`), então o front da Vercel funciona de imediato. Se você usar domínio customizado, edite no Render a variável `Cors__AllowedOrigins__0` com o domínio exato.

### Passo 7 — Smoke test final

1. Abra o URL da Vercel no navegador
2. Vá em Clientes → Adicionar — cadastre um cliente
3. Vá em Pedidos → Adicionar — cadastre um pedido
4. Confira o detalhe e listagem
5. Tente excluir o cliente (deve dar 409 porque tem pedido)

Pronto, aplicação publicada.

---

## Troubleshooting

| Sintoma | Causa | Solução |
|---|---|---|
| `health/db` retorna 500 "Tenant or user not found" | URL do pooler errada | Confira a região (`aws-1-us-west-2` vs `aws-0`) — pegue do dashboard do Supabase |
| Backend dá timeout no primeiro acesso | Render free tier hiberna após 15min sem requisições | Primeiro request leva ~30s. Normal. |
| CORS bloqueado no frontend | Vercel usou domínio fora de `*.vercel.app` | Adicione o domínio em `Cors__AllowedOrigins__0` no Render |
| Frontend mostra erro de rede após deploy | URL no `environment.ts` errada | Confira que aponta para o URL exato do Render (sem `/api` no final) |
| `dotnet ef` não funciona localmente | Tool não instalada | `dotnet tool install --global dotnet-ef` (não é estritamente necessário; usamos `schema.sql`) |
| Build falha no Docker | Diretório `bin/` ou `obj/` vazado | Confira que o `.dockerignore` está presente |
| TypeScript Server mostra erro fantasma | Cache do VSCode | `Ctrl+Shift+P` → "TypeScript: Restart TS Server" |

---

## Decisões técnicas

Pontos onde escolhas não-óbvias foram tomadas — explicações curtas:

- **Clean Architecture leve** em vez de Vertical Slice ou Onion completo. Quatro projetos (Domain/Application/Infrastructure/Api) é o suficiente para isolar regras de negócio, evitando over-engineering em um sistema de porte pequeno.
- **CPF persistido como string** (não Value Object via `HasConversion`). Isso evita problemas de tradução LINQ ao filtrar por CPF em queries. O Value Object `Cpf` é usado apenas no construtor de `Customer` como validador.
- **Conexão direta vs pooler do Supabase**: a string de conexão usa o **pooler session mode (porta 5432)** porque o Render não tem IPv6 e a conexão direta exige IPv6. O transaction pooler (6543) também não funciona com EF Core por causa de prepared statements.
- **Datas em UTC no banco**, conversão para BRT no display. Os filtros de data do `/api/orders` recebem datas calendário e são convertidos para um range `[from 00:00 BRT, +1day 00:00 BRT)` em UTC para query.
- **product_id como FK opcional** em `order_items`: permite manter histórico mesmo se um produto for removido do catálogo no futuro.
- **Defesa em profundidade**: nome e preço de tabela do item são sobrescritos pelo servidor a partir do catálogo (`OrderService.BuildItemsAsync`), impedindo que um cliente HTTP malicioso fabrique valores diferentes do `produtos.unit_price` real.
- **RLS habilitado sem políticas** no Supabase. O backend conecta via role `postgres` que bypassa RLS; isso é uma camada extra de proteção caso a anon key vaze (PostgREST seria bloqueado).
- **45-50 testes unitários** focados em regras de domínio, não em integração. Testes de banco passam pelo CI de fato com qualquer Postgres real ao rodar a aplicação.

---

## Keep-alive para evitar hibernação (free tier)

O Render desliga o serviço gratuito após 15 minutos sem requisições. Para evitar que o avaliador (ou um usuário) pegue um cold start de 30-60 segundos na primeira abertura, configure um ping externo que mantenha o backend acordado.

**Setup com [cron-job.org](https://cron-job.org) (gratuito, ~3 minutos):**

1. Crie uma conta em https://cron-job.org
2. **Create cronjob** com:
   - **Title**: `Keep-alive desafiomt`
   - **URL**: `https://desafiomt-api.onrender.com/health`
   - **Schedule**: a cada 10 minutos (`*/10 * * * *`)
3. **Save** e **Enable**
4. Após o primeiro ciclo, confira no painel que a coluna "Last execution" mostra `200 OK`

Com isso o serviço permanece sempre quente e a aplicação responde instantaneamente. Como salvaguarda, o frontend ainda implementa:

- **Probe automático no boot** que aguarda o `/health/db` responder antes de liberar a UI (mostra overlay)
- **Pre-flight no submit** de cliente/pedido — antes de POST/PUT, espera o backend confirmar que está pronto. Sem isso, uma requisição em servidor hibernando podia criar registro mas perder a resposta na rede, gerando "409 CPF já existe" no retry

## Aplicação publicada

- **Frontend**: _(preencher após deploy)_
- **Backend**: _(preencher após deploy)_

---

## Licença

Projeto desenvolvido como desafio técnico. Uso livre para avaliação.
