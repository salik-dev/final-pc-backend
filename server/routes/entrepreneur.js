const express = require('express');
const { protect, restrict } = require('../controllers/user');
const {
    create,
    getAll,
    getEntrepreneur,
    updateById,
    deleteById,
    findEntrepreneurs
} = require('../controllers/entrepreneur');

const router = express.Router();
const permissions = ['Admin', 'Entrepreneur'];
router.route('/create').post(protect, restrict(permissions), create);
router.route('/').get(protect, restrict(permissions), getAll);
router.route('/get-entrepreneur').get(getEntrepreneur);
router.route('/update/:id').put(protect, restrict(permissions), updateById);
router.route('/remove/:id').delete(protect, restrict(permissions), deleteById);
router.route('/find').get(protect, restrict(['Admin', 'Investor', 'Entrepreneur']), findEntrepreneurs);

module.exports = router;
