import axios from 'axios'
import crypto from 'crypto-js'
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
    const apiKey = process.env.API_PUBLIC
    const apiSecret = process.env.API_SECRET
    const apiPath = 'v2/auth/r/trades/tBTCUSD/hist'
    const nonce = (Date.now() * 1000).toString()
    const body = {
      limit: 50
    }
    const signature = `/api/${apiPath}${nonce}${JSON.stringify(body)}`
    const sig = crypto.HmacSHA384(signature, apiSecret).toString() 
    const url = `https://api.bitfinex.com/${apiPath}`
    const config = {
      headers: {
        'bfx-nonce': nonce,
        'bfx-apikey': apiKey,
        'bfx-signature': sig
      }
    }

    axios.post(url, body, config)
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
}

export default new TradingController(Trading)