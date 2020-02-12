import axios from 'axios'
import AppController from './AppController.mjs'
import SocketExchangeController from './SocketExchangeController.mjs'
import Trading from '../models/Trading.mjs'

class TradingController extends AppController {
  constructor(model) {
    super(model)

    this.fetchTrades()
  }

  /**
   * Handle a Websocket message event
   * 
   * @param {Array|Object} data message event from WebSocket
   */
  handleEvent = data => {
    // Successfully connected to the private websocket, subscribe to the candles from the public websocket
    if (data.event === 'auth' && data.status === 'OK') {
      SocketExchangeController.connect('public')
    }

    this.model.handleEvent(data)
  }

  /**
   * Calculate the position of a candle
   * 
   * @param {Object} data Candle from the Candle model
   */
  calculatePosition = data => {
    return this.model.calculatePosition(data)
  }

  /**
   * Request the exchange REST API to get the trades history
   */
  fetchTrades = () => {
    const params =  { limit: 50 }
    const { url, headers } = this.model.getRestConfig('trades', params)
    const config = { headers }

    axios.post(url, params, config)
      .then(res => {
        this.model.setTrades(res.data)
      })
      .catch(e => {
        console.error(e.response.data)
      })
  }

  /**
   * Return the balance
   * 
   * @return {Object} Balance object
   */
  getBalance = () => {
    return this.model.balance
  }
  
  /**
   * Return the wallets
   * 
   * @return {Array} Wallets array
   */
  getWallets = () => {
    return this.model.wallets
  }
  
  /**
   * Return the trades
   * 
   * @return {Array} Trades array
   */
  getTrades = () => {
    return this.model.trades
  }

  newOrder = data => {
    const isSell = data.position === 'sell'
    const walletBTC = this.model.wallets.find(wallet => wallet.currency === 'BTC')
    const walletUSD = this.model.wallets.find(wallet => wallet.currency === 'USD')
    const walletNeeded = isSell ? walletBTC : walletUSD
    
    if (['buy', 'sell'].includes(data.position) && typeof walletNeeded !== 'undefined') {
      const price = data.close.toString()
      const amount = (isSell ? -walletBTC.balance_available : walletUSD.balance_available / data.close).toString()

      if (amount !== 0) {
        const params = {
          type: 'EXCHANGE MARKET',
          symbol: 'tBTCUSD',
          price,
          amount
          // flags: 0, // optional param to add flags
          // meta: {aff_code: "AFF_CODE_HERE"} // optional param to pass an affiliate code
        }
        const { url, headers } = this.model.getRestConfig('newOrder', params)
        const config = { headers }
  
        axios.post(url, params, config)
        .then(res => {
          console.log(res.data)
        })
        .catch(e => {
          console.error(e.response.data)
        })
      }
    }
  }
}

export default new TradingController(Trading)