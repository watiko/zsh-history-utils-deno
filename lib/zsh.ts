import { Buffer } from "@std/io/buffer.ts";
import { StringReader } from "@std/io/mod.ts";
import type { Reader } from "@std/io/types.d.ts";
import { Buffer as NodeBuffer } from "@std/node/buffer.ts";
import { Parser } from "binary-parser";
import { readLines } from "./buffer.ts";

const LF = "\n".charCodeAt(0);
const BACKSLASH = "\\".charCodeAt(0);
const SPACE = " ".charCodeAt(0);
const COLON = ":".charCodeAt(0);
const SEMICOLON = ";".charCodeAt(0);

const META = 0x83;
const META_MASK = 0b100000;
const META_CHARS = (function () {
  const NULL = 0x0;
  const MARKER = 0xA2;
  const POUND = 0x84;
  const LAST_NORMAL_TOK = 0x9c;
  const SNULL = 0x9d;
  const NULARG = 0xA1;

  const metaChars = [NULL, META, MARKER];

  for (let t = POUND; t <= LAST_NORMAL_TOK; t++) {
    metaChars.push(t);
  }

  for (let t = SNULL; t <= NULARG; t++) {
    metaChars.push(t);
  }

  return metaChars;
})();

// imeta
// inittyptab
function isMetaChar(c: number): boolean {
  return META_CHARS.includes(c);
}

export function metafy(str: Uint8Array): Uint8Array {
  const buf: number[] = [];

  for (let i = 0; i < str.length; i++) {
    const current = str[i];

    if (!isMetaChar(current)) {
      buf.push(current);
      continue;
    }

    buf.push(META);
    buf.push(current ^ META_MASK);
  }

  return Uint8Array.from(buf);
}

export function unmetafy(str: Uint8Array): Uint8Array {
  const buf: number[] = [];

  for (let i = 0; i < str.length; i++) {
    const current = str[i];
    const next = i < str.length - 1 ? str[i + 1] : 0;

    if (current === META) {
      if (next === 0) {
        throw new Error("unreachable");
      }
      buf.push(next ^ META_MASK);
      i++; // skip
      continue;
    }
    buf.push(current);
  }

  return Uint8Array.from(buf);
}

export interface HistoryEntry {
  command: string;
  startTime: number;
  finishTime: number;
}

export function historyEntryToBytes(entry: HistoryEntry): Uint8Array {
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

const historyLineParser = new Parser()
  .nest("_header", {
    type: new Parser()
      .uint8("_colon", { assert: COLON })
      .uint8("_space", { assert: SPACE }),
  })
  .array("startTime", {
    type: "uint8",
    readUntil: (item) => item === COLON,
  })
  .array("duration", {
    type: "uint8",
    readUntil: (item) => item === SEMICOLON,
  })
  .buffer("command", {
    readUntil: "eof",
  });

export function parseHistoryLine(line: Uint8Array): HistoryEntry | null {
  try {
    const parsed = historyLineParser.parse(NodeBuffer.from(line));

    const d = new TextDecoder("utf-8");
    const startTime = parseInt(d.decode(Uint8Array.from(parsed.startTime)), 10);
    const duration = parseInt(d.decode(Uint8Array.from(parsed.duration)), 10);
    return {
      command: d.decode(unmetafy(parsed.command)),
      startTime,
      finishTime: startTime + duration,
    };
  } catch (e) {
    console.error(e);
    return null;
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
