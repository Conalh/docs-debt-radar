import Koa from "koa";
import Router from "@koa/router";

const app = new Koa();
const router = new Router();
const api = new Router({ prefix: "/api" });

router.get("/health", (context) => {
  context.body = { ok: true };
});

api.post("/users", (context) => {
  context.status = 201;
});

app.use(router.routes());
app.use(api.routes());

export { app };
