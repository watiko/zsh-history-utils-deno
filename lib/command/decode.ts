import { Command } from "cliffy/command/mod.ts";

import { CommandBuilder } from "./builder.ts";
import { parseHistoryLine, readHistoryLines } from "../zsh.ts";

export class DecodeCommand implements CommandBuilder {
  build() {
    return new Command<void>()
      .description("convert zsh's history into json lines")
      .arguments("<historyFilePath:string>")
      .option("--pretty", "prettify output json")
      .action((opts, historyFilePath) => {
        return printHistoryEntries(historyFilePath, opts.pretty ?? false);
      });
  }
}

async function printHistoryEntries(filePath: string, pretty: boolean) {
  const input = filePath === "-"
    ? Deno.stdin
    : await Deno.open(filePath, { read: true });
  const indent = pretty ? 2 : 0;

  for await (const line of readHistoryLines(input)) {
    console.log(JSON.stringify(parseHistoryLine(line), null, indent));
  }
}
