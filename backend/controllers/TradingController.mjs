import AppController from './AppController.mjs'
import SocketExchangeController from './SocketExchangeController.mjs'
import Trading from '../models/Trading.mjs'

class TradingController extends AppController {
  constructor(model) {
    super(model)
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
   * Return the balance
   * 
   * @return {Object} Balance object
   */
  fetchBalance = () => {
    return this.model.balance
  }
  
  /**
   * Return the wallets
   * 
   * @return {Array} Wallets array
   */
  fetchWallets = () => {
    return this.model.wallets
  }
}

export default new TradingController(Trading)