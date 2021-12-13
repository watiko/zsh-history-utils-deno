import { Buffer, BufReader } from "@std/io/buffer.ts";
import { StringReader } from "@std/io/mod.ts";
import type { Reader, Writer } from "@std/io/types.d.ts";

const LF = "\n".charCodeAt(0);
const BACKSLASH = "\\".charCodeAt(0);
const SPACE = " ".charCodeAt(0);

export interface HistoryEntry {
  command: string;
  startTime: number;
  finishTime: number;
}

export function historyEntriesToBytes(entry: HistoryEntry): Uint8Array {
  const duration = entry.finishTime - entry.startTime;
  if (duration < 0) {
    throw new Error("negative duration detected");
  }

  const header = `: ${entry.startTime}:${duration};`;
  const line = `${header}${entry.command}`;

  const reader = new StringReader(line);
  const buffer: number[] = [];
  let endBackslashed = false;
  for (const t of reader.bytes({ copy: false })) {
    endBackslashed = t === BACKSLASH || (endBackslashed && t == SPACE);

    if (t === LF) {
      buffer.push(BACKSLASH);
    }
    buffer.push(t);
  }

  if (endBackslashed) {
    buffer.push(SPACE);
  }
  buffer.push(LF);

  return Uint8Array.from(buffer);
}

// line separator: CRLF or LF
async function* readLines(reader: Reader): AsyncGenerator<Uint8Array> {
  const bufReader = BufReader.create(reader);
  const buffer = new Buffer();

  while (true) {
    const res = await bufReader.readLine();
    if (res === null) {
      if (!buffer.empty()) {
        yield buffer.bytes({ copy: false });
      }
      break;
    }

    await buffer.write(res.line);
    if (!res.more) {
      yield buffer.bytes({ copy: false });
      buffer.reset();
    }
  }
}

export async function* readHistoryLines(
  reader: Reader,
): AsyncGenerator<Uint8Array> {
  const buffer = new Buffer();
  let more = false;

  for await (let line of readLines(reader)) {
    more = line.length > 0 && line[line.length - 1] === BACKSLASH;
    if (more) {
      // remove line continuation marker
      line = line.slice(0, line.length - 1);
    } else {
      let spaceIndex = line.length - 1;
      while (spaceIndex >= 0 && line[spaceIndex] === SPACE) {
        spaceIndex--;
      }

      if (spaceIndex !== line.length - 1 && line[spaceIndex] == BACKSLASH) {
        // '\\', ' ' という並びの空白はマーカになっているため一つ分無視をする
        line = line.slice(0, line.length - 1);
      }
    }

    await buffer.write(line);
    if (more) {
      await buffer.write(Uint8Array.of(LF));
    } else {
      yield buffer.bytes({ copy: false });
      buffer.reset();
    }
  }

  if (!buffer.empty()) {
    yield buffer.bytes({ copy: false });
  }
}

async function main() {
  const givenPath = Deno.args[0];
  if (givenPath === undefined) {
    console.error("path is not passed");
    Deno.exit(1);
  }
  const file = await Deno.open(givenPath, { read: true });

  const d = new TextDecoder("utf-8");
  for await (const line of readHistoryLines(file)) {
    console.log("[History Entry]", d.decode(line));
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (e) {
    console.error(e);
    Deno.exit(1);
  }
}
