import { Buffer, BufReader } from "@std/io/buffer.ts";
import type { Reader } from "@std/io/types.d.ts";

// line separator: CRLF or LF
export async function* readLines(reader: Reader): AsyncGenerator<Uint8Array> {
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
