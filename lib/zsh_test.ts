import { assertEquals } from "@std/testing/asserts.ts";
import { Buffer, StringReader } from "@std/io/mod.ts";
import {
  historyEntryToBytes,
  metafy,
  parseHistoryLine,
  readHistoryLines,
  unmetafy,
} from "./zsh.ts";

function bytesToReader(bytes: Uint8Array): Buffer {
  const buf = new Buffer();
  buf.writeSync(bytes);
  return buf;
}

function fromString(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function toString(arr: Uint8Array): string {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(arr);
}

async function genToArray(
  gen: AsyncIterable<Uint8Array>,
): Promise<Uint8Array[]> {
  const ret: Uint8Array[] = [];
  for await (const x of gen) {
    ret.push(Uint8Array.from(x));
  }
  return ret;
}

const metaTests = [
  {
    name: "dragon",
    metafied: Uint8Array.of(240, 131, 191, 131, 176, 178),
    unmetafied: fromString("🐲"),
  },
  {
    name: "family",
    // deno-fmt-ignore
    metafied: Uint8Array.of(
      240, 131, 191, 131,
      177, 168, 226, 128,
      131, 173, 240, 131,
      191, 131, 177, 168,
      226, 128, 131, 173,
      240, 131, 191, 131,
      177, 167, 226, 128,
      131, 173, 240, 131,
      191, 131, 177, 166
    ),
    unmetafied: fromString("👨‍👨‍👧‍👦"),
  },
  {
    name: "penguin",
    // deno-fmt-ignore
    metafied: Uint8Array.of(
      227, 131, 163, 131,
      186, 227, 131, 163,
      179, 227, 130, 174,
      227, 131, 163, 179
    ),
    unmetafied: fromString("ペンギン"),
  },
];

Deno.test("metafy", async (t) => {
  for (const tt of metaTests) {
    await t.step(tt.name, () => {
      assertEquals(metafy(tt.unmetafied), tt.metafied);
    });
  }
});

Deno.test("unmetafy", async (t) => {
  for (const tt of metaTests) {
    await t.step(tt.name, () => {
      assertEquals(unmetafy(tt.metafied), tt.unmetafied);
    });
  }
});

const historyLineTests = [
  {
    name: "simple entry",
    entry: {
      command: "sleep 2",
      startTime: 1639320933,
      finishTime: 1639320935,
    },
    line: ": 1639320933:2;sleep 2\n",
  },
  {
    name: "multi line entry",
    entry: {
      command: "echo one \\\n  echo two",
      startTime: 1111,
      finishTime: 1111,
    },
    line: ": 1111:0;echo one \\\\\n  echo two\n",
  },
  {
    name: "meta",
    entry: {
      command: "echo ペンギン",
      startTime: 1,
      finishTime: 1,
    },
    // deno-fmt-ignore
    line: Uint8Array.of(
       58,  32,  49,  58,  48,  59, 101,
       99, 104, 111,  32, 227, 131, 163,
      131, 186, 227, 131, 163, 179, 227,
      130, 174, 227, 131, 163, 179,  10
    ),
  },
];

Deno.test("historyEntriesToBytes", async (t) => {
  for (const tt of historyLineTests) {
    await t.step(tt.name, () => {
      const encoded = historyEntryToBytes(tt.entry);
      if (typeof tt.line === "string") {
        assertEquals(toString(encoded), tt.line);
      } else {
        assertEquals(encoded, tt.line);
      }
    });
  }
});

Deno.test("parseHistoryLine", async (t) => {
  for (const tt of historyLineTests) {
    await t.step(tt.name, async () => {
      const r = typeof tt.line === "string"
        ? new StringReader(tt.line)
        : bytesToReader(tt.line);
      const lines = await genToArray(readHistoryLines(r));
      assertEquals(lines.length, 1);
      const entry = parseHistoryLine(lines[0]);
      assertEquals(entry, tt.entry);
    });
  }
});

Deno.test("simple", async () => {
  const histories = [
    ": 1639324265:0;echo 1 2 3",
    ': 1639324275:0;echo ""',
    ": 1639324281:0;echo {1,2,3}",
    "",
  ].join("\n");
  const expected = [
    ": 1639324265:0;echo 1 2 3",
    ': 1639324275:0;echo ""',
    ": 1639324281:0;echo {1,2,3}",
  ];

  const r = new StringReader(histories);
  const lines = await genToArray(readHistoryLines(r))
    .then((lines) => lines.map(toString));

  assertEquals(lines, expected);
});

Deno.test("multiple lines", async () => {
  const histories = [
    ": 1639320933:0;echo one \\ ",
    ": 1639322528:0;echo two \\\\ ",
    // fixed: https://github.com/zsh-users/zsh/blob/78958c08bfdb37d2eafaf14a33b93229b1fa9e31/Src/hist.c#L3021
    ": 1639320933:0;echo one \\",
    ": 1639322528:0;echo two \\\\ ",
    ": 1639322832:0;echo 2 \\\\",
    " 2 \\\\",
    " 1 \\ ",
    ": 1639322528:0;echo",
    "",
  ].join("\n");
  const expected = [
    ": 1639320933:0;echo one \\",
    ": 1639322528:0;echo two \\\\",
    ": 1639320933:0;echo one \n: 1639322528:0;echo two \\\\",
    ": 1639322832:0;echo 2 \\\n 2 \\\n 1 \\",
    ": 1639322528:0;echo",
  ];

  const r = new StringReader(histories);
  const lines = await genToArray(readHistoryLines(r))
    .then((lines) => lines.map(toString));

  assertEquals(lines, expected);
});
