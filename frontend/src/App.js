import React, { PureComponent } from 'react'
import axios from 'axios'
import Chart from 'react-google-charts'
import Routes from './routes'

import './App.css'

class App extends PureComponent {
  state = {
    candles: [],
    trades: []
  }

  componentDidMount() {
    //this.fetchCandles()
    this.openSocket()
  }

  openSocket = () => {
    const ws = new WebSocket(Routes.candles.socket.replace('http', 'ws').replace('4000', '8080'))

    ws.addEventListener('open', () => {
      ws.addEventListener('message', res => {
        const event = JSON.parse(res.data)
        console.log(event.data)
        
        if (event.eventName === 'init') {
          const candles = event.data.candles.map(candle => {
            return [
              new Date(candle.date),
              candle.close,
              candle.position,
              '<pre><code>' + JSON.stringify(candle, null, 2) + '</code></pre>'
            ]
          })

          const trades = event.data.trades

          this.setState({candles, trades})
        }
      })
    })
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

  isNotLoss = (position, close, lastClose) => {
    if (position === 'sell') {
      return true
    }

    return close < lastClose
  }

  render() {
    const { candles, trades } = this.state
    const { start, end } = this.claculateStartEnd()
    const differenceBtc = end.btc - start.btc
    const differencePercentageBtc = ((end.btc - start.btc) / start.btc) * 100

    const differenceUsd = end.usd - start.usd
    const differencePercentageUsd = ((end.usd - start.usd) / start.usd) * 100

    return (
      <div className="App">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto' }}>
          <div>
            <h2>BTC</h2>
            <p> 
              Start: {start.btc} <br/>
              End: {end.btc} <br/>
              { (differencePercentageBtc > 0 ? '+' : '') }{differencePercentageBtc.toFixed(2)}% ({ (differenceBtc > 0 ? '+' : '') }{differenceBtc})
            </p>
          </div>

          <div>
            <h2>USD</h2>
            <p> 
              Start: {start.usd} <br/>
              End: {end.usd} <br/>
              { (differencePercentageUsd > 0 ? '+' : '') }{differencePercentageUsd.toFixed(2)}% ({ (differenceUsd > 0 ? '+' : '') }{differenceUsd})
            </p>
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
            {trades.reverse().map((trade, i) => (
              <li className={"list-group-item " + (( (i + 1) < trades.length && this.isNotLoss(trade.position, trade.close, trades[i + 1].close)) ? '' : 'list-group-item-danger')} key={trade.close}>
                {trade.position.toUpperCase()} <br/>
                {trade.close}
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
