const moment = require('moment');
const { Client } = require('@googlemaps/google-maps-services-js');
const Order = require('../models/order.model');
const config = require('../config/config');

const queryOrders = async (filter) => {
  const orders = await Order.find(filter);
  return orders;
};

const checkIfFull = async (passengers, maxPassengerCount) => {
  const confirmedPassengerCount = passengers.filter((element) => {
    if (element.status === 'CONFIRMED') {
      return true;
    }

    return false;
  }).length;

  if (confirmedPassengerCount === maxPassengerCount) {
    return true;
  }

  return false;
};

const setOrderViewed = async (orderId, userId) => {
  const update = {
    $set: {
      viewedUser: {
        id: userId,
        time: moment(),
      },
    },
  };

  return Order.findByIdAndUpdate(orderId, update, { new: true });
};

const getViewedRecord = async (userId) => {
  const orders = await Order.find({ 'viewedUser.id': userId });

  return orders.map(function (value) {
    const target = value.viewedUser.find(({ id }) => id === userId);
    return { orderId: value._id, driverId: value.creator, createdTime: moment(target.time).toISOString() };
  });
};



module.exports = {
  queryOrders,
  checkIfFull,
  setOrderViewed,
  getViewedRecord,
};
