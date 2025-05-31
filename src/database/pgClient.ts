import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not defined in environment variables");
  throw new Error("DATABASE_URL is required to connect to PostgreSQL");
}
const pgClient = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pgClient.on("connect", () => {
  console.log("✔ PostgreSQL client connected successfully");
});

pgClient.on("error", (err) => {
  console.error("PostgreSQL client encountered an error:", err);
});

export default pgClient;
