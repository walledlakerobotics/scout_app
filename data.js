import Database from 'better-sqlite3';

const db = new Database('database.db', { verbose: console.log });
db.pragma('journal_mode = WAL');

function createGroupsTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS Groups (
            displayName TEXT,
            name TEXT PRIMARY KEY,
            password TEXT
        )
    `);
}

function createUsersTable() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS Users (
            username TEXT PRIMARY KEY,
            password TEXT,
            groups TEXT
        )
    `);
}

function createGroupTable(name) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS Group_${name} (
            teamNumber INTEGER,
            matchNumber INTEGER,
            data JSON,
            PRIMARY KEY (teamNumber, matchNumber)
        )
    `);
}

createUsersTable();
createGroupsTable();

const addUserStatement = db.prepare('INSERT INTO Users (username, password, groups) VALUES (?, ?, \'\')');
const addUser = db.transaction((username, password) => {
    addUserStatement.run(username, password);
    return { username, password, groups: [] };
});

const getUserStatement = db.prepare('SELECT username, password, groups FROM Users WHERE username = ?');
const getUser = db.transaction(username => {
    const user = getUserStatement.get(username);
    if (!user) return user;
    user.groups = JSON.parse(user.groups == '' ? '[]' : user.groups).map(g => getGroup(g));
    console.log(user.groups);
    return user;
});

const updateUserGroups = db.prepare('UPDATE Users SET groups = ? WHERE username = ?');
const addGroupToUser = db.transaction((user, group) => {
    if (user.groups.some(g => g.name == group.name)) return;
    user.groups.push(group);
    updateUserGroups.run(JSON.stringify(user.groups.map(g => g.name)), user.username);
});

const removeGroupFromUser = db.transaction((user, group) => {
    if (!user.groups.some(g => g.name == group.name)) return;
    updateUserGroups.run(JSON.stringify(user.groups.filter(g => g.name != group.name).map(g => g.name)), user.username);
});

const addGroupStatement = db.prepare('INSERT INTO Groups (displayName, name, password) VALUES (?, ?, ?)');
const addGroup = db.transaction((displayName, name, password) => {
    addGroupStatement.run(displayName, name, password);
    createGroupTable(name);
    return { displayName, name, password };
});

const getGroupStatement = db.prepare('SELECT displayName, name, password FROM Groups WHERE name = ?');
const getGroup = db.transaction(name => {
    return getGroupStatement.get(name);
});

function addData(group, teamNumber, matchNumber, data) {
    const addDataStatement = db.prepare(`INSERT OR REPLACE INTO Group_${group.name} (teamNumber, matchNumber, data) VALUES (?, ?, ?)`);
    const addData = db.transaction(() => {
        addDataStatement.run(teamNumber, matchNumber, JSON.stringify(data));
        return { teamNumber, matchNumber, data };
    });

    return addData();
}

function getData(group) {
    const getDataStatement = db.prepare(`SELECT * FROM Group_${group.name}`);
    const getData = db.transaction(() => {
        const rows = getDataStatement.all();
        rows.forEach(row => {
            row.data = JSON.parse(row.data);
        });

        return rows;
    });

    return getData();
}

export default { db, addUser, getUser, addGroupToUser, removeGroupFromUser, addGroup, getGroup, addData, getData };