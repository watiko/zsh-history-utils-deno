import { Command } from "cliffy/command/mod.ts";
import { SortedMap } from "@rimbu/sorted/mod.ts";

import { CommandBuilder } from "./builder.ts";
import { parseHistoryLine, readHistoryLines } from "../zsh.ts";

export class MergeComand implements CommandBuilder {
  build() {
    return new Command<void>()
      .description("merge zsh's history files into one zsh's history file")
      .arguments<[string[]]>("<...historyFiles:string>")
      .action((_opts, historyFilePaths) => {
        return printMergedHistories(historyFilePaths);
      });
  }
}

async function printMergedHistories(historyFilePaths: string[]) {
  const linesMap = SortedMap.builder<number, Uint8Array[]>();

  for (const filePath of historyFilePaths) {
    const file = await Deno.open(filePath, { read: true });
    for await (const line of readHistoryLines(file)) {
      const entry = parseHistoryLine(line);
      if (entry === null) {
        console.error("failed to parse", line);
        continue;
      }

      const key = entry.startTime;
      const lines = linesMap.get(key) ?? [];
      linesMap.set(key, [...lines, Uint8Array.from(line)]);
    }
  }

  const LF = "\n".charCodeAt(0);
  for (const lines of linesMap.build().streamValues()) {
    for (const line of lines) {
      await Deno.stdout.write(line);
      await Deno.stdout.write(Uint8Array.of(LF));
    }
  }
}
