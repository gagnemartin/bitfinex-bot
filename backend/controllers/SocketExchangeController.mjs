import WebSocket from 'ws'
import AppController from './AppController.mjs'
import SocketExchange from '../models/SocketExchange.mjs'

class SocketExchangeController extends AppController {
  constructor(model) {
    super(model)
  }

  /**
   * Connect to the exchange websocket
   * 
   * @param {'authenticated'|'public'} type authenticated or public
   */
  connect = type => {
    try {
      const types = Object.keys(this.model.endpoint)

      if (types.includes(type)) {
          const ws = new WebSocket(this.model.endpoint[type])
    
          ws.on('open', () => {
            this.model.add(type, ws)

            ws.send(JSON.stringify(this.model.getPayload(type)))

            ws.on('message', msg => {
              const event = JSON.parse(msg)

              this.model.delegateEvent(type, event)
            })
          })
      } else {
        throw new Error("Invalid type: can't connect to Exchange. Type must be \"public\" or \"authenticated\".")
      }
    } catch($e) {
      console.error($e)
    }
  }
}

export default new SocketExchangeController(SocketExchange)