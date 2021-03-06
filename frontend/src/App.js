import React, { PureComponent } from 'react'
import axios from 'axios'
import Chart from 'react-google-charts'
import Routes from './routes'

import './App.css'

class App extends PureComponent {
  state = {
    balance: {},
    candles: [],
    trades: [],
    wallets: []
  }

  componentDidMount() {
    this.openSocket()
  }

  openSocket = () => {
    const ws = new WebSocket(Routes.sockets.candles)

    ws.addEventListener('open', () => {
      ws.addEventListener('message', msg => {
        const response = JSON.parse(msg.data)
        const event = response.event
        console.log(response)
        
        if (event === 'init') {
          const candles = response.data.candles.map(candle => {
            return this.formatCandle(candle)
          })

          const { balance, trades, wallets} = response.data

          this.setState({balance, candles, trades: trades.reverse(), wallets})
        } else if (event === 'cn') {
          const candle = this.formatCandle(response.data)

          this.setState(prevState => ({
            candles: [ ...prevState.candles, candle ]
          }))
        } else if (event === 'cu') {
          const candle = this.formatCandle(response.data)

          this.setState(prevState => ({
            candles: [ ...prevState.candles.splice(0, prevState.candles.length - 1), candle ]
          }))
        } else if (event === 'bu') {
          this.setState({
            balance: response.data
          })
        } else if (event === 'wu') {
          const walletIndex = this.state.wallets.findIndex(wallet => wallet.currency === response.data.currency)

          if (walletIndex >= 0) {
            this.setState(prevState => ({
              wallets: [ ...prevState.wallets.splice(0, walletIndex), response.data, ...prevState.wallets.splice(walletIndex + 1) ]
            }))
          } else {
            this.setState(prevState => ({
              wallets: [ ...prevState.wallets, [response.data] ]
            }))
          }
        } else if (event === 'te') {
          const trade = response.data

          this.setState(prevState => ({
            trades: [ ...prevState.trades.splice(0, prevState.trades.length - 1), trade ]
          }))
        }
      })
    })
  }

  formatCandle = data => {
    return [
      new Date(data.date),
      data.close,
      data.position,
      '<pre><code>' + JSON.stringify(data, null, 2) + '</code></pre>'
    ]
  }

  fetchCandles = () => {
    axios.get(Routes.candles.fetch + '?period=7&ticker=tBTCUSD')
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

  isNotLoss = (trade, previousTrade) => {
    if (Math.sign(trade.exec_amount) === 1) {
      return true
    }

    return trade.exec_price < previousTrade.exec_price
  }

  updatePageTitle = () => {
    const candles = this.state.candles

    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1]

      document.title = `BTCUSD ${lastCandle[1]}`
    }
  }

  render() {
    const { balance, candles, trades, wallets } = this.state

    this.updatePageTitle()

    return (
      <div className="App">
        { candles.length > 0 &&
        <h1>{candles[candles.length - 1][1]}</h1>
        }
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto' }}>
          <div>
            <h2>BALANCE</h2>
            {typeof balance.aum !== 'undefined' &&
              <p>${balance.aum.toFixed(2)}</p>
            }
          </div>

          <div>
            <h2>WALLETS</h2>
            { wallets.map(wallet => (
              <p key={`wallet-${wallet.currency}`}>{wallet.currency}: {wallet.balance_available}</p>
            ))}
          </div>
        </div>
        
        
        {candles && candles.length > 0 &&
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto' }}>
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
              actions: ['dragToZoom', 'rightClickToReset']
            }
          }}
          rootProps={{ 'data-testid': '1' }}
        />

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <ul className="list-group list-group-flush">
            {trades.map((trade, i) => (
              <li className={"list-group-item " + (( (i + 1) < trades.length && this.isNotLoss(trade, trades[i + 1])) ? '' : 'list-group-item-danger')} key={trade.exec_price}>
                {Math.sign(trade.exec_amount) === 1 ? 'BUY' : 'SELL'} <br/>
                {trade.exec_price}
              </li>
            ))}
          </ul>
          </div>
        </div>
        }
      </div>
    );
  }
}

export default App
