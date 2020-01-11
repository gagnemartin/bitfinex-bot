import express from 'express'
import routesCandles from './candles.mjs'

const indexRouter = express.Router();

indexRouter.use('/candles', routesCandles)

export default indexRouter
