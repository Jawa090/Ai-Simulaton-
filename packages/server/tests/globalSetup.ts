import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const TEST_DATABASE_URL = "file:./prisma/test.db";
const root = path.resolve(__dirname, "..");
const dbFile = path.join(root, "prisma", "test.db");

export async function setup() {
  if (fs.existsSync(dbFile)) fs.rmSync(dbFile);

  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };
  execSync("npx prisma db push --skip-generate", { cwd: root, env, stdio: "inherit" });
  execSync("npx tsx src/db/seed.ts", { cwd: root, env, stdio: "inherit" });
}

export async function teardown() {
  if (fs.existsSync(dbFile)) fs.rmSync(dbFile);
  const journal = `${dbFile}-journal`;
  if (fs.existsSync(journal)) fs.rmSync(journal);
}
