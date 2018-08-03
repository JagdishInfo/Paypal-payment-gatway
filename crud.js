'use strict';

const express = require('express');
var paypal = require('paypal-rest-sdk');

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'EBWKjlELKMYqRNQ6sYvFo64FtaRLRR5BdHEESmha49TM',
    'client_secret': 'EO422dn3gQLgDbuwqTjzrFgFtaRLRR5BdHEESmha49TM'
});

const router = express.Router();

router.use((req, res, next) => {
    res.set('Content-Type', 'text/html');
    next();
});


router.post('/pay/:recipe_id', (req, res) => {

    let price = (req.body.price !== '' || req.body.price !== null) ? Number.parseFloat(req.body.price).toFixed(2) : '';
    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": 'http://' + req.get('host') + "/single-recipes/payment/success",
            "cancel_url": 'http://' + req.get('host') + "/single-recipes/payment/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": req.body.recipe_title,
                    "sku": "item",
                    "price": price,
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": price
            },
            "description": "This is the payment description."
        }]
    };
    req.session.total_price = price;
    req.session.recipe_id = req.params.recipe_id;
    req.session.buyType = req.body.buyType;
    req.session.recipe_title = req.body.recipe_title;

    paypal.payment.create(create_payment_json, function (error, payment) {

        if (error) {
            console.log(error);
            throw error;
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel == 'approval_url') {
                    res.redirect(payment.links[i].href);
                }
            }
        }
    });
});

router.get('/payment/success', (req, res) => {

    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "USD",
                "total": req.session.total_price
            }
        }]
    };
    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {

            var obj = {
                transaction_id: payment.id,
                recipe_id: req.session.recipe_id,
                user_id: req.session.user_id,
                status: 1,
                payer_email: payment.payer.payer_info.email,
                payer_first_name: payment.payer.payer_info.first_name,
                payer_last_name: payment.payer.payer_info.last_name,
                payer_id: payment.payer.payer_info.payer_id,
                shipping_address: JSON.stringify(payment.payer.payer_info.shipping_address),
                transactions: JSON.stringify(payment.transactions),
                payee: JSON.stringify(payment.transactions[0].payee),
                description: payment.transactions[0].description,
                item_list: JSON.stringify(payment.transactions[0].item_list),
                payment_mode: payment.transactions[0].related_resources[0].sale.payment_mode,
                protection_eligibility: payment.transactions[0].related_resources[0].sale.protection_eligibility,
                protection_eligibility_type: payment.transactions[0].related_resources[0].sale.protection_eligibility_type,
                transaction_fee: JSON.stringify(payment.transactions[0].related_resources[0].sale.transaction_fee),
                parent_payment: payment.transactions[0].related_resources[0].sale.parent_payment,
                create_time: payment.transactions[0].related_resources[0].sale.create_time,
                update_time: payment.transactions[0].related_resources[0].sale.update_time
            };
            console.log('obj == ', obj);

        }
    });

});

router.get('/payment/cancel', (req, res) => {
    res.send('Cancelled...');
});

module.exports = router;
