import express from 'express';
import path from 'path'

const __dirname = path.resolve();

const port = 80;
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port);