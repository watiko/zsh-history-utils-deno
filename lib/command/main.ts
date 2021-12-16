import { Command } from "cliffy/command/mod.ts";

import { CommandBuilder } from "./builder.ts";

export class MainComand implements CommandBuilder {
  build() {
    return new Command()
      .name("zsh-history-utils")
      .allowEmpty(false);
  }
}
