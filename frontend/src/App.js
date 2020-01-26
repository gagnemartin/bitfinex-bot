import React, { PureComponent } from 'react'
import './App.css'
import axios from 'axios'
import Chart from 'react-google-charts'
import Routes from './routes'

class App extends PureComponent {
  state = {
    candles: [],
    trades: []
  }

  componentDidMount() {
    this.fetchCandles()
    //this.openSocket()
  }

  fetchCandles = () => {
    axios.get(Routes.candles.fetch + '?period=14&ticker=tBTCUSD')
      .then(res => {
        const data = res.data

        if (typeof data !== 'undefined' && typeof data.candles !== 'undefined' && data.trades !== 'undefined') {
          const candles = data.candles.map(candle => {
            return [
              new Date(candle.date),
              candle.close,
              candle.position,
              '<pre><code>' + JSON.stringify(candle, null, 2) + '</code></pre>'
            ]
          })
  
          const trades = data.trades
  
          this.setState({ candles, trades })
        }
        
      })
      .catch(e => {
        console.error(e)
      })
  }

  openSocket = () => {
    const apiKey = 'xxx' // Users API credentials are defined here
    const apiSecret = 'xxx'

    const authNonce = Date.now() * 1000 // Generate an ever increasing, single use value. (a timestamp satisfies this criteria)
    const authPayload = 'AUTH' + authNonce // Compile the authentication payload, this is simply the string 'AUTH' prepended to the nonce value
    const authSig = crypto.HmacSHA384(authPayload, apiSecret).toString(crypto.enc.Hex) // The authentication payload is hashed using the private key, the resulting hash is output as a hexadecimal string

    const payload = {
      apiKey, //API key
      authSig, //Authentication Sig
      authNonce,
      authPayload,
      event: 'auth', // The connection event, will always equal 'auth'
    }

    const wss = new WebSocket('wss://api.bitfinex.com/ws/2') // Create new Websocket

    wss.onopen = () => {
      console.log("connected websocket main component")

      wss.send(JSON.stringify(payload))
    }

    wss.onerror = (e) => {
      console.error(e)
    }

    wss.onmessage = (res) => {
      let response = JSON.parse(res.data)
      console.log(response)
    }
  }

  claculateStartEnd = () => {
    const trades = this.state.trades
    const data = {
      start: { btc: 0.01315, usd: 0.19332 },
      end: { btc: 0.01315, usd: 0.19332 }
    }

    if (trades.length > 0) {
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i]

        if (trade.position === 'sell') {
          data.end.usd = trade.close * data.end.btc
          data.end.btc = 0
        } else {
          data.end.btc = data.end.usd / trade.close
          data.end.usd = 0
        }
      }
    }

    return data
  }

  render() {
    const { candles } = this.state
    const { start, end } = this.claculateStartEnd()
    const difference = end.btc - start.btc
    const differencePercentage = ((end.btc - start.btc) / start.btc) * 100

    return (
      <div className="App">
        <p>
          Start: {start.btc} <br/>
          End: {end.btc} <br/>
          { (differencePercentage > 0 ? '+' : '') }{differencePercentage.toFixed(2)}% ({ (difference > 0 ? '+' : '') }{difference})
        </p>
        {candles && candles.length > 0 &&
        <Chart
          width="100%"
          height={1000}
          chartType="LineChart"
          loader={<div>Loading Chart</div>}
          rows={candles}
          columns={[
            { type: 'date', label: 'Date' },
            { type: 'number', label: 'Close' },
            { role: 'annotation' },
            { role: 'tooltip', 'p': {'html': true} }
          ]}
          options={{
            tooltip: {isHtml: true},
            legend: 'none',
            explorer: {
              axis: 'horizontal',
              keepInBounds: true,
              zoomDelta: 1.1,
              maxZoomIn: 0.08,
              actions: ['dragToZoom']
            }
          }}
          rootProps={{ 'data-testid': '1' }}
        />
        }
      </div>
    );
  }
}

export default App
