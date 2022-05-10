import { Command } from "cliffy/command/mod.ts";

export interface CommandBuilder {
  // deno-lint-ignore no-explicit-any
  build(): Command<any>;
}
