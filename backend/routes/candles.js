import express from 'express'
import { CandleController } from '../controllers/index.js'

const routesCandles = express.Router()

routesCandles.get('/fetch', CandleController.fetch)
// routesCandles.get('/tickers', CandleController.tickers)

export default routesCandles
