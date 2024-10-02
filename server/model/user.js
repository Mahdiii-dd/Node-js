const validator = require('validator');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const {mongoose} = require('./../db/mongoose');
let jwt = require('jsonwebtoken');
const config = require("config");
const { info } = require('winston');
const tokenOptions = {
    type: String,
    required: true
}
let UserSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        minlength: 3,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: 6,
        trim: true,
        validate: {
            validator: validator.isEmail,
            message: '{Value} is not valid email'
        }
    },
    password: {
        type: String,
        minlength: 6,
        required: true
    },
    tokens: [{
        _id: false,
        access: tokenOptions,
        token: tokenOptions
    }],
    payments: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            auto: true
        },
        info: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            required: true
        },
        date: {
            type: String,
            required: true
        }
    }],
    receive:[{
        info:{
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            required: true
        },
        date: {
            type: String,
            required: true
        }
    }]
});
UserSchema.methods.toJSON = function () {
    let user = this;
    let userObject = user.toObject();

    return _.pick(userObject, ['_id', 'fullname', 'email']);       
};

UserSchema.statics.findByCredentials = function (email, password) {
    let User = this;


    return User.findOne({
        email
    }).then((user)=>{
        if (!user){
            return Promise.reject();
        }
        return new Promise ((resolve, reject)=>{
            bcrypt.compare(password, user.password,(err, res)=>{
                if(res){
                    resolve(user);
                }else {
                    reject();
                }
            });
        });
    });
}

UserSchema.statics.findByToken = function (token) {
    let User = this;
    let decoded;

    try {
        decoded = jwt.verify(token, config.get('JWT_SECRET'));
    } catch (error) {
        return Promise.reject();
    }


    return User.findOne({
        _id: decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
}

UserSchema.methods.removeToken = function (token) {
    let user = this;

    return user.update({
        $pull: {
            tokens: {
                token
            }
        }
    });
}

UserSchema.methods.generateAuthToken = async function () {
    let user = this;
    let access = 'auth';

    let token = jwt.sign({
        _id: user._id.toHexString(),
        access
    },config.get('JWT_SECRET')).toString();

    user.tokens = user.tokens || [];
    user.tokens.push({
        access,
        token
    });

    try {
        await user.save();
        return token;
    } catch (error) {
        throw new Error('Error while saving token'); // مدیریت خطا
    }
    
};
UserSchema.pre('save', function (next){
    let user = this;

    if(user.isModified('password')){
        bcrypt.genSalt(10,(err, salt)=>{
            bcrypt.hash(user.password, salt, (err, hash)=>{
                this.password = hash;
                next();
            });
        });
    }else{
        next();
    }
});

let User = mongoose.model('User', UserSchema);



module.exports = {
    User
};