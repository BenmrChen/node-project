const { request }     = require('express');
const Order           = require('../models/order.model');
const moment          = require('moment');
const emailService    = require('../services/email.service.js');
const orderService    = require('../services/order.service.js');
const userService     = require('../services/user.service.js');
const chatroomService = require('../services/chatroom.service.js');
const logger          = require('../config/logger');
const jwt             = require('jsonwebtoken');
const config          = require('../config/config');
const catchAsync      = require('../utils/catchAsync');
const ApiError        = require('../utils/ApiError');
const httpStatus      = require('http-status');

const getList = catchAsync(async (req, res) => {
  if (typeof req.body.staus !== 'undefined') {
    const filter = {
      status: res.body.status,
    };
  }

  // todo: 加上 filter
  if (typeof filter !== 'undefined') {
    Order.find({
      filter,
    })
      .then((result) => {
        res.send({ result });
      })
      .catch((err) => {
        logger.info(err.message);
        res.status(500).json(err.message);
      });
  } else {
    Order.find()
      .then((result) => {
        res.send(result);
      })
      .catch((err) => {
        logger.info(err.message);
        res.status(500).json(err.message);
      });
  }
});

const getDetail = catchAsync(async (req, res) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      logger.info(err.message);
      res.status(500).json(err.message);
    });
});

const orderCreate = catchAsync(async (req, res) => {
  const { user } = req;
  const userId   = user.id;

  // todo: 檢查 required 的資料是否完備
  const data = {
    creator          : userId,
    role             : req.body.role,
    driver           : userId,
    startTime        : moment(req.body.startTime),
    departureCity    : req.body.departureCity,
    arrivalCity      : req.body.arrivalCity,
    departurePoint   : req.body.departurePoint,
    arrivalPoint     : req.body.arrivalPoint,
    maxPassengerCount: req.body.maxPassengerCount,
    maxBaggageCount  : req.body.maxBaggageCount,
    note             : req.body.note,
  };

  try {
    const order = await Order.create(data);

    const roomId = await chatroomService.roomHandler(order._id, userId);

    order.roomId = roomId;
    order.save();

    res.status(201).json({ orderId: order._id });
  } catch (err) {
    logger.info(err.message);
    res.status(500).json(err.message);
  }
});

const orderMatch = catchAsync(async (req, res) => {
  try {
    // 取得符合條件列表
    let orders = await Order.find({
      startTime: {
        $gte: moment(req.query.startTime).startOf('day').toISOString(),
        $lte: moment(req.query.startTime).endOf('day').toISOString(),
      },
      departureCity: req.query.departureCity,
      arrivalCity: req.query.arrivalCity,
      status: { $ne: 'COMPLETED' },
    });

    // 根據符合條件多寡予以加權分數
    orders = orders.map(function (value) {
      if (value.departurePoint == req.body.departurePoint) {
        value.sortScore = !value.sortScore ? 1 : value.sortScore + 1;
      }

      if (value.arrivalPoint == req.body.arrivalPoint) {
        value.sortScore = !value.sortScore ? 1 : value.sortScore + 1;
      }

      return value;
    });

    // 根據加權分數排序
    orders.sort(function (a, b) {
      return b.sortScore - a.sortScore;
    });

    res.status(200).json(orders);
  } catch (err) {
    logger.info(err.message);
    res.status(500).json(err.message);
  }
});

const orderDelete = catchAsync(async (req, res) => {
  const id = req.params.orderId;

  Order.findByIdAndDelete(id)
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      logger.info(err.message);
      res.status(500).json(err.message);
    });
});

const orderApply = catchAsync(async (req, res) => {
  const { user } = req;
  const userId   = user.id;
  const orderId  = req.params.orderId;

  let passengersNew;
  let updateParams;

  const passengersInput = [
    {
      userId: userId,
      status: 'NEW',
    },
  ];

  const order = await Order.findById(orderId);
  if (order.status == 'FULL') {
    return res.status(422).json('full of passengers');
  }

  let passengers = order.passengers ?? [];

  const userIdsDb = passengers.map(function (passengers) {
    return passengers.userId;
  });

  if (userIdsDb.includes(userId)) {
    return res.status(422).json('duplicate passenger');
  }

  if (userId == order.driver) {
    return res.status(422).json('driver cannot be set as passenger');
  }

  passengers = passengers.concat(passengersInput);

  try {
    const order = await Order.findByIdAndUpdate(orderId, { passengers: passengers }, { new: true });

    res.status(200).json(order);
  } catch (err) {
    logger.info(err.message);
    res.status(500).json(err.message);
  }
});

const approveApplication = catchAsync(async (req, res) => {
  const targetUserId = req.body.userId;
  const orderId      = req.body.orderId;

  let updateParams;

  try {
    const order = await Order.findById(orderId);
    if (order == null) {
      return res.status(404).json('order not found');
    }

    let orderPassengers = order.passengers;

    if (orderPassengers == null) {
      return res.status(404).json('no passengers found in this order');
    }

    if (order.status == 'FULL') {
      return res.status(422).json('order full');
    }

    orderPassengers.forEach(function (item, index, array) {
      if (item.userId == targetUserId) {
        if (item.status == 'CONFIRMED') {
          throw new Error('passenger has been confirmed before');
        }

        item.status = 'CONFIRMED';
      }
    });

    if (await orderService.checkIfFull(orderPassengers, order.maxPassengerCount)) {
      updateParams = {
        status: 'FULL',
        passengers: orderPassengers,
      };
    } else {
      updateParams = {
        passengers: orderPassengers,
      };
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateParams, { new: true });
    const targetUser   = await userService.getUserById(targetUserId);

    const chatroomInfo = await chatroomService.updateOrderUser(orderId, targetUserId, 'push');
    if (chatroomInfo != 'push finished') {
      throw new Error(chatroomInfo);
    }

    const targetEmail  = targetUser.email;
    const userName     = targetUser.username ?? 'Ridy 用戶';
    const emailContent = emailService.generateEmailNotificationContent(userName, 'confirm-application');

    emailService
      .sendEmail(targetEmail, '司機已同意共乘申請', emailContent)
      .then(() => logger.info('email sent successfully'))
      .catch(() => logger.warn('Unable to connect to email server'));

    res.status(200).json({ updatedOrder });
  } catch (err) {
    console.log(err);
    res.status(500).json(err.message);
  }
});

// todo: 把 approve/cancel 整合在一起
const cancelApplication = catchAsync(async (req, res) => {
  const targetUserId = req.body.userId;
  const orderId      = req.body.orderId;

  let updateParams;

  const order = await Order.findById(orderId);
  if (order == null) {
    return res.status(404).json('order not found');
  }

  let orderPassengers = order.passengers;
  if (orderPassengers == null) {
    return res.status(404).json('no passengers found in this order');
  }

  let ifPassengerExist = false;
  orderPassengers.forEach(function (item) {
    if (item.userId == targetUserId) {
      item.status = 'CANCELLED';
      ifPassengerExist = true;
    }
  });

  if (ifPassengerExist == false) {
    return res.status(422).json('passenger not applied yet');
  }

  if (order.status == 'FULL') {
    updateParams = {
      status: 'NEW',
      passengers: orderPassengers,
    };
  } else {
    updateParams = {
      passengers: orderPassengers,
    };
  }

  try {
    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateParams, { new: true });
    const targetUser   = await userService.getUserById(targetUserId);

    const chatroomInfo = await chatroomService.updateOrderUser(orderId, targetUserId, 'pull');
    if (chatroomInfo != 'pull finished') {
      throw new Error(chatroomInfo);
    }

    const targetEmail  = targetUser.email;
    const userName     = targetUser.username ?? 'Ridy 用戶';
    const emailContent = emailService.generateEmailNotificationContent(userName, 'confirm-application');

    emailService
      .sendEmail(targetEmail, '司機已取消共乘申請', emailContent)
      .then(() => logger.info('email sent successfully'))
      .catch(() => logger.warn('Unable to connect to email server'));

    res.status(200).json({ updatedOrder });
  } catch (err) {
    console.log(err);
    res.status(500).json(err.message);
  }
});

