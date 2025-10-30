const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const path = require("path");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Define Order schema and model
const orderSchema = new mongoose.Schema({
  order_id: { type: String, required: true, unique: true },
  amount: Number,
  currency: String,
  receipt: String,
  notes: Object,
  status: { type: String, default: "created" },
  payment_id: String,
});

const Order = mongoose.model("Order", orderSchema);

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Routes
app.post("/create-order", async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;
    const options = {
      amount: amount * 100, // amount in paisa
      currency,
      receipt,
      notes,
    };

    const order = await razorpay.orders.create(options);

    // Save order to MongoDB
    const newOrder = new Order({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes,
      status: "created",
    });

    await newOrder.save();

    res.json(order);
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).send("Error creating order");
  }
});

app.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const secret = razorpay.key_secret;
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    const isValidSignature = validateWebhookSignature(
      body,
      razorpay_signature,
      secret
    );

    if (isValidSignature) {
      // Update order in MongoDB
      const order = await Order.findOne({ order_id: razorpay_order_id });
      if (order) {
        order.status = "paid";
        order.payment_id = razorpay_payment_id;
        await order.save();
      }

      res.status(200).json({ status: "ok" });
      console.log("✅ Payment verification successful");
    } else {
      res.status(400).json({ status: "verification_failed" });
      console.log("⚠️ Payment verification failed");
    }
  } catch (error) {
    console.error("❌ Error verifying payment:", error);
    res
      .status(500)
      .json({ status: "error", message: "Error verifying payment" });
  }
});

app.get("/payment-success", (req, res) => {
  res.sendFile(path.join(__dirname, "success.html"));
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
