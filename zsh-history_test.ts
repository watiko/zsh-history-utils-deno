import { assertEquals } from "@std/testing/asserts.ts";
import { StringReader } from "@std/io/mod.ts";
import { readHistoryLines } from "./zsh-history.ts";

function toString(arr: Uint8Array): string {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(arr);
}

async function genToArray(gen: AsyncIterable<Uint8Array>): Promise<string[]> {
  const ret: string[] = [];
  for await (const x of gen) {
    ret.push(toString(x));
  }
  return ret;
}

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
  const lines = await genToArray(readHistoryLines(r));

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
  const lines = await genToArray(readHistoryLines(r));

  assertEquals(lines, expected);
});
