import axios from 'axios';
import bcrypt from 'bcrypt';
import data from './data.js';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import process from 'process';
import session from 'express-session';
import sessionStoreFactory from 'better-sqlite3-session-store';
import { match } from 'assert';

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

app.set('view engine', 'ejs');

function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    return next();
}

function requireNoLogin(req, res, next) {
    if (req.session.user) return res.redirect('/dashboard');
    return next();
}

async function getMatches() {
    const reposnse = await axios.get('https://www.thebluealliance.com/api/v3/event/2025mimil/matches',
        {
            headers: {
                'X-TBA-Auth-Key': process.env.TBA_API_KEY
            }
        }
    );

    return reposnse.data;
}

async function getMatch(key) {
    const reposnse = await axios.get(`https://www.thebluealliance.com/api/v3/match/${key}`,
        {
            headers: {
                'X-TBA-Auth-Key': process.env.TBA_API_KEY
            }
        }
    );

    console.log(reposnse.data);

    return reposnse.data;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

app.use(express.static(path.resolve('public')));

app.get('/dashboard', requireLogin, async (_, res) => res.render('dashboard', { matches: await getMatches() }));

// app.get('/form', requireLogin, async (_, res) => res.render('form', { matches: await getMatches() }));


app.get('/dashboard/:match', requireLogin, async (req, res) => res.render('match', { match: await getMatch(req.params.match), base: req.url }));

app.get('/dashboard/:match/:team', requireLogin, async (req, res) => res.render('form'));

app.post('/logout', requireLogin, (req, res) => {
    req.session.user = undefined;
    return res.sendStatus(200);
});

app.get('/login', requireNoLogin, (_, res) => res.render('login'));

app.post('/login', async (req, res) => {
    if (req.session.user) return res.render('dashboard');

    let user = data.getUser(req.body.username);
    if (!user) return res.sendStatus(404);

    if (!bcrypt.compare(req.body.password, user.password)) return res.sendStatus(403);

    req.session.user = user;

    return res.redirect('dashboard');
});

app.get('/register', requireNoLogin, (_, res) => res.render('register'));

app.post('/register', async (req, res) => {
    if (req.session.user) return res.render('dashboard');

    let user = data.getUser(req.body.username);
    if (user) return res.render('register', { message: `An accout with username "${user.username}" already exists` });

    user = data.addUser(req.body.username, await bcrypt.hash(req.body.password, 12));
    req.session.user = user;

    return res.redirect('dashboard');
});

app.post('/leave/group', requireLogin, async (req, res) => {
    let group = data.getGroup(req.body.groupName);
    if (!group || !req.session.user.groups.some(g => g.name == group.name)) return res.sendStatus(404);

    data.removeGroupFromUser(req.session.user, group);

    return res.sendStatus(200);
});

app.post('/join/group', requireLogin, async (req, res) => {
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

app.post('/scouting/data', requireLogin, (req, res) => {
    console.log(req.body);
    const group = data.getGroup(req.body.groupName);
    if (!group) return res.sendStatus(404);

    if (!req.session.user.groups.some(g => g.name == group.name)) return res.sendStatus(403);

    const scoutingData = structuredClone(req.body);
    delete scoutingData.teamNumber;
    delete scoutingData.matchNumber;
    delete scoutingData.groupName;

    data.addData(group, req.body.teamNumber, req.body.matchNumber, scoutingData);

    return res.sendStatus(201);
});

app.get('/scouting/data', requireLogin, (req, res) => {
    const group = data.getGroup(req.body.groupName);
    if (!group) return res.sendStatus(404);

    if (!req.session.user.groups.some(g => g.name == group.name)) return res.sendStatus(403);

    return res.json(data.getData(group));
});

app.listen(port);