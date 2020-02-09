import WebSocketClients from '../websockets/WebSocketClients.mjs'

class Trading {
  constructor() {
    this.balance = {}
    this.trades = []
    this.wallets = []
    this.lastTrade = { position: 'buy', close: 7219.3 }
    this.thresholdIncrease = this.resetThreshold('thresholdIncrease')
    this.thresholdDecrease = this.resetThreshold('thresholdDecrease')
  }

  /**
   * Handle a Websocket message event
   * 
   * @param {Array|Object} data Message event from WebSocket
   */
  handleEvent = data => {
    const event = data [1]

    if (['bu', 'bs', 'wu', 'ws'].includes(event)) {
      // Balance and Wallets snapshots
      if (['bs', 'ws'].includes(event)) {
        data[2].forEach(data => {
          if (event === 'bs') {
            const snapshot = this.formatBalanceData(data)

            this.updateBalance(snapshot)
          } else {
            const snapshot = this.formatWalletData(data)

            this.updateWallets(snapshot)
          }
        })
      } else {
        this.sendEvent(event, data[2])
      }
    } else if (['te', 'tu'].includes(event)) {
      console.log('TRADE:', data[2])
    } else if (['os', 'on', 'ou', 'oc'].includes(event)) {
      console.log('ORDER:', data)
    }
  }

  /**
   * Update the balance object
   * 
   * @param {Object} data Balance object
   */
  updateBalance = data => {
    this.balance = data
  }

  /**
   * Update the wallets array from a wallet object
   * 
   * @param {Object} data Wallet object
   */
  updateWallets = data => {
    const index = this.wallets.findIndex(wallet => wallet.currency === data.currency)

    if (index >= 0) {
      this.wallets[index] = data
    } else {
      this.wallets.push(data)
    }
  }

  /**
   * Format the balance data from an array to an object
   * 
   * @param {Array} data Balance array from WebSocket
   * @return {Object} Object of the balance
   */
  formatBalanceData = data => {
    return {
      aum: data[0],
      aum_net: data[1]
    }
  }

  /**
   * Format the wallet data from an array to an object
   * 
   * @param {Array} data Wallet array from WebSocket
   * @return {Object} Object of the Wallet
   */
  formatWalletData = data => {
    const newData = {}
    const keys = ['wallet_type', 'currency', 'balance', 'unsettled_interest', 'balance_available', 'description', 'meta']
          
    keys.forEach((key, i) => {
      newData[key] = data[i]
    })

    return newData
  }

  /**
   * Send an event for the Client via WebSocket
   * 
   * @param {String} event Name of the event
   * @param {Array} eventData Array data from the Exchange WebSocket
   */
  sendEvent = (event, eventData) => {
    const data = {
      data: {},
      event
    }

    if (event === 'bu') {
      data.data = this.formatBalanceData(eventData)
      this.updateBalance(data.data)
    } else {
      data.data = this.formatWalletData(eventData)
      this.updateWallets(data.data)
    }
    
    WebSocketClients.sendAll(data)
  }

  /**
   * Calculate the position of a candle
   * 
   * @param {Object} data Candle from the Candle model
   */
  calculatePosition = data => {
    const candle = data

    if (this.hasEnoughData(candle)) {
      if (this.shouldBuy(candle)) {
        this.lastTrade = candle

        this.btc = this.usd / candle.close
        this.usd = 0

        console.log('\x1b[32m', '************** BUY **************')
        console.log('Btc: ', this.btc)
        console.log('Price: ', candle.close)
        console.log(' ')

        return 'buy'
      } else if (this.shouldSell(candle)) {
        this.lastTrade = candle

        console.log('\x1b[33m', '************** SELL **************')
        console.log('Price: ', candle.close)
        console.log(' ')

        return 'sell'
      } else {
        return null
      }
    }

    return null
  }

  /**
   * If a candle has enough data to calculate a position
   * 
   * @param {Object} data Candle from the Candle model
   * @return {Boolean} Has enough data or not
   */
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

  /**
   * If a BUY order should be placed
   * 
   * @param {Object} data Candle from the Candle model
   * @return {Boolean} Should buy or not
   */
  shouldBuy = data => {
    const lastTrade = this.lastTrade

    // Can't buy 2 times in a row
    if (lastTrade.position === 'sell') {
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
    }

    return false
  }