const driverCheckList = async (req, res) => {
  const driverCheck = req.body;
  const orderId     = req.params.orderId;

  try {
    await Order.findById(orderId)
      .then(async (result) => {
        if (driverCheck.orderStatus === 'canceled') {
          try {
            await Order.findByIdAndUpdate(orderId, { status: 'canceled' });
            res.status(200).json('Order is canceld');
          } catch (err) {
            console.log(err);
            res.status(400).json(err);
          }
        }

        if (driverCheck.maxBaggageCount) {
          try {
            await Order.findByIdAndUpdate(orderId, { maxBaggageCount: driverCheck.maxBaggageCount });
            res.status(200).json('maxBaggageCount:' + driverCheck.maxBaggageCount);
          } catch (err) {
            console.log(err);
            res.status(400).json(err);
          }
        }

        if (driverCheck.maxPassengers) {
          try {
            await Order.findByIdAndUpdate(orderId, { maxPassengerCount: driverCheck.maxPassengers });
            res.status(200).json('maxPassengers is ' + driverCheck.maxPassengers);
          } catch (err) {
            console.log(err);
            res.status(400).json(err);
          }
        }

        if (driverCheck.note) {
          try {
            await Order.findByIdAndUpdate(orderId, { note: driverCheck.note });
            res.status(200).json('note:' + driverCheck.note);
          } catch (err) {
            console.log(err);
            res.status(400).json(err);
          }
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(400).json(err);
      });
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
};

const setOrderViewed = catchAsync(async (req, res) => {
  const userId  = req.user.id;
  const orderId = req.params.orderId;

  try {
    const order = await orderService.setOrderViewed(orderId, userId)

    res.status(200).json(order);
  } catch (err) {
    logger.info(err.message);
    res.status(400).json(err);
  }
});

const getViewedRecord = catchAsync(async (req, res) => {
  const userId = req.user.id;

  try {
    const records = await orderService.getViewedRecord(userId);

    res.status(200).json(records);
  } catch (err) {
    logger.info(err.message);
    res.status(400).json(err);
  }
});

const getPendingConfirmation = catchAsync(async (req, res) => {
  const loginUserId = req.user.id;
  const chatroomUserId = req.params.chatroomUserId;

  try {
    const orders = await Order.find({
      status: { $ne: 'COMPLETED' },
      startTime: { $gt: moment() },
      $or: [
        {
          $and: [
            {
              passengers: {
                $elemMatch: {
                  userId: loginUserId,
                  status: 'NEW',
                },
              },
            },
            { driver: chatroomUserId },
          ],
        },
        {
          $and: [
            {
              passengers: {
                $elemMatch: {
                  userId: chatroomUserId,
                  status: 'NEW',
                },
              },
            },
            { driver: loginUserId },
          ],
        },
      ],
    });

    let message = '';
    let passengerId = '';
    const rtn = orders.map(function (value) {
      passengerId = (value.driver == loginUserId) ? chatroomUserId : loginUserId;

      return {
        'driverId': value.driver,
        'passengerId': passengerId,
        'orderId': value.id,
        'status': 'PENDING_DRIVER_CONFIRMATION',
      };
    });

    // todo: 若有使用者提出共乘功能，需要再去 search 共乘需求表並整合至 output

    res.status(200).json(rtn);
  } catch (err) {
    logger.info(err.message);
    res.status(500).json(err.message);
  }
});

const orderTollFee = catchAsync(async (req, res) => {
  //const userId = req.user.id;
  const origin  = req.query.departurePoint;
  const destination = req.query.arrivalPoint;
  console.log(origin, destination);
  try {
    const tollFee = await orderService.calculateTollFee(origin, destination);
    res.status(200).json({tollFee: tollFee})
  } catch (error) {
    console.log(error);
    res.status({error: error.message});
  }
});

const getDistanceDuration = catchAsync(async (req, res) => {
  // todo: input error handling and response err
  try {
    const origin  = req.query.departurePoint;
    const destination = req.query.arrivalPoint;
    const googlemapAPIresponce = await orderService.googlemapDirections(origin, destination);
    const tripDistance = googlemapAPIresponce.data.routes[0].legs[0].distance.value / 1000; // km
    const tripDuration = googlemapAPIresponce.data.routes[0].legs[0].duration.value / 60; // minutes
    res.status(200).json({
      tripDistance: tripDistance,
      tripDuration: tripDuration
    })
  } catch (error) {
    console.log(error);
    logger.info(error.message)
    res.status(400).json({error})
  }

})

module.exports = {
  getList,
  getDetail,
  orderCreate,
  orderMatch,
  orderDelete,
  orderApply,
  approveApplication,
  cancelApplication,
  driverCheckList,
  setOrderViewed,
  getViewedRecord,
  getPendingConfirmation,
  orderTollFee,
  getDistanceDuration,
};

