import { default as candles } from './candles.mjs'

const Routes = { ...candles }
const base = 'http://localhost:4000/api/v1'

for (let controller in Routes) {
    for (let path in Routes[controller]) {
        Routes[controller][path] = base + Routes[controller][path]
    }
    
}

export default Routes