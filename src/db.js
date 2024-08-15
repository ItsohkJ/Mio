import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql';

const connection = mysql.createConnection({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_password,
  database: process.env.db_name,
  });
connection.connect((err) => {
  if(err) {
    console.log("Error connecting to database", err);
    }
  console.log("connected to database");
  });
export default connection;

//closing db

process.on('SIGINT', () => {
  connection.end((err) => {
    if (err) {
      console.log("error closing db");
      }
    console.log("db connection closed");
    process.exit();
    });
  });