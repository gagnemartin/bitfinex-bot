jest.mock('../SocketExchangeController')
import SocketExchangeController from '../SocketExchangeController'
jest.spyOn(SocketExchangeController, 'connect').mockImplementation(() => ({
  connect: jest.fn()
}))
import CandleController from '../CandleController'
jest.spyOn(CandleController, 'fetch')
  .mockImplementation(() => '')

describe('CandleController', () => {
  it('Test', () => {
    expect('test').toEqual('test')
  })
})
