const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "clinic-management-system",
  password: "Thai@0867504590",
  port: 5432,
});

pool.on("connect", () => {
  console.log("Successfully connected to PostgreSQL database.");
});

pool.on("error", (err) => {
  console.error(
    "Database connection error - Check your credentials and server status:",
    err.message
  );

  process.exit(-1);
});

module.exports = pool;
