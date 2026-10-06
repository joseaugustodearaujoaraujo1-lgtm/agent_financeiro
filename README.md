# Agente financeiro

API de agente de IA que consulta informações de ações pela brapi e mantém o histórico de cada conversa em um banco MySQL.

## Tecnologias

JavaScript, Node.js, Express, LangChain, OpenRouter, Groq, MySQL, mysql2, Axios, Zod, Morgan e dotenv.

## Como iniciar

1. Tenha Node.js, npm e um servidor MySQL disponíveis.
2. Clone o projeto e instale os pacotes:

```bash
git clone https://github.com/joseaugustodearaujoaraujo1-lgtm/agent_financeiro.git
cd agent_financeiro
npm install
```

3. Execute o arquivo `database.sql` no MySQL Workbench ou em outro cliente MySQL. Ele cria o banco `agent_financeiro` e as tabelas.
4. Copie `.env.example` para `.env` e preencha:
   - `PORT_SERVER`: porta da API, por exemplo `3001`.
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_DATABASE`: conexão MySQL.
   - `API_ROUTER`, `API_GROQ` e `BRAPI_TOKEN`: credenciais dos serviços.
   - `OPENROUTER_MODELO_1` até `OPENROUTER_MODELO_4`: modelos disponíveis na sua conta.
5. Inicie:

```bash
npm run dev
```

Também é possível executar com `node main.js`.

## Como testar

Com `PORT_SERVER=3001`, envie um `POST` para `http://localhost:3001/conversa/teste`, com `Content-Type: application/json`:

```json
{
  "pergunta": "O que é um dividendo?"
}
```

O nome no endereço identifica a conversa. Para consultar o histórico, use `GET /conversa/teste/historico`.

As respostas e consultas dependem da disponibilidade dos modelos e das APIs configuradas.
