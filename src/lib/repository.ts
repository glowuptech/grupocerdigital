import "server-only";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { seed, personalSeed } from "./seed";
import type { State, Personal, UserId } from "./model";
import { syncPersonal } from "./personal";
export interface Database {
  state: State;
  personal: Record<UserId, Personal>;
}
const file = path.join(process.cwd(), ".demo", "data.json");
const globalDb = globalThis as typeof globalThis & {
  dbQueue?: Promise<unknown>;
};
export async function transaction<T>(
  fn: (db: Database) => T | Promise<T>,
): Promise<T> {
  const next = (globalDb.dbQueue ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      let db: Database;
      try {
        db = JSON.parse(await readFile(file, "utf8"));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
        db = {
          state: seed(),
          personal: {
            rafael: personalSeed("rafael"),
            claudecir: personalSeed("claudecir"),
          },
        };
      }
      syncPersonal(db.state, db.personal);
      const result = await fn(db);
      syncPersonal(db.state, db.personal);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file + ".tmp", JSON.stringify(db), "utf8");
      await rename(file + ".tmp", file);
      return result;
    });
  globalDb.dbQueue = next;
  return next;
}
