import axios from 'axios'
import indicators from 'technicalindicators'
import AppController from './AppController.mjs'

class CandleController extends AppController {
  constructor(model) {
    super(model)

    this.candles = []
    this.closes = []
    this.lastTrade = { position: 'buy', close: 7219.3 }
    this.thresholdIncrease = 2.5
    this.thresholdDecrease = 2.5

    //this.startBtc = 1
    this.startBtc = 0.01315
    //this.startUsd = 7219.3
    this.startUsd = 0.19332
    this.btc = this.startBtc
    this.usd = this.startUsd
  }

  tickers = (req, res, next) => {
    const symbols = [
      'tBTCUSD',
      'tETHUSD', 'tETHBTC',
      'tXRPUSD', 'tXRPBTC',
      'tLTCUSD', 'tLTCBTC',
      'tIOTUSD', 'tIOTBTC', 'tIOTETH',
      'tEOSUSD', 'tEOSBTC', 'tEOSETH',
      'tDSHUSD', 'tDSHBTC',
      'tXMRUSD', 'tXMRBTC',
    ]
    const domain = 'https://api-pub.bitfinex.com/v2/'
    const path = 'tickers'
    const params = '?symbols=' + symbols.join(',')
    // const params = '?symbols=ALL'
    const url = domain + path + params

    axios.get(url)
      .then(response => {
        const tickers = response.data.filter(ticker => ticker.length <= 11).map(ticker => {
          const data = {}
          let skeleton = [
            'SYMBOL', 'BID', 'BID_SIZE', 'ASK', 'ASK_SIZE', 'DAILY_CHANGE', 'DAILY_CHANGE_RELATIVE',
            'LAST_PRICE', 'VOLUME', 'HIGH', 'LOW'
          ]

          skeleton.map((key, i) => data[key] = ticker[i])
          return data
        })

        const compare = (a, b) => {
          if (a.DAILY_CHANGE_RELATIVE < b.DAILY_CHANGE_RELATIVE) return 1
          if (a.DAILY_CHANGE_RELATIVE > b.DAILY_CHANGE_RELATIVE) return -1

          return 0
        }

        res.send(tickers.sort(compare))
      })
      .catch(e => {
        res.status(500).send(e)
        console.error(e)
      })
  }

  fetch = (req, res, next) => {
    const now = Date.now()
    const period = 7
    const startPeriod = now - (1000 * 60 * 60 * 24 * period)
    const domain = 'https://api-pub.bitfinex.com/v2/'
    const path = 'candles/trade:5m:tBTCUSD/hist'
    const params = '?sort=1&limit=10000&start=' + startPeriod
    const url = domain + path + params

    axios.get(url)
      .then(response => {
        if (typeof response.data !== 'undefined') {
          this.candles = response.data.map(candle => {
            return {
              date: new Date(candle[0]),
              open: candle[1],
              close: candle[2],
              high: candle[3],
              low: candle[4]
            }
          })

          this.closes = this.candles.map(candle => candle.close)

          this.mergeSma()
          this.mergeMacd()
          this.mergeRsi()
          this.mergeBullishBearish()
          this.calculatePositions()

          res.send({
            start: {
              btc: this.startBtc + ' (' + this.startBtc * this.candles[0].close + '$)',
              usd: this.startUsd
            },
            end: {
              btc: this.btc + ' (' + this.btc * this.candles[this.candles.length -1].close + '$)',
              usd: this.usd + ' (' + this.usd / this.candles[this.candles.length -1].close + '$)'
            },
            numbers: {
              candles: this.candles.length,
              trades: this.candles.filter(candle => candle.position !== null).length,
              closes: this.closes.length,
            },
            trades: this.candles.filter(candle => candle.position !== null),
            //candles: this.candles
          })
        } else {
          res.status(500).send('Error')
        }
      })
      .catch(e => {
        res.status(e.response.status).send(e)
        console.error(e.response.status)
      })
  }

  /**
   * Add the SMA for a given candle object
   */
  mergeSma = () => {
    const { SMA } = indicators
    const input = {
      values: this.closes,
      period: 8
    }
    const sma = SMA.calculate(input)
    const difference = this.candles.length - sma.length

    let iSma = 0
    for (let i = 0; i < this.candles.length; i++) {
      const candle = this.candles[i]

      if (i >= difference) {
        candle.sma = sma[iSma]

        iSma++
      } else {
        candle.sma = null
      }
    }
  }

  mergeMacd = () => {
    //const { MACD, RSI, SMA, bullish, bearish } = indicators
    const { MACD } = indicators
    const input = {
      values            : this.closes,
      fastPeriod        : 12,
      slowPeriod        : 26,
      signalPeriod      : 9,
      SimpleMAOscillator: false,
      SimpleMASignal    : false
    }

    const macd = MACD.calculate(input)
    const difference = this.candles.length - macd.length

    let iSma = 0
    for (let i = 0; i < this.candles.length; i++) {
      const candle = this.candles[i]

      if (i >= difference) {
        candle.macd = macd[iSma]

        iSma++
      } else {
        candle.macd = null
      }
    }
  }

