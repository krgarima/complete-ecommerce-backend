const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares/user");
const {
  sendStripekey,
  captureStripePayment,
  sendRazorpaykey,
  captureRazorpayPayment,
} = require("../controllers/paymentController");

router.route("/stripekey").get(isLoggedIn, sendStripekey);
router.route("/razorpaykey").get(isLoggedIn, sendRazorpaykey);

router.route("/capturestripe").post(isLoggedIn, captureStripePayment);
router.route("/capturerazorpay").post(isLoggedIn, captureRazorpayPayment);

module.exports = router;
