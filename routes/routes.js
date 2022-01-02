import express from 'express';
import { signup, login, isAuth } from '../controllers/auth.js';

const router = express.Router();

router.post('/login', login);

router.post('/signup', signup);

router.get('/private', isAuth);

router.get('/public', (req, res, next) => {
    res.send('Hello world!');
});

router.get('/verify', (req, res, next) => {
        const code = Math.floor(100000 + Math.random() * 900000);
        return res.status(200).json({ "code": code });
});
// will match any other path
router.use('/', (req, res, next) => {
    res.status(404).json({error : "page not found"});
});

export default router;