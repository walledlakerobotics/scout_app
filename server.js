import bcrypt from 'bcrypt';
import data from './data.js';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import process from 'process';
import session from 'express-session';
import sessionStoreFactory from 'better-sqlite3-session-store';

const SqliteStore = sessionStoreFactory(session);

dotenv.config();

const port = 80;

const app = express();

const sessionMaxAge = 1209600000; // 14 days

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new SqliteStore({
        client: data.db,
        expired: {
            clear: true,
            intervalMs: sessionMaxAge
        }
    }),
    cookie: {
        secure: false,
        maxAge: sessionMaxAge
    }
}));

app.use((req, _, next) => {
    if (req.session.user) {
        req.session.user = data.getUser(req.session.user.username);
    }

    return next();
});

function requireLogin(req, res, next) {
    if (!req.session.user) return res.sendStatus(403);
    return next();
}

app.use(express.json());
app.use(express.static(path.resolve('public')));

app.post('/logout', requireLogin, (req, res) => {
    req.session.user = undefined;
    return res.sendStatus(200);
});

app.post('/login', async (req, res) => {
    let user = data.getUser(req.body.username);
    if (!user) return res.sendStatus(404);

    if (!await bcrypt.compare(req.body.password, user.password)) return res.sendStatus(403);

    req.session.user = user;

    return res.sendStatus(200);
});

app.post('/register', async (req, res) => {
    let user = data.getUser(req.body.username);
    if (user) return res.sendStatus(409);

    user = data.addUser(req.body.username, await bcrypt.hash(req.body.password, 12));
    req.session.user = user;

    return res.sendStatus(201);
});

app.post('/leave/group', requireLogin, async (req, res) => {
    let group = data.getGroup(req.body.groupName);
    if (!group || !req.session.user.groups.some(g => g.name == group.name)) return res.sendStatus(404);

    data.removeGroupFromUser(req.session.user, group);

    return res.sendStatus(200);
});

app.post('/login/group', requireLogin, async (req, res) => {
    let group = data.getGroup(req.body.name);
    if (!group) return res.sendStatus(404);

    if (!await bcrypt.compare(req.body.password, group.password)) return res.sendStatus(403);

    data.addGroupToUser(req.session.user, group);

    return res.sendStatus(200);
});

app.post('/register/group', requireLogin, async (req, res) => {
    let group = data.getGroup(req.body.name);
    if (group) return res.sendStatus(409);

    group = data.addGroup(req.body.displayName, req.body.name, await bcrypt.hash(req.body.password, 12));
    data.addGroupToUser(req.session.user, group);

    return res.sendStatus(201);
});

app.get('/scouting/data', requireLogin, (req, res) => {
    const group = data.getGroup(req.body.groupName);
    if (!group) return res.sendStatus(404);

    if (!req.session.user.groups.some(g => g.name == group.name)) return res.sendStatus(403);

    return res.status(200).json(data.getData(data.getGroup(req.body.groupName)));
});

app.post('/scouting/data', requireLogin, (req, res) => {
    const group = data.getGroup(req.body.groupName);
    if (!group) return res.sendStatus(404);

    if (!req.session.user.groups.some(g => g.name == group.name)) return res.sendStatus(403);

    data.addData(group, req.body.teamNumber, req.body.matchNumber, req.body.data);

    return res.sendStatus(201);
});

app.listen(port);