  /**
   * If a SELL order should be placed
   * 
   * @param {Object} data Candle from the Candle model
   * @return {Boolean} Should sell or not
   */
  shouldSell = data => {
    const lastTrade = this.lastTrade

    // Can't sell 2 times in a row
    if (lastTrade.position === 'buy') {
      // If trending up (gain long > loss long)
        // HODL till long loss
      // Else (trending down -> gain long < loss long)
        // Sell on short gain
      const isTrendingUp = this.isTrendingUp(data)
      const hasGainedEnough = this.hasGainedEnough(data, isTrendingUp)

      if (isTrendingUp) {
        if (data.gain_long > data.loss_long && hasGainedEnough) {
          return true
        }
      } else {
        if (data.gain_short > data.loss_short && hasGainedEnough) {
          return true
        }
      }
    }

    return false
  }

  isTrendingUp = data => {
    const lastTrade = this.lastTrade

    return (data.gain_short > data.loss_short) && data.close > lastTrade.close
  }

  /**
   * Detect if the coin has gained enough before selling
   *
   * @param {Object} data Candle from the Candle model
   * @param {Boolean} isTrendingUp If the trend is up or not
   * @return {Boolean} Has gained enough or not
   */
  hasGainedEnough = (data, isTrendingUp) => {
    const percentage = this.percentageIncrease(data)
    const percentageThreshold = isTrendingUp ? -1 : -3
    const hoursBetweenThreshold = isTrendingUp ? 3 : 0.3
    const increaseThreshold = isTrendingUp ? 0.005 : 0.05

    if (percentage <= percentageThreshold && this.hoursBetween(this.lastTrade.date, data.date) >= hoursBetweenThreshold) {
      this.thresholdIncrease = this.resetThreshold('thresholdIncrease')
      return true
    }

    const isWithinThreshold = percentage >= this.thresholdIncrease

    if (isWithinThreshold) {
      this.thresholdIncrease = this.resetThreshold('thresholdIncrease')
    } else {
      this.thresholdIncrease -= increaseThreshold
    }

    return isWithinThreshold
  }

  /**
   * Detect if the coin has lost enough before buying
   *
   * @param {Object} data Candle from the Candle model
   * @param {Boolean} isTrendingUp If the trend is up or not
   * @return {Boolean} Has lost enough or not
   */
  hasLostEnough = (data, isTrendingUp) => {
    const percentage = this.percentageDecrease(data)
    const percentageThreshold = isTrendingUp ? -3 : -1
    const hoursBetweenThreshold = isTrendingUp ? 0.3 : 5
    const decreaseThreshold = isTrendingUp ? 0.3 : 0.05

    if (percentage <= percentageThreshold && this.hoursBetween(this.lastTrade.date, data.date) >= hoursBetweenThreshold) {
      this.thresholdDecrease = this.resetThreshold('thresholdDecrease')
      return true
    }

    const isWithinThreshold = percentage >= this.thresholdDecrease

    if (isWithinThreshold) {
      this.thresholdDecrease = this.resetThreshold('thresholdDecrease')
    } else {
      this.thresholdDecrease -= decreaseThreshold
    }

    return isWithinThreshold
  }

  /**
   * Calculate the hours between 2 dates
   * 
   * @param {Date} d1 Date
   * @param {Date} d2 Date
   * @return {Number} Number of hours
   */
  hoursBetween = (d1, d2) => {
    return ((((Date.parse(d2) - Date.parse(d1)) / 1000) / 60) / 60)
  }

  /**
   * Calculate the percentage increase from the last trade
   * 
   * @param {Object} data Candle from the Candle model
   * @return {Number} Float of a percentage
   */
  percentageIncrease = data => {
    return ((data.close - this.lastTrade.close) / this.lastTrade.close) * 100
  }

  /**
   * Calculate the percentage decrease from the last trade
   * 
   * @param {Object} data Candle from the Candle model
   * @return {Number} Float of a percentage
   */
  percentageDecrease = data => {
    return ((this.lastTrade.close - data.close) / this.lastTrade.close) * 100
  }

  /**
   * Reset the threshold for a given key
   * 
   * @param {'thresholdIncrease'|'thresholdDecrease'} key Threshold key
   * @return {Number} Float of the default threshold
   */
  resetThreshold = key => {
    let threshold = 2.5

    // Change if we want to have a different threshold for decreases
    if (key === 'thresholdDecrease') {
      threshold = 2.5
    }

    return threshold
  }
}

export default new Trading()