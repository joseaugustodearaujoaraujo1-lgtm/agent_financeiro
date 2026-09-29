import "dotenv/config"
import mysql2 from "mysql2/promise"

const pool = mysql2.createPool({
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10
})

export default pool