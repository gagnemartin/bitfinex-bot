import React, { PureComponent } from 'react'
import logo from './logo.svg'
import './App.css'
import crypto from 'crypto-js'
import axios from 'axios'
import { ChartCanvas, Chart } from "react-stockcharts"
import { CandlestickSeries, MACDSeries } from "react-stockcharts/lib/series"
import { XAxis, YAxis } from "react-stockcharts/lib/axes"
import { discontinuousTimeScaleProvider } from "react-stockcharts/lib/scale"
import { fitWidth } from "react-stockcharts/lib/helper"
import { last } from "react-stockcharts/lib/utils"
import { macd } from "react-stockcharts/lib/indicator"

class App extends PureComponent {
  state = {
    candles: [],
    macd: []
  }

  componentDidMount() {
    this.fetchCandles()
    //this.openSocket()
  }

  fetchCandles = () => {

    const url = '/candles'

    axios.get(url)
      .then(res => {
        for (let i = 0; i < res.data.candles.length; i++) {
          res.data.candles[i].date = new Date(res.data.candles[i].date)
        }

        console.log(res.data.rsi)

        this.setState({
          candles: res.data.candles,
          macd: res.data.macd,
          rsi: res.data.rsi
        })
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
  render() {
    const { candles } = this.state
    const macdAppearance = {
      stroke: {
        macd: "#FF0000",
        signal: "#00F300",
      },
      fill: {
        divergence: "#4682B4"
      },
    }

    const xScaleProvider = discontinuousTimeScaleProvider
      .inputDateAccessor(d => d.date);
    const {
      data,
      xScale,
      xAccessor,
      displayXAccessor,
    } = xScaleProvider(candles);
    const xExtents = [
      xAccessor(last(data)),
      xAccessor(data[data.length - 100])
    ]

    const macdCalculator = macd()
      .options({
        fast: 12,
        slow: 26,
        signal: 9,
      })
      .merge((d, c) => {d.macd = c;})
      .accessor(d => d.macd);
    console.log(candles)

    return (
      <div className="App">
        {candles && candles.length > 0 &&
        <ChartCanvas
          height={500}
          ratio={1}
          width={this.props.width}
          //margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
          type="svg"
          seriesName="MSFT"
          data={data}
          xScale={xScale}
          xAccessor={xAccessor}
          displayXAccessor={displayXAccessor}
          xExtents={xExtents}
        >
          <Chart id={1} yExtents={d => [d.high, d.low]}>
            <XAxis axisAt="bottom" orient="bottom" ticks={6}/>
            <YAxis axisAt="right" orient="right" ticks={5} />
            <CandlestickSeries />
          </Chart>

          <Chart id={3} height={150}
                 yExtents={macdCalculator.accessor()}
                 origin={(w, h) => [0, h - 150]} padding={{ top: 10, bottom: 10 }}>
            {/*<XAxis axisAt="bottom" orient="bottom" ticks={6}/>*/}
            {/*<YAxis axisAt="right" orient="right" ticks={5} />*/}
            <MACDSeries yAccessor={d => d.macd} {...macdAppearance} />
          </Chart>
        </ChartCanvas>
        }
      </div>
    );
  }
}

App = fitWidth(App)
export default App;
