const express = require('express');
const router = express.Router();
const axios = require('axios')

/* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' });
// });

router.get('/candles', function(req, res, next) {
  const domain = 'https://api-pub.bitfinex.com/v2/'
  const path = 'candles/trade:30m:tBTCUSD/hist'
  const url = domain + path

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

        res.send(candles);
        //res.send(data.data);
      } else {
        res.status(500).send('Error')
      }
    })
    .catch(e => {
      res.status(e.response.status).send(e)
      console.error(e.response.status)
    })
});

module.exports = router;
