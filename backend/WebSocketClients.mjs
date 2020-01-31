import CandleController from './controllers/CandleController.mjs'
const clients = []

class WebSocketClients {
    static add = client => {
        console.log('New client connected.')
        clients.push(client)
        client.send(JSON.stringify(CandleController.fetchInit()))
    }

    static list = () => {
        return clients
    }

    static sendAll = data => {
        clients.forEach(client => {
            client.send(JSON.stringify(data))
        })
    }
}

export default WebSocketClients