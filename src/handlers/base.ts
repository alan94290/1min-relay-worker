/**
 * Base handler class with shared constructor and service setup
 */

import { Env } from "../types";
import { OneMinApiService } from "../services";

export abstract class BaseTextHandler {
  protected env: Env;
  protected apiService: OneMinApiService;

  constructor(env: Env) {
    this.env = env;
    this.apiService = new OneMinApiService(env);
  }
}
