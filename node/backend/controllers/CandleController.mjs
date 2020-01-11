import axios from 'axios'
import indicators from 'technicalindicators'
import AppController from './AppController.mjs'

class CandleController extends AppController {
  constructor(model) {
    super(model)
  }

  fetch = (req, res, next) => {
    const now = Date.now()
    const period = 14
    const startPeriod = now - (1000 * 60 * 60 * 24 * period)
    const domain = 'https://api-pub.bitfinex.com/v2/'
    const path = 'candles/trade:30m:tBTCUSD/hist'
    const params = '?sort=1&limit=10000&start=' + startPeriod
    const url = domain + path + params

    axios.get(url)
      .then(response => {
        if (typeof response.data !== 'undefined') {
          const candles = response.data.map(candle => {
            return {
              date: new Date(candle[0]),
              open: candle[1],
              close: candle[2],
              high: candle[3],
              low: candle[4]
            }
          })

          const closes = candles.map(candle => candle.close)
          const { MACD, RSI } = indicators
          const macdInput = {
            values            : closes,
            fastPeriod        : 12,
            slowPeriod        : 26,
            signalPeriod      : 9,
            SimpleMAOscillator: true,
            SimpleMASignal    : true
          }

          const macd = MACD.calculate(macdInput)

          const rsiInput = {
            values: closes,
            period: period
          }

          const rsi = RSI.calculate(rsiInput)

          const data = {
            candles, macd, rsi
          }

          res.send(data);
          //res.send(data.data);
        } else {
          res.status(500).send('Error')
        }
      })
      .catch(e => {
        res.status(e.response.status).send(e)
        console.error(e.response.status)
      })
  }
}

export default new CandleController()
