import { parseHistoryLine, readHistoryLines } from "../lib/zsh.ts";

async function main() {
  const givenPath = Deno.args[0];
  if (givenPath === undefined) {
    console.error("path is not passed");
    Deno.exit(1);
  }
  const file = await Deno.open(givenPath, { read: true });

  for await (const line of readHistoryLines(file)) {
    console.log(JSON.stringify(parseHistoryLine(line), null, 2));
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
