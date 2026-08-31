# Shopping Agent

An AI shopping assistant. React + Vite frontend, Express + SQLite backend,
with a Groq-powered LLM (Llama 3.3 70B) doing the intent extraction /
clarifying-question logic.

## Project structure

```
shopping-agent/
├── src/            # React frontend (Vite)
├── server/         # Express API + SQLite backend
```

## 1. Get a Groq API key

Sign up / log in at https://console.groq.com and create an API key
(Groq has a generous free tier, no credit card needed to start).

## 2. Backend setup

```bash
cd server
cp .env.example .env
# edit .env and paste your key into GROQ_API_KEY

npm install
npm run seed     # populates SQLite with the sample product catalog
npm run dev       # starts the API locally for backend development
```

Backend env vars (`server/.env`):

| Var          | Default                     | Notes                                   |
|--------------|------------------------------|------------------------------------------|
| `PORT`       | `4000`                      | API port                                 |
| `GROQ_API_KEY` | —                          | **Required.** Your Groq API key          |
| `GROQ_MODEL` | `llama-3.3-70b-versatile`   | Any Groq tool-calling capable model      |
| `DB_PATH`    | `./data/shopping.db`        | SQLite file location                     |

## 3. Frontend setup

In a second terminal, from the project root:

```bash
cp .env.example .env   # points the frontend at the deployed Render API
npm install
npm run dev             # starts the frontend locally
```

Open the local Vite URL shown by Vite — the chat box talks to the deployed Render API, which
calls Groq to extract shopping intent (category / budget / brand /
keywords) and queries the seeded SQLite catalog for matching products.

## Production build

```bash
# backend
cd server && npm run build && npm start

# frontend
npm run build && npm run preview
```

## How the AI part works

`server/src/services/agentService.ts` sends each chat message to Groq's
OpenAI-compatible `chat.completions` endpoint with a single forced tool
call (`extract_shopping_intent`). Groq returns structured JSON (category,
budget range, brand, keywords, and whether a clarifying question is
needed), which the backend merges with prior filters for that chat thread
and uses to query the product catalog.

Swap models by changing `GROQ_MODEL` in `server/.env` to any other
Groq-hosted model that supports tool/function calling.
