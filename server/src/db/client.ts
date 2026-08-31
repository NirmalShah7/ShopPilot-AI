import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");
const configuredPath = process.env.DB_PATH?.trim();
const DB_PATH = configuredPath
  ? (path.isAbsolute(configuredPath) ? configuredPath : path.resolve(serverRoot, configuredPath))
  : path.join(serverRoot, "data", "shopping.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

console.log(`Using SQLite database: ${DB_PATH}`);

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);
