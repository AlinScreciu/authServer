import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';

import User from '../models/user.js';
import dotenv from 'dotenv'

dotenv.config();
var codes = [];
const codeVerify = (req, res, next) => {

    return res.status(200).json({message: `recieved ${JSON.stringify(req.body.email)}`});

}

const signup = (req, res, next) => {
    // checks if email already exists
    User.findOne({ where : {
        email: req.body.email, 
    }})
    .then(dbUser => {
        if (dbUser) {
            return res.status(409).json({message: "A user with this email already exists", success: false});
        } else if (req.body.email && req.body.password) {
            // password hash
            bcrypt.hash(req.body.password, 12, (err, passwordHash) => {
                if (err) {
                    return res.status(500).json({message: "couldnt hash the password", success: false}); 
                } else if (passwordHash) {
                    // user added to db
                    return User.create(({
                        email: req.body.email,
                        name: req.body.name,
                        password: passwordHash,
                    }))
                    .then(() => {
                        res.status(200).json({message: "User created", success: true});
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(502).json({message: "error while creating the user", success: false});
                    });
                };
            });
        } else if (!req.body.password) {
            return res.status(400).json({message: "Password not provided", success: false});
        } else if (!req.body.email) {
            return res.status(400).json({message: "Email not provided", success: false});
        };
    })
    .catch(err => {
        console.log('error', err);
    });
};

const login = (req, res, next) => {
    // checks if email exists
    User.findOne({ where : {
        email: req.body.email, 
    }})
    .then(dbUser => {
        if (!dbUser) {
            return res.status(404).json({message: "user not found"});
        } else {
            // password hash
            bcrypt.compare(req.body.password, dbUser.password, (err, compareRes) => {
                if (err) { // error while comparing
                    res.status(502).json({message: "error while checking user password", auth: false});
                } else if (compareRes) { // password match
                    const token = jwt.sign({ email: req.body.email }, process.env.SECRET, { expiresIn: '7d' });
                    res.status(200).json({message: "User logged in", "token": token, auth: true});
                } else { // password doesnt match
                    res.status(401).json({message: "Invalid credentials", auth: false});
                };
            });
        };
    })
    .catch(err => {
        console.log('error', err);
    });
};

const isAuth = (req, res, next) => {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
        return res.status(401).json({ message: 'not authenticated', auth: false });
    };
    const token = authHeader.split(' ')[1];
    let decodedToken; 
    try {
        decodedToken = jwt.verify(token, process.env.SECRET);
    } catch (err) {
        return res.status(500).json({ message: err.message || 'could not decode the token', auth: false });
    };
    if (!decodedToken) {
        res.status(401).json({ auth: false });
    } else {
        res.status(200).json({ auth: true });
    };
};

export { signup, login, isAuth, codeVerify };