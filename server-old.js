import path from 'path';
import bcrypt from 'bcrypt';
// import sqlite3 from 'sqlite3';
import express from 'express';
// import session from 'express-session';
// import sqliteStoreFactory from 'express-session-sqlite';

const __dirname = path.resolve();

// const SqliteStore = sqliteStoreFactory(session);

const users = [];

const port = 80;
const app = express();

// app.use(session({
//     secret: 'keyboard cat',
//     resave: false,
//     saveUninitialized: true,
//     store: new SqliteStore({
//         driver: sqlite3.Database,
//         path: 'database.db',
//         ttl: 1234
//     })
// }));

app.use(express.static(path.join(__dirname, 'public')));

// app.post('/login', (req, res) => {
//     let user = users.find(user => user.username == req.bodu.username);
//     if (user) return res.sendStatus(409);

//     user = {
//         username: req.user.username,
//         password: bcrypt.hash(req.user.password)
//     };
// });

app.post('/scouting/data', (req, res) => {

});

app.listen(port);