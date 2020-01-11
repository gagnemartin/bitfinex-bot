import express from 'express'
import CandleController from '../controllers/CandleController.mjs'

const routesCandles = express.Router()

routesCandles.get('/fetch', CandleController.fetch)

export default routesCandles
