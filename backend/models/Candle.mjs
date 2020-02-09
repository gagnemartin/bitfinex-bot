import indicators from 'technicalindicators'
import TradingController from '../controllers/TradingController.mjs'
import WebSocketClients from '../websockets/WebSocketClients.mjs'

class Candle {
  constructor() {
    this.candles = []
    this.closes = []
  }

  /**
   * Merge all the indicators needed in a candle oject
   */
  mergeIndicators = () => {
    this.mergeSma()
    this.mergeMacd()
    this.mergeRsi()
    this.mergeBullishBearish()
    this.mergeLowests()
    this.mergeHighests()
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

  /**
   * Add the MACD for a given candle object
   */
  mergeMacd = () => {
    //const { MACD, RSI, SMA, bullish, bearish } = indicators
    const { MACD } = indicators
    const input = {
      values: this.closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
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

  /**
   * Add the Bullshish and Bearish for a given candle object
   */
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

  /**
   * Add the RSI for a given candle object
   */
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

  /**
   * Add the lowest price in a timeframe for a given candle object
   */
  mergeLowests = () => {
    const { Lowest } = indicators
    const { inputShort, inputLong } = this.barriersInputs()

    const short = Lowest.calculate(inputShort)
    const long = Lowest.calculate(inputLong)

    this.mergeBarriers('support', short, long)
  }

  /**
   * Add the highest price in a timeframe for a given candle object
   */
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

  /**
   * Format the object for the highest or lowest in a timeframe
   */
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

  /**
   * Format the object for averages in a timeframe
   */
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

  /**
   * Add the resistance and support for a given candle
   */
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

  /**
   * Formats an array of well format candle objects
   * 
   * @param {Array} candles Array of the candles
   * @returns {Array} Well formated array of objects
   */
  formatCandlesArray = candles => {
    return candles.map(candle => this.formatCandleObject(candle))
  }

  /**
   * Formats a well formated object of a candle
   * 
   * @param {Array} candle Array of a single candle
   * @returns {Object} Well formated object of a candle
   */
  formatCandleObject = candle => {
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
  }

  handleEvent = data => {
    data = data[1]
    if (typeof data !== 'undefined' && data.length === 6) {
      const candle = this.formatCandleObject(data)
      const lastCandle = this.candles[this.candles.length - 1]
      const secondLastCandle = this.candles[this.candles.length - 2]
      // cu = Candle Update
      // cn = Candle New
      let event = 'cu'
      let shouldCalculatePosition = true

      // Update latest candle
      if (candle.date.getTime() === lastCandle.date.getTime()) {
        this.candles[this.candles.length - 1] = candle
      } else if (candle.date.getTime() > secondLastCandle.date.getTime()) {
        // Push new candle
        this.candles.push(candle)
        event = 'cn'

        if (this.candles.length > 900) {
          this.candles.shift()
        }
      } else {
        // It's the previous candle, do nothing.
        shouldCalculatePosition = false
      }

      if (shouldCalculatePosition) {
        this.closes = this.candles.map(candle => candle.close)

        this.mergeIndicators()
        this.candles[this.candles.length -1].position = TradingController.calculatePosition(candle)

        WebSocketClients.sendAll({
          data: this.candles[this.candles.length - 1],
          event
        })
      }
    }
  }

  /**
   * Format the initial response when ia new Client WebSock connects
   * 
   * @return {Object} Event object to send to the Client
   */
  formatInit = () => {
    const candles = this.candles
    const trades = TradingController.getTrades()
    const balance = TradingController.getBalance()
    const wallets = TradingController.getWallets()

    const response = {
      trades,
      candles,
      balance,
      wallets
    }

    return { event: 'init', data: response }
  }
}

export default new Candle()