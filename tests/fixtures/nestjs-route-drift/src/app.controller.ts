import { Controller, Get, Post } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("health")
  health() {
    return { ok: true };
  }
}

@Controller("api")
export class UsersController {
  @Post("users")
  createUser() {
    return { ok: true };
  }
}
