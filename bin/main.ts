import { MainComand } from "../lib/command/main.ts";
import { DecodeComand } from "../lib/command/decode.ts";
import { EncodeComand } from "../lib/command/encode.ts";
import { MergeComand } from "../lib/command/merge.ts";

async function main() {
  const cmd = new MainComand().build();

  cmd.command("decode", new DecodeComand().build());
  cmd.command("encode", new EncodeComand().build());
  cmd.command("merge", new MergeComand().build());

  await cmd.parse(Deno.args);
}

if (import.meta.main) {
  try {
    await main();
  } catch (e) {
    console.error(e);
    Deno.exit(1);
  }
}
