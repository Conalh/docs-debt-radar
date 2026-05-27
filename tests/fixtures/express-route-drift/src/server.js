import express from "express";

const app = express();

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/users", (_request, response) => {
  response.status(201).end();
});

export { app };
