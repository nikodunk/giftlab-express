var express = require('express');
var router = express.Router();
var paypal = require('paypal-rest-sdk');
var request = require('request');

const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

client.connect();



var PAYPAL_ID = // process.env.PAYPAL_ID;
   'AUJoKVGO3q1WA1tGgAKRdY6qx0qQNIQ6vl6D3k7y64T4qh5WozIQ7V3dl3iusw5BwXYg_T5FzLCRguP8';
var PAYPAL_CLIENT_SECRET = // process.env.PAYPAL_CLIENT_SECRET
   'EOw8LNwDhM7esrQ3nHfzKc7xiWnJc83Eawln4YLfUgivfx1LGzu9Mj0F5wlarilXDqdK9Q5aHVo-VGjJ';
var PAYPAL_API = 'https://api.sandbox.paypal.com';




  // Set up the payment:
  // 1. Set up a URL to handle requests from the PayPal button
  router.post('/create-payment/', function(req, res)
  {
    // 2. Call /v1/payments/payment to set up the payment
    request.post(PAYPAL_API + '/v1/payments/payment',
    {
      auth:
      {
        user: PAYPAL_ID,
        pass: PAYPAL_CLIENT_SECRET
      },
      body:
      {
        intent: 'sale',
        payer:
        {
          payment_method: 'paypal'
        },
        transactions: [{
          amount: {
            total: '5.99',
            currency: 'USD'
          },
          payee: {
                  email: 'info@seaturtles.org'
              }
        }],
        redirect_urls:
        {
          return_url: 'https://www.mysite.com',
          cancel_url: 'https://www.mysite.com'
        }
      },
      json: true
    }, function(err, response)
    {
      if (err)
      {
        console.error(err);
        return res.sendStatus(500);
      }
      // 3. Return the payment ID to the client
      res.json(
      {
        id: response.body.id
      });
    });
  })



  // Execute the payment:
  // 1. Set up a URL to handle requests from the PayPal button.
  router.post('/execute-payment/:sku/:amount/', function(req, res) {
    
    // console.log('THIS IS THE SKU'+ req.params.sku)

    // 2. Get the payment ID and the payer ID from the request body.
    var paymentID = req.body.paymentID;
    var payerID = req.body.payerID;
    // 3. Call /v1/payments/payment/PAY-XXX/execute to finalize the payment.
    request.post(PAYPAL_API + '/v1/payments/payment/' + paymentID +
      '/execute',
      {
        auth:
        {
          user: PAYPAL_ID,
          pass: PAYPAL_CLIENT_SECRET
        },
        body:
        {
          payer_id: payerID,
          transactions: [{
            amount: {
              total: req.params.amount*100,
              currency: 'USD'
            },
            item_list: {
              items: [{
                name: "Donation",
                sku: req.params.sku,
                price: req.params.amount,
                currency: "USD",
                quantity: 1
              }]
            },
            payee: {
                  email: 'info@seaturtles.org'
              },
            description: 'Your donation to this location'
          }]
        },
        json: true
      },
      function(err, response)
      {
        if (err)
        {
          console.error(err);
          return res.sendStatus(500);
        }

        // SAVE TO DATABASE
        console.log(  response.body.id, response.body.payer.payer_info.email, response.body.transactions[0].amount.total)
        //, response.body.transactions[0].item_list.items[0].sku
        
        client.query(`INSERT INTO orders VALUES (
                        '`+ response.body.id+`',
                        '`+ response.body.payer.payer_info.email+`',
                        ` + response.body.transactions[0].amount.total  
                        //+`','`+ response.body.transactions[0].item_list.items[0].sku +`'` 
                        +`);`)

        // 4. Return a success response to the client
        res.json(
        {
          status: 'success',
          response: response.body
        });

      });
  })


  // paypal.configure({
  //   'mode': 'sandbox', //sandbox or live
  //   'client_id': process.env.PAYPAL_ID,
  //   'client_secret': process.env.PAYPAL_CLIENT_SECRET
  // });


// router.post('/submit', (req, res) => {
//   let description = req.body.description ? req.body.description : 'This is the payment description'
//   let amount = req.body.amount
//   let host = req.protocol + '://' + req.get('host')
//   let createPaymentJson = {
//     intent: "sale", // authorize
//     payer: {
//       payment_method: "paypal"
//     },
//     redirect_urls: {
//       return_url: host + '/paypal/payment-return',
//       cancel_url: host + '/paypal/payment-cancel'
//     },
//     transactions: [{
//       item_list: {
//         items: [{
//           name: "Donation",
//           sku: "d1",
//           price: amount,
//           currency: "USD",
//           quantity: 1
//         }]
//       },
//       amount: {
//         currency: "USD",
//         total: amount
//       },
//       payee: {
//             email: 'info@seaturtles.org'
//         },
//       description: 'Your donation to this location'
//     }]
//   }

//   // SAVE TO DATABASE
//     // create orderID = 'timestamp'
//     // client.query(`INSERT INTO orders VALUES ('`+req.body.amount+`,`+req.body.sku+`');`, (err, res) => {
//     //     }
//     //     client.end();
//     // });

//   // Call PayPal to process the payment
//   paypal.payment.create(createPaymentJson, (err, payment) => {
//     if (err) {
//       console.log(err.response.error_description)
//       throw err
//     } else {
//       console.log("Create Payment response...")
//       console.log(payment)
//       let redirectUrl
//       payment.links.forEach((link) => {
//         if (link.method === 'REDIRECT') {
//           redirectUrl = link.href
//         }
//       })
//       if (redirectUrl) {
//         res.status(200).redirect(redirectUrl)
//       } else {
//         logger.error('Cannot find redirect url from paypal payment result!')
//       }
//     }
//    })

// })

// router.get('/payment-return', function(req, res, next) {
//   res.render('thanks')
// });


module.exports = router;