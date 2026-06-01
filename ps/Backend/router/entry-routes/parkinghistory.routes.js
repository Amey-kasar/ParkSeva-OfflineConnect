const express = require('express');
const router = express.Router();
const { getAllHistory, getHistoryById, getUserHistory } = require('../../controllers/parkinghistory.controller');

router.get('/', getAllHistory);
router.get('/:id', getHistoryById);
router.get('/user/:userId', getUserHistory);

module.exports = router;