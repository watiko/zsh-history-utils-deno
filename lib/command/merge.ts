import { Command } from "cliffy/command/mod.ts";
import BTree from "sorted-btree";

import { CommandBuilder } from "./builder.ts";
import {
  HistoryEntry,
  historyEntryToBytes,
  parseHistoryLine,
  readHistoryLines,
} from "../zsh.ts";

export class MergeCommand implements CommandBuilder {
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
  const linesMap = new BTree<number, HistoryEntry[]>();

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
      linesMap.set(key, [...lines, entry]);
    }
  }

  for (const lines of linesMap.values()) {
    for (const line of lines) {
      await Deno.stdout.write(historyEntryToBytes(line));
    }
  }
}
