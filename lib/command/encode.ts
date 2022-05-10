import { Command } from "cliffy/command/mod.ts";

import { CommandBuilder } from "./builder.ts";
import { historyEntryParser, historyEntryToBytes } from "../zsh.ts";
import { readLines } from "../buffer.ts";

export class EncodeCommand implements CommandBuilder {
  build() {
    return new Command<void>()
      .description("convert json lines into zsh's history")
      .arguments<[string]>("<decodedHistoryFilePath:string>")
      .action((_opts, historyFilePath) => {
        return printHistories(historyFilePath);
      });
  }
}

async function printHistories(filePath: string) {
  const input = filePath === "-"
    ? Deno.stdin
    : await Deno.open(filePath, { read: true });

  const d = new TextDecoder("utf-8");
  for await (const line of readLines(input)) {
    const json = JSON.parse(d.decode(line));
    const result = historyEntryParser.safeParse(json);

    if (!result.success) {
      console.error("failed to parse", line);
      continue;
    }

    await Deno.stdout.write(historyEntryToBytes(result.data));
  }
}
