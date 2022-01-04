import express from 'express';
import { signup, login, isAuth, codeVerify, updatePass, getCode } from '../controllers/auth.js';

const router = express.Router();

router.post('/login', login);

router.post('/signup', signup);

router.get('/private', isAuth);

router.get('/public', (req, res, next) => {
    res.send('Hello world!');
});

router.post('/makecode', getCode);
router.post('/verifycode', codeVerify);
router.post('/update', updatePass);

router.use('/', (req, res, next) => {
    res.status(404).json({error : "page not found"});
});

export default router;