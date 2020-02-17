import crypto from 'crypto-js'
import TradingController from '../controllers/TradingController.js'
import CandleController from '../controllers/CandleController.js'

class SocketExchange {
  constructor() {
    this.sockets = {
      authenticated: [],
      public: []
    }

    this.endpoint = {
      authenticated: 'wss://api.bitfinex.com/ws/2',
      public: 'wss://api-pub.bitfinex.com/ws/2'
    }
  }

  /**
   * Add a new socket connection to the array
   * 
   * @param {String} type Authenticated or Public
   * @param {Object} socket Websocket oject
   */
  add = (type, socket) => {
    console.log(`New ${type} Exchange Socket connected.`)
    this.sockets[type].push(socket)
  }

  /**
   * List all the connected sockets
   * 
   * @return {Array<Object>} Array of Objects the sockets
   */
  list = () => {
    return this.sockets
  }

  /**
   * Send data to all the connected sockets
   * 
   * @param {Object} data Object to send
   */
  sendAll = data => {
    this.sockets.forEach(socket => {
      socket.send(JSON.stringify(data))
    })
  }

  /**
   * Format the authenticated or public payload for the socket connection
   * 
   * @param {'authenticated'|'public'} type authenticated or public
   * @return {Object} The payload
   */
  getPayload = type => {
    if (type === 'authenticated') {
      const authNonce = Date.now() * 10000 // Generate an ever increasing, single use value. (a timestamp satisfies this criteria)
      const authPayload = 'AUTH' + authNonce // Compile the authentication payload, this is simply the string 'AUTH' prepended to the nonce value
      const authSig = crypto.HmacSHA384(authPayload, process.env.API_SECRET).toString(crypto.enc.Hex) // The authentication payload i
      const apiKey = process.env.API_PUBLIC

      return {
        apiKey, //API key
        authSig, //Authentication Sig
        authNonce,
        authPayload,
        event: 'auth', // The connection event, will always equal 'auth'
        filter: [
          'balance',
          'trading',
          'wallet'
        ]
      }
    } else {
      return { 
        event: 'subscribe', 
        channel: 'candles', 
        key: 'trade:5m:tBTCUSD' //'trade:TIMEFRAME:SYMBOL'
      }
    }
  }

  /**
   * Delegate an event to the right controller to be handled
   * 
   * @param {'authenticated'|'public'} type authenticated or public
   * @return {Array|Object} The payload
   */
  delegateEvent = (type, data) => {
    // Ignore Heartbeat event
    if (data[1] !== 'hb') {
      if (type === 'authenticated') {
        TradingController.handleEvent(data)
      } else {
        CandleController.handleEvent(data)
      }
    }
  }
}

export default new SocketExchange()