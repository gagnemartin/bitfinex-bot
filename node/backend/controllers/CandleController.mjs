import axios from 'axios'
import indicators from 'technicalindicators'
import AppController from './AppController.mjs'

class CandleController extends AppController {
  constructor(model) {
    super(model)
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

  fetch = (req, res, next) => {
    const now = Date.now()
    const period = 134
    const startPeriod = now - (1000 * 60 * 60 * 24 * period)
    const domain = 'https://api-pub.bitfinex.com/v2/'
    const path = 'candles/trade:30m:tBTCUSD/hist'
    const params = '?sort=1&limit=10000&start=' + startPeriod
    const url = domain + path + params

    axios.get(url)
      .then(response => {
        if (typeof response.data !== 'undefined') {
          const candles = response.data.map(candle => {
            return {
              date: new Date(candle[0]),
              open: candle[1],
              close: candle[2],
              high: candle[3],
              low: candle[4]
            }
          })

          const closes = candles.map(candle => candle.close)
          const { MACD, RSI, SMA, bullish, bearish } = indicators
          const macdInput = {
            values            : closes,
            fastPeriod        : 12,
            slowPeriod        : 26,
            signalPeriod      : 9,
            SimpleMAOscillator: false,
            SimpleMASignal    : false
          }

          const sma = SMA.calculate({ period: 8, values: closes })
          const smaDifference = candles.length - sma.length

          const macd = MACD.calculate(macdInput)
          const macdDifference = candles.length - macd.length

          const rsiInput = {
            values: closes,
            period: 14
          }

          const rsi = RSI.calculate(rsiInput)
          const rsiDifference = candles.length - rsi.length

          let macdIndex = 0
          let rsiIndex = 0
          let smaIndex = 0
          //let startBtc = 1
          let startBtc = 0.01315
          let startUsd = 0.19332
          let btc = startBtc
          let usd = startUsd
          let lastTrade = 'BUY'

          candles.map((candle, i) => {
            if (typeof sma[smaIndex] !== 'undefined' && i >= smaDifference) {
              candles[i].sma = sma[smaIndex]

              // if (smaIndex > 0) {
              //   const previous = sma[smaIndex - 1]
              //   const current = sma[smaIndex]
              //
              //   candles[i].trend = current > previous ? 'up' : 'down'

                //if (smaIndex > 2) {
                  const trends = candles.slice(i - 3, i)

                  if (trends.length > 0) {
                    candles[i].bullish = bullish({
                      open: trends.map(trend => trend.open),
                      close: trends.map(trend => trend.close),
                      high: trends.map(trend => trend.high),
                      low: trends.map(trend => trend.low),
                    })

                    candles[i].bearish = bearish({
                      open: trends.map(trend => trend.open),
                      close: trends.map(trend => trend.close),
                      high: trends.map(trend => trend.high),
                      low: trends.map(trend => trend.low),
                    })

                    if (candles[i].bullish !== candles[i].bearish) {
                      if (lastTrade === 'SELL' && candles[i].bullish) {
                        candles[i].trade = 'BUY'
                      } else if (lastTrade === 'BUY' && candles[i].bearish) {
                        candles[i].trade = 'SELL'
                      }
                    }
                  }
                //}
              //   }
              // }
              smaIndex++
            }

            if (typeof macd[macdIndex] !== 'undefined' && i >= macdDifference) {
              candles[i].macd = macd[macdIndex]

              if (macdIndex > 0) {
                const current = macd[macdIndex]
                const previous = macd[macdIndex -1]

                if (lastTrade === ' BUY' && previous.MACD > previous.signal && current.MACD < current.signal && candles[i].bearish) {
                //if (current.histogram <= 5 && candles[i].bearish) {
                  candles[i].trade = 'SELL'
                } else if (lastTrade === 'SELL' && previous.MACD < previous.signal && current.MACD > current.signal && candles[i].bullish) {
                //} else if (current.histogram >= -5 && candles[i].bullish) {
                  candles[i].trade = 'BUY'
                }

              }
              macdIndex++
            }

            if (typeof rsi[rsiIndex] !== 'undefined' && i >= rsiDifference) {
              candles[i].rsi = rsi[rsiIndex]
              // const previous = rsi[rsiIndex -1]

              if (typeof candles[i].trade !== 'undefined') {
                if (rsi[rsiIndex] > 70 && lastTrade === 'BUY' && candles[i].bearish) {
                    candles[i].trade = 'SELL'
                } else if (rsi[rsiIndex] < 30 && lastTrade === 'SELL' && candles[i].bullish) {
                  candles[i].trade = 'BUY'
                }
              }
              rsiIndex++
            }

            if (typeof candles[i].trade !== 'undefined') {
              if (lastTrade === 'BUY' && candles[i].trade === 'SELL') {
                lastTrade = 'SELL'
                usd = candle.close * btc
                btc = 0

                candles[i].wallet = { btc, usd }
              } else if (lastTrade === 'SELL' && candles[i].trade === 'BUY') {
                  lastTrade = 'BUY'
                  btc = usd / candle.close
                  usd = 0

                  candles[i].wallet = { btc, usd }
              }
            }
          })

          const trades = candles.filter(candle => typeof candle.trade !== 'undefined')

          const data = {
            trades: trades.length,
            start: {
              btc: startBtc + ' (' + startBtc * candles[0].close + '$)',
              usd: startUsd
            },
            end: {
              btc: btc + ' (' + btc * candles[candles.length -1].close + '$)',
              usd: usd + ' (' + usd / candles[candles.length -1].close + '$)'
            },
            candles: trades//, macd, rsi
          }

          res.send(data);
          //res.send(data.data);
        } else {
          res.status(500).send('Error')
        }
      })
      .catch(e => {
        res.status(e.response.status).send(e)
        console.error(e.response.status)
      })
  }
}

export default new CandleController()
