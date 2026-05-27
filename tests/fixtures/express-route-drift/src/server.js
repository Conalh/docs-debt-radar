import express from "express";

const app = express();
const api = express.Router();

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

api.post("/users", (_request, response) => {
  response.status(201).end();
});

app.use("/api", api);

export { app };
