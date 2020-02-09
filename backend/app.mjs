import express from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'
import indexRouter from './routes/index.mjs'
import WebSocket from 'ws'
import WebSocketClients from './websockets/WebSocketClients.mjs'

const app = express();

app.use(cors({
  origin: "http://localhost:3000"
}))

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api/v1', indexRouter)

const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', ws => {
  WebSocketClients.add(ws)
})

export default app
