import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

import User from '../models/user.js';
import dotenv from 'dotenv'

dotenv.config();
var codes = []; 
const codeVerify = (req, res, next) => {
    
    const r_mail = req.body.email;
    const r_code = req.body.code;
    
    if (!r_mail)
        return res.status(409).json(
            {
                message: "No mail given",
                success: false
            })
    if (!r_code)
        return res.status(409).json(
            {
                message: "No code given",
                success: false
            })

    const target = codes.find(item => item.email === r_mail);
    if (!target)
        return res.status(409).json(
            {
                message: "No code has been sent to this email",
                success: false
            }
        )
    if (target.code !== r_code)
        return res.status(409).json(
            {
                message: "Invalid code",
                success: false
            }
        )
    else 
    {
        target.verified = true; 
            return res.status(200).json(
                {
                    message: "Code verified",
                    success: true
                }
            )
    }

}
const updatePass = (req, res, next) => {
    
    const targetUser = codes.find(obj => obj.email === req.body.email);
    if (!targetUser)
        return res.status(409).json({message: "No code sent for this email", success: false});
    if (!targetUser.verified)
        return res.status(409).json({message: "Email code not verified", success: false});
    
    codes = codes.filter(item => item !== targetUser);
    
    User.findOne({
        where: {
            email: req.body.email,
        }
    })
        .then(dbUser => {
            if (!dbUser) {

                return res.status(409).json({ message: "No user with this email  exists", success: false });
            } else if (req.body.email && req.body.password) {
                bcrypt.hash(req.body.password, 12, (err, passwordHash) => {
                    if (err) {
                        return res.status(500).json({ message: "couldnt hash the password", success: false });
                    } else if (passwordHash) {
                        return dbUser.update(({
                            password: passwordHash,
                        }))
                            .then(() => {
                                res.status(200).json({ message: "User updated", success: true });
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(502).json({ message: "error while updating the password", success: false });
                            });
                    };
                });
            } else if (!req.body.password) {
                return res.status(400).json({ message: "Password not provided", success: false });
            } else if (!req.body.email) {
                return res.status(400).json({ message: "Email not provided", success: false });
            };
        })
        .catch(err => {
            console.log('error', err);
        });
}
const getCode = (req, res, next) => {
    const ENAME = process.env.EMAIL_NAME;
    const EPASS = process.env.EMAIL_PASS;
    const etrans = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: ENAME,
            pass: EPASS
        }
    });
    User.findOne({
        where: {
            email: req.body.email,
        }
    }).then(dbUser => {
        if (!dbUser) {
            return res.status(409).json({ message: "No user with given email!", success: false });
        } else if (req.body.email) {
            codes = codes.filter(item => !(item.email == req.body.email));
            const code = Math.floor(100000 + Math.random() * 900000);
            const pack = { "email": req.body.email, "code": code.toString(), "verified": false };
            
            codes.push(pack);
            const email = {
                from: ENAME,
                to: req.body.email,
                subject: 'Verification code',
                text: code.toString()
            };
            etrans.sendMail(email, (err, res) => {
                if (err)
                    console.log(err);
              
            });
            return res.status(200).json({ "email": req.body.email, success: true });
        } else {
            return res.status(400).json({ message: "Email not provided", success: false });
        }
    }).catch(err => {
        console.log(err);
    })

}

const signup = (req, res, next) => {
    
    User.findOne({
        where: {
            email: req.body.email,
        }
    })
        .then(dbUser => {
            if (dbUser) {

                return res.status(409).json({ message: "A user with this email already exists", success: false });
            } else if (req.body.email && req.body.password) {
                
                bcrypt.hash(req.body.password, 12, (err, passwordHash) => {
                    if (err) {
                        return res.status(500).json({ message: "couldnt hash the password", success: false });
                    } else if (passwordHash) {
                        
                        return User.create(({
                            email: req.body.email,
                            name: req.body.name,
                            password: passwordHash,
                        }))
                            .then(() => {
                                res.status(200).json({ message: "User created", success: true });
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(502).json({ message: "error while creating the user", success: false });
                            });
                    };
                });
            } else if (!req.body.password) {
                return res.status(400).json({ message: "Password not provided", success: false });
            } else if (!req.body.email) {
                return res.status(400).json({ message: "Email not provided", success: false });
            };
        })
        .catch(err => {
            console.log('error', err);
        });
};

const login = (req, res, next) => {
    
    User.findOne({
        where: {
            email: req.body.email,
        }
    })
        .then(dbUser => {
            if (!dbUser) {
                return res.status(404).json({ message: "user not found", success: false });
            } else {
                
                bcrypt.compare(req.body.password, dbUser.password, (err, compareRes) => {
                    if (err) { 
                        res.status(502).json({ message: "error while checking user password", auth: false });
                    } else if (compareRes) { 
                        const token = jwt.sign({ email: req.body.email }, process.env.SECRET, { expiresIn: '7d' });
                        res.status(200).json({ message: "User logged in", "token": token, auth: true });
                    } else { 
                        res.status(401).json({ message: "Invalid credentials", auth: false });
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

export { signup, login, isAuth, codeVerify, updatePass, getCode };