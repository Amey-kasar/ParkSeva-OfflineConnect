const express = require('express');
const router = express.Router();
const { createBill, getAllBills, getBillById, updateBill, deleteBill } = require('../../controllers/bill.controller');

router.post('/', createBill);
router.get('/', getAllBills);
router.get('/:id', getBillById);
router.put('/:id', updateBill);
router.delete('/:id', deleteBill);

module.exports = router;