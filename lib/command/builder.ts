import { Command } from "cliffy/command/mod.ts";

export interface CommandBuilder {
  build(): Command;
}
