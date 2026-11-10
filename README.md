# Kosha: personal finance, in focus

Kosha (Sanskrit for *treasury*) is a full-stack MERN application for logging daily income and expenses.
It calculates your balance, breaks down spending by category, tracks monthly budgets, and includes
**Kosha Copilot**, an assistant powered by the Google Gemini API that answers questions about your
own data and can log transactions for you after you confirm them.

> Work in progress. Full setup guide, screenshots and architecture notes land as the build progresses.

## Stack
MongoDB 7 (Docker) · Express 5 · React 18 + Vite · Node.js 20+ · Mongoose · Recharts · Google Gemini API

## Quick start
```bash
docker compose up -d      # MongoDB + mongo-express, restores the seed dataset
npm install
cp server/.env.example server/.env
npm run dev               # API on :5000, web app on :5173
```
