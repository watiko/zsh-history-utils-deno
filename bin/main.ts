import { MainCommand } from "../lib/command/main.ts";
import { DecodeCommand } from "../lib/command/decode.ts";
import { EncodeCommand } from "../lib/command/encode.ts";
import { MergeCommand } from "../lib/command/merge.ts";

async function main() {
  const cmd = new MainCommand().build();

  cmd.command("decode", new DecodeCommand().build());
  cmd.command("encode", new EncodeCommand().build());
  cmd.command("merge", new MergeCommand().build());

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
