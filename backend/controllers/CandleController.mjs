import axios from 'axios'
import Candle from '../models/Candle.mjs'
import AppController from './AppController.mjs'
import SocketExchangeController from './SocketExchangeController.mjs'

// TODO:
//  Send balance and wallet snapshots only when the client connects
class CandleController extends AppController {
  constructor(model) {
    super(model)

    this.fetch()
  }
  
  /**
   * Handle a Websocket message event
   * 
   * @param {Array|Object} data message event from WebSocket
   */
  handleEvent = data => {
    this.model.handleEvent(data)
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

  /**
   * Return the initial response when ia new Client WebSock connects
   * 
   * @return {Object} Event object to send to the Client
   */
  fetchInit = () => {
    return this.model.formatInit()
  }

  fetch = async () => {
    const period =  3
    const timeframe =  '5m'
    const ticker = 'tBTCUSD'

    const now = Date.now()
    const startPeriod = now - (1000 * 60 * 60 * 24 * period)

    const domain = 'https://api-pub.bitfinex.com/v2/'
    const path = 'candles/trade:' + timeframe + ':' + ticker + '/hist'
    const params = '?sort=1&limit=10000&start=' + startPeriod

    const url = domain + path + params

    axios.get(url)
      .then(response => {
        if (typeof response.data !== 'undefined') {
          this.model.candles = this.model.formatCandlesArray(response.data)
          this.model.closes = this.model.candles.map(candle => candle.close)
          this.model.mergeIndicators()

          //this.openSocketBitfinex()
          
          // this.connectSocketExchange()
          SocketExchangeController.connect('authenticated')
        } else {
          throw new Error("The response is not properly formatted.")
        }
      })
      .catch(e => {
        console.error(e)
      })
  }
}

export default new CandleController(Candle)
