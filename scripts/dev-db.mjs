import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
const dataDir =
  process.env.PGDATA ?? path.join(localAppData, "accounting-app", "pgdata");
const port = Number(process.env.PGPORT ?? 5432);
const user = "postgres";
const password = "postgres";
const database = "accounting_dev";
const databaseUrl = `postgresql://${user}:${password}@localhost:${port}/${database}`;

function createPg() {
  return new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user,
    password,
    persistent: true,
    onLog: () => {},
    onError: (m) => console.error("[dev-db]", String(m)),
  });
}

async function ensureDatabase(pg) {
  try {
    await pg.createDatabase(database);
    console.log(`[dev-db] created database "${database}"`);
  } catch {
    // database already exists
  }
}

async function runMigrate(name) {
  const pg = createPg();
  mkdirSync(path.dirname(dataDir), { recursive: true });
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log("[dev-db] initialising Postgres cluster...");
    await pg.initialise();
  }
  await pg.start();
  console.log(`[dev-db] Postgres ready on port ${port}`);
  await ensureDatabase(pg);
  console.log(`[dev-db] running migration (${databaseUrl})`);
  execSync(`npx prisma migrate dev --name ${name}`, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  await pg.stop();
  console.log("[dev-db] migration complete, cluster stopped");
}

async function runStart() {
  const pg = createPg();
  mkdirSync(path.dirname(dataDir), { recursive: true });
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log("[dev-db] initialising Postgres cluster...");
    await pg.initialise();
  }
  await pg.start();
  await ensureDatabase(pg);
  console.log(`[dev-db] Postgres ready: ${databaseUrl}`);
  console.log("[dev-db] press Ctrl+C to stop");
  await new Promise(() => {});
}

const mode = process.argv[2] ?? "start";

if (mode === "migrate") {
  const name = process.argv[3] ?? "init";
  runMigrate(name).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (mode === "start") {
  runStart().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.log("usage: node scripts/dev-db.mjs [start|migrate [name]]");
}
