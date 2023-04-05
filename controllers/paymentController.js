const BigPromise = require("../middlewares/bigPromise");
const nanoid = require("nanoid");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

exports.sendStripekey = BigPromise(async (req, res, next) => {
  res.status(200).json({
    stripekey: process.env.STRIPE_API_KEY,
  });
});

exports.captureStripePayment = BigPromise(async (req, res, next) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: req.body.amount,
    currency: "inr",

    // optional
    metadata: { intergration_check: "accept_a_payment" },
  });

  res.status(200).json({
    client_secret: paymentIntent.client_secret,
    // can optionally send id as well
  });
});

exports.sendRazorpaykey = BigPromise(async (req, res, next) => {
  res.status(200).json({
    stripekey: process.env.RAZORPAY_API_KEY,
  });
});

exports.captureRazorpayPayment = BigPromise(async (req, res, next) => {
  let instance = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
  });

  const myOrder = await instance.orders.create({
    amount: req.body.amount * 100,
    currency: "INR",
    receipt: nanoid(),
  });

  res.status(200).json({
    success: true,
    amount: req.body.amount,
    order: myOrder,
  });
});
