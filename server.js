import path from 'path';
import bcrypt from 'bcrypt';
import express from 'express';
// import Database from 'better-sqlite3';
// import session from 'express-session';
// import sqliteStoreFactory from 'express-session-sqlite';

const __dirname = path.resolve();

const data = {};



// const SqliteStore = sqliteStoreFactory()

const users = [];

const port = 443;
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

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => {
    let user = users.find(user => user.username == req.bodu.username);
    if (user) return res.sendStatus(409);

    user = {
        username: req.user.username,
        password: bcrypt.hash(req.user.password)
    };
});

app.post('/scouting/data', (req, res) => {
    data[req.body.scoutingTeam] = req.body.data;
    console.log(req.body);
    return res.send(req.body);
});

app.listen(port);