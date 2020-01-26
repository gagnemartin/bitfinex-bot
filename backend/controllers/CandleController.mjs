import axios from 'axios'
import indicators from 'technicalindicators'
import AppController from './AppController.mjs'

// TODO:
//  Detect short term big gains or loss changes and hodl until the trend inverts
class CandleController extends AppController {
  constructor(model) {
    super(model)

    this.reset()
  }

  reset = () => {
    this.candles = []
    this.closes = []
    this.lastTrade = { position: 'buy', close: 7219.3 }
    this.thresholdIncrease = this.resetThreshold('thresholdIncrease')
    this.thresholdDecrease = this.resetThreshold('thresholdDecrease')

    //this.startBtc = 1
    this.startBtc = 0.01315
    //this.startUsd = 7219.3
    this.startUsd = 0.19332
    this.btc = this.startBtc
    this.usd = this.startUsd
  }
  
  resetThreshold = key => {
    let threshold = 2.5

    // Change if we want to have a different threshold for decreases
    if (key === 'thresholdDecrease') {
      threshold = 2.5
    }

    return threshold
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
    this.reset()
    console.log(process.env.TEST)

    const query = req.query
    const period = parseInt(query.period) || 7
    const timeframe = ['5m', '15m', '30m', '1h'].includes(query.timeframe) ? query.timeframe : '5m'
    const ticker = query.ticker || 'tBTCUSD'

    const now = Date.now()
    const startPeriod = now - (1000 * 60 * 60 * 24 * period)

    const domain = 'https://api-pub.bitfinex.com/v2/'
    const path = 'candles/trade:' + timeframe + ':' + ticker + '/hist'
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
              low: candle[4],
              volume: candle[5],
              macd: null,
              rsi: null,
              sma: null,
              bullish: null,
              bearish: null,
              support_short: null,
              support_long: null,
              resistance_short: null,
              resistance_long: null,
              position: null,
              gain_short: null,
              gain_long: null,
              loss_short: null,
              loss_long: null
            }
          })

          this.closes = this.candles.map(candle => candle.close)

          this.mergeSma()
          this.mergeMacd()
          this.mergeRsi()
          this.mergeBullishBearish()
          this.mergeLowests()
          this.mergeHighests()
          this.calculatePositions()

          const trades = this.candles.filter(candle => candle.position !== null)

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
              trades: trades.length,
              closes: this.closes.length,
            },
            trades: trades,
            candles: this.candles
          })
        } else {
          res.status(500).send('Error')
        }
      })
      .catch(e => {
        res.status(500).send(e)
        console.error(e)
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

  mergeLowests = () => {
    const { Lowest } = indicators
    const { inputShort, inputLong } = this.barriersInputs()

    const short = Lowest.calculate(inputShort)
    const long = Lowest.calculate(inputLong)

    this.mergeBarriers('support', short, long)
  }

  mergeHighests = () => {
    const { Highest, AverageGain, AverageLoss } = indicators
    const { inputShort, inputLong } = this.barriersInputs()
    const { inputShortAverage, inputLongAverage } = this.averagesInputs()

    const short = Highest.calculate(inputShort)
    const long = Highest.calculate(inputLong)

    const short2 = AverageGain.calculate(inputShortAverage)
    const long2 = AverageGain.calculate(inputLongAverage)

    const short3 = AverageLoss.calculate(inputShortAverage)
    const long3 = AverageLoss.calculate(inputLongAverage)

    this.mergeBarriers('resistance', short, long)
    this.mergeBarriers('gain', short2, long2)
    this.mergeBarriers('loss', short3, long3)
  }

  barriersInputs = () => {
    const closes = this.closes

    return {
      inputShort: {
        values: closes,
        period: 12 // 1h at 5 min per candle
      },
      inputLong: {
        values: closes,
        period: 12 * 24 // 24h at 5 min per candle
      }
    }
  }

  averagesInputs = () => {
    const closes = this.closes

    return {
      inputShortAverage: {
        values: closes,
        period: 3 // 30 minutes at 5 minutes per candle
      },
      inputLongAverage: {
        values: closes,
        period: 12 // 1 hour at 5 minutes per candle
      }
    }
  }

  mergeBarriers = (prefix, short, long) => {
    const keyShort = prefix + '_short'
    const keyLong = prefix + '_long'
    const differenceShort = this.candles.length - short.length
    const differenceLong = this.candles.length - long.length

    let cShort = 0
    let cLong = 0
    for (let i = 0; i < this.candles.length; i++) {
      const candle = this.candles[i]

      candle[keyShort] = null
      candle[keyLong] = null

      if (i >= differenceShort) {
        candle[keyShort] = short[cShort]

        cShort++
      }

      if (i >= differenceLong) {
        candle[keyLong] = long[cLong]

        cLong++
      }
    }
  }

  calculatePositions = () => {
    for (let i = 0; i < this.candles.length; i++) {
      const candle = this.candles[i]

      if (this.hasEnoughData(candle)) {
        if (this.shouldBuy(candle)) {
          candle.position = 'buy'
          this.lastTrade = candle

          this.btc = this.usd / candle.close
          this.usd = 0

          // console.log('\x1b[32m', '************** BUY **************')
          // console.log('Btc: ', this.btc)
          // console.log('Price: ', candle.close)
          // console.log(' ')
        } else if (this.shouldSell(candle)) {
          candle.position = 'sell'
          this.lastTrade = candle

          this.usd = candle.close * this.btc
          this.btc = 0

          // console.log('\x1b[33m', '************** SELL **************')
          // console.log('Price: ', candle.close)
          // console.log(' ')
        }
      }
    }
  }

  hasEnoughData = data => {
    return (data.macd !== null &&
      typeof data.macd.histogram !== 'undefined') &&
      data.rsi !== null &&
      data.bearish !== null &&
      data.bullish !== null &&
      data.resistance_short !== null &&
      data.resistance_long !== null &&
      data.support_short !== null &&
      data.support_long !== null
  }

  shouldBuy = data => {
    const lastTrade = this.lastTrade

    // Can't buy 2 times in a row
    if (lastTrade.position === 'sell') {
      const isNearShort = this.isNearBarrier('support_short', data)
      const isNearLong = this.isNearBarrier('support_long', data)
      const isTrendingUp = this.isTrendingUp(data)
      const hasLostEnough = this.hasLostEnough(data, isTrendingUp)

      if (isTrendingUp) {
        if (data.gain_short < data.loss_short && hasLostEnough) {
          return true
        }
      } else {
        if (data.gain_long < data.loss_long && hasLostEnough) {
          return true
        }
      }

      // if (this.isStableTrend(data)) {
      //   if ((isNearShort || isNearLong) && hasLostEnough) {
      //     console.log('HRE')
      //     return true
      //   }
      // } else {
        // if (!isTrendingUp) {
        //   if (isNearLong && hasLostEnough) {
        //     return true
        //   }
        // }
      // }
    }

    return false
  }

  shouldSell = data => {
    const lastTrade = this.lastTrade

    // Can't sell 2 times in a row
    if (lastTrade.position === 'buy') {
      // If trending up (gain long > loss long)
        // HODL till long loss
      // Else (trending down -> gain long < loss long)
        // Sell on short gain
      const isNearShort = this.isNearBarrier('resistance_short', data)
      const isNearLong = this.isNearBarrier('resistance_long', data)
      const isTrendingUp = this.isTrendingUp(data)
      const hasGainedEnough = this.hasGainedEnough(data, isTrendingUp)
      const percentageIncrease = this.percentageIncrease(data)

      if (isTrendingUp) {
        if (data.gain_long > data.loss_long && hasGainedEnough) {
          return true
        }
      } else {
        if (data.gain_short > data.loss_short && hasGainedEnough) {
          return true
        }
      }

      // if (this.isStableTrend(data)) {
      //   if ((isNearShort || isNearLong) && hasGainedEnough) {
      //     return true
      //   }
      // } else {
        // if (!isTrendingUp) {
        //    if (isNearLong && hasGainedEnough) {
        //      return true
        //    }
        // }
      // }
    }

    return false
  }
  
  isTrendingUp = data => {
    const lastTrade = this.lastTrade

    return (data.gain_short > data.loss_short) && data.close > lastTrade.close
  }

  isStableTrend = data => {
    const difference = this.percentageDifference(data.gain_long, data.loss_long)

    return  difference <= 0.05 && difference >= -0.05
  }

  percentageDifference = (n1, n2) => {
    return ((n1 - n2) / ((n1 + n2) / 2)) * 100
  }

  isNearBarrier = (key, data) => {
    return this.percentageDifference(data.close, data[key]) <= 0.5
  }

  /*
   * Detect if the coin has gained enough before selling
   * If the price drops
   */
  hasGainedEnough = (data, isTrendingUp) => {
    const percentage = this.percentageIncrease(data)
    const percentageThreshold = isTrendingUp ? -1 : -3
    const hoursBetweenThreshold = isTrendingUp ? 3 : 1

    if (percentage <= percentageThreshold && this.hoursBetween(this.lastTrade.date, data.date) >= hoursBetweenThreshold) {
      this.thresholdIncrease = this.resetThreshold('thresholdIncrease')
      return true
    }

    const isWithinThreshold = percentage >= this.thresholdIncrease

    if (isWithinThreshold) {
      this.thresholdIncrease = this.resetThreshold('thresholdIncrease')
    } else {
      this.thresholdIncrease -= 0.05
    }

    return isWithinThreshold
  }

  hasLostEnough = (data, isTrendingUp) => {
    const percentage = this.percentageDecrease(data)
    const percentageThreshold = isTrendingUp ? -3 : -1
    const hoursBetweenThreshold = isTrendingUp ? 1 : 3

    if (percentage <= percentageThreshold && this.hoursBetween(this.lastTrade.date, data.date) >= hoursBetweenThreshold) {
      this.thresholdDecrease = this.resetThreshold('thresholdDecrease')
      return true
    }

    const isWithinThreshold = percentage >= this.thresholdDecrease

    if (isWithinThreshold) {
      this.thresholdDecrease = this.resetThreshold('thresholdDecrease')
    } else {
      this.thresholdDecrease -= 0.05
    }

    // console.log(this.hoursBetween(this.lastTrade.date, data.date))

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

  // isTrendingUp = data => {
  //   return data.sma <= data.close
  // }

  // isTrendingDown = data => {
  //   return data.sma >= data.open
  // }

  isBullish = data => {
    return data.bullish && !data.bearish //&& data.close >= data.open
  }

  isBearish = data => {
    return data.bearish && !data.bullish //&& data.close <= data.open
  }

  isMacdBuyPosition = data => {
    return data.macd.MACD <= data.macd.signal
  }

  isMacdSellPosition = data => {
    return data.macd.signal >= data.macd.MACD
  }
}

export default new CandleController()
