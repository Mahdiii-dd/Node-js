//---Config
process.env.NODE_CONFIG_DIR = __dirname + "/config";
const config = require("config");
const express = require("express");
const _ = require("lodash");
const parser = require('body-parser');

const {User} = require("./model/user");
//const bodyParser = require("body-parser");//

console.log(`*** ${String(config.get("Level")).toUpperCase()} ***`);

const app = express();
//app.use(bodyParser());//
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.post("/api/users", (req, res) => {
  const body = _.pick(req.body, ["fullname", "email", "password"]);

  console.log(body);

  let user = new User(body); // inja user jadid ro sakhtim //
  user.save().then((user) => {
      res.status(200).send(user); //agar ke dorost bod rest kon in code 200 ro //
    }, (err) => {
      res.status(400).json({
        Error: `Somthing went wrong. ${err}`, // err 400 bad request hast
      });
    });
});


app.post('/api/login', (req, res)=>{
  const body = _.pick(req.body,['email', 'password'])

  User.findByCredentials(body.email, body.password).then((user)=>{
    user.generateAuthToken().then((token)=>{
      res.header('x-auth', token).status(200).send(token);
    },(err)=>{
      res.status(400).json({
        Error: `somthing went wrong. ${err}`
      });
    });
  })
});

app.listen(config.get("PORT"), () => {
  console.log(`Server is running on port ${config.get("PORT")}`);
});

// let newUser = new User({
//     fullname: 'Mehdi Abdi',
//     email: 'mahdi2.abdiii@gmail.com',
//     password: '123456'
// });

// newUser.save().then((user) => {
//     console.log('User has been saved to the database.', user);
// }).catch((err) => console.log(err));
