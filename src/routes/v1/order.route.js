const express = require('express');
const orderController = require('../../controllers/order.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.get('/', orderController.getList);
router.post('/', auth, orderController.orderCreate);

router.get('/:orderId([0-9a-fA-F]{24})', orderController.getDetail);

router.get('/match', orderController.orderMatch);

router.post('/apply/:orderId', auth, orderController.orderApply);
// todo: 限制管理者權限才能刪除
router.delete('/:orderId', auth, orderController.orderDelete);

router.post('/approve-application', auth, orderController.approveApplication);
router.post('/cancel-application', auth, orderController.cancelApplication);

router.patch('/driver-check/:orderId([0-9a-fA-F]{24})', orderController.driverCheckList);

router.post('/:orderId/set-order-viewed', auth, orderController.setOrderViewed);
router.post('/get-viewed-record', auth, orderController.getViewedRecord);

router.get('/pending-confirmation/:chatroomUserId', auth, orderController.getPendingConfirmation);

module.exports = router;
