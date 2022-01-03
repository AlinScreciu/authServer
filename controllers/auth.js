import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

import User from '../models/user.js';
import dotenv from 'dotenv'
import { where } from 'sequelize/types';

dotenv.config();
var codes = [];
const updatePass = (req, res, next) => {
    User.findOne({ where : {
        email: req.body.email, 
    }})
    .then(dbUser => {
        if (!dbUser) {
            
            return res.status(409).json({message: "No user with this email  exists", success: false});
        } else if (req.body.email && req.body.password) {
            // password hash
            bcrypt.hash(req.body.password, 12, (err, passwordHash) => {
                if (err) {
                    return res.status(500).json({message: "couldnt hash the password", success: false}); 
                } else if (passwordHash) {
                    return User.update(({
                        password: passwordHash,
                    },{where: {email: req.body.email}}))
                    .then(() => {
                        res.status(200).json({message: "Password updated", success: true});
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(502).json({message: "error while updatign the password", success: false});
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
}
const codeVerify = (req, res, next) => {
    const ENAME = process.env.EMAIL_NAME;
    const EPASS = process.env.EMAIL_PASS;
    const etrans = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: ENAME,
            pass: EPASS
        }
    });
    User.findOne({where: {
        email: req.body.email,
    }}).then(dbUser => {
        if(!dbUser){
            return res.status(409).json({message: "No user with given email!"});
        } else if (req.body.email) {
            codes = codes.filter(item => !(item.email == req.body.email));
            const code = Math.floor(100000 + Math.random() * 900000);
            const pack = {"email": req.body.email, "code": code.toString()};
            codes.push(pack);
            const email = {
                from: ENAME,
                to: req.body.email,
                subject: 'Verification code',
                text: code.toString()
            };
            etrans.sendMail(email, (err, res) => {
                if(err)
                    console.log(err);
                else
                    console.log('Sent: '+ res.response);
            });
            return res.status(200).json({"email": req.body.email, "code": code.toString()});
        } else {
            return res.status(400).json({message: "Email not provided"});
        }
    }).catch(err => {
        console.log(err);
    })
    
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

export { signup, login, isAuth, codeVerify, updatePass };