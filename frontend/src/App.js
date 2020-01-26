import React, { PureComponent } from 'react'
import './App.css'
import axios from 'axios'
import Chart from 'react-google-charts'
import Routes from './routes'

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
    axios.get(Routes.candles.fetch)
      .then(res => {
        console.log(res)
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

    return (
      <div className="App">
        {candles && candles.length > 0 &&
        <p>hello</p>
        }
      </div>
    );
  }
}

export default App