  mergeBullishBearish = () => {
    const { bullish, bearish } = indicators

    for (let i = 0; i < this.candles.length; i++) {
      const candle = this.candles[i]

      candle.bullish = null
      candle.bearish = null

      if (i >= 7) {
        const trends = this.candles.slice(i - 7, i)

        candle.bullish = bullish({
          open: trends.map(trend => trend.open),
          close: trends.map(trend => trend.close),
          high: trends.map(trend => trend.high),
          low: trends.map(trend => trend.low),
        })

        candle.bearish = bearish({
          open: trends.map(trend => trend.open),
          close: trends.map(trend => trend.close),
          high: trends.map(trend => trend.high),
          low: trends.map(trend => trend.low),
        })
      } else {

      }
    }
  }

  mergeRsi = () => {
    const { RSI } = indicators
    const input = {
      values: this.closes,
      period: 14
    }

    const rsi = RSI.calculate(input)
    const difference = this.candles.length - rsi.length

    let iRsi = 0
    for (let i = 0; i < this.candles.length; i++) {
      const candle = this.candles[i]

      if (i >= difference) {
        candle.rsi = rsi[iRsi]

        iRsi++
      } else {
        candle.rsi = null
      }
    }
  }

  calculatePositions = () => {
    for (let i = 0; i < this.candles.length; i++) {
      const candle = this.candles[i]
      const lastTrade = this.lastTrade

      candle.position = null

      if (this.hasEnoughData(candle)) {
        if (
          this.isBullish(candle) &&
          this.brokeSupport(candle) &&
          (typeof lastTrade.position === 'undefined' || lastTrade.position === 'sell') &&
          this.hasLostEnough(candle)
        ) {
        //if (this.isBullish(candle) && candle.rsi <= 30 && (typeof lastTrade.position === 'undefined' || lastTrade.position === 'sell')) {
          candle.position = 'buy'
          console.log('BUY: ', this.thresholdDecrease, this.percentageDecrease(candle))
          this.lastTrade = candle

          this.btc = this.usd / candle.close
          this.usd = 0
        } else if (
          this.isBearish(candle) &&
          this.brokeResistance(candle) &&
          (typeof lastTrade.position === 'undefined' || lastTrade.position === 'buy') &&
          this.hasGainedEnough(candle)
        ) {
        //} else if (this.isBearish(candle) && candle.rsi >= 70 && (typeof lastTrade.position === 'undefined' || lastTrade.position === 'buy')) {
          candle.position = 'sell'
          console.log('SELL: ', this.thresholdIncrease, this.percentageIncrease(candle))
          this.lastTrade = candle

          this.usd = candle.close * this.btc
          this.btc = 0
        }
      }
    }
  }

  hasEnoughData = data => {
    return (data.macd !== null && typeof data.macd.histogram !== 'undefined') && data.rsi !== null && data.bearish !== null && data.bullish !== null
  }

  hasGainedEnough = data => {
    const percentage = this.percentageIncrease(data)

    if (percentage <= -3 && this.hoursBetween(this.lastTrade.date, data.date) >= 1) {
      this.thresholdIncrease = 2.5
      return true
    }
    const isWithinThreshold = percentage >= this.thresholdIncrease

    if (isWithinThreshold) {
      this.thresholdIncrease = 2.5
    } else {
      this.thresholdIncrease -= 0.01
    }

    return isWithinThreshold
  }

  hasLostEnough = data => {
    const percentage = this.percentageDecrease(data)

    if (percentage <= -1 && this.hoursBetween(this.lastTrade.date, data.date) >= 1) {
      this.thresholdDecrease = 2.5
      return true
    }

    const isWithinThreshold = percentage >= this.thresholdDecrease

    if (isWithinThreshold) {
      this.thresholdDecrease = 2.5
    } else {
      this.thresholdDecrease -= 0.01
    }
    console.log(this.hoursBetween(this.lastTrade.date, data.date))

    return isWithinThreshold
  }

  hoursBetween = (d1, d2) => {
    return ((((Date.parse(d2) - Date.parse(d1)) / 1000) / 60) / 60)
  }

  percentageIncrease = data => {
    return ((data.close - this.lastTrade.close) / this.lastTrade.close) * 100
  }

  percentageDecrease = data => {
    return ((this.lastTrade.close - data.close) / this.lastTrade.close) * 100
  }

  brokeResistance = data => {
    return data.sma <= data.low
  }

  brokeSupport = data => {
    return data.sma >= data.high
  }

  isBullish = data => {
    return data.bullish && !data.bearish
  }

  isBearish = data => {
    return data.bearish && !data.bullish
  }
}

export default new CandleController()
