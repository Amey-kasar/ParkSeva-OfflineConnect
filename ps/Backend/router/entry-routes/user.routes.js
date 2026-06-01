const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { register, login, getAllUsers, getUserById, updateUser, createUser, deleteUser, getWalletBalance, addWalletFunds } = require('../../controllers/user.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/wallet/balance', auth, getWalletBalance);
router.post('/wallet/add-funds', auth, addWalletFunds);
router.post('/', createUser);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
