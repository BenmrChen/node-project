const mongoose = require('mongoose');

const { Schema } = mongoose;

mongoose.set('useFindAndModify', false);

const orderSchema = new Schema(
  {
    creator: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['DRIVER', 'PASSENGER'],
      default: 'DRIVER',
    },
    driver: {
      type: String,
    },
    startTime: {
      type: Date,
      required: true,
    },
    departureCity: {
      type: String,
      required: true,
    },
    arrivalCity: {
      type: String,
      required: true,
    },
    departurePoint: {
      type: String,
    },
    arrivalPoint: {
      type: String,
    },
    sortScore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'NEW',
    },
    passengers: {},
    maxPassengerCount: {
      type: Number,
      required: true,
    },
    maxBaggageCount: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
    },
    roomId: {
      type: String,
    },
    viewedUser: {
      type: Array,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
