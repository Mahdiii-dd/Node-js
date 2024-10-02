const {User} = require('../model/user');

let authenticate = (req, res, next) => {
  let token = req.header('x-auth');
  console.log("Token received:", token);

  User.findByToken(token).then((user)=>{
    if(!user) {
        return Promise.reject();
    }
    console.log("User authenticated:", user._id);
    req.user = user;
    req.token = token;
    next();
  }).catch((err)=>{
    res.status(401).send();
  });
};

module.exports = {
    authenticate
};    