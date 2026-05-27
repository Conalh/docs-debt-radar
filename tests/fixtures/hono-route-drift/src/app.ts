import { Hono } from "hono";

const app = new Hono();
const api = new Hono();

app.get("/health", (context) => {
  return context.json({ ok: true });
});

api.post("/users", (context) => {
  return context.json({ ok: true }, 201);
});

app.route("/api", api);

export default app;
