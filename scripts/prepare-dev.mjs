import { rmSync } from "node:fs";
import { resolve } from "node:path";

for (const directory of [".next", ".next-dev"]) {
  rmSync(resolve(process.cwd(), directory), {
    force: true,
    recursive: true,
  });
}
