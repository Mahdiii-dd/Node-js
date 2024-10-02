//---Config
process.env.NODE_CONFIG_DIR = __dirname + "/config";
const mongoose = require('mongoose');
const config = require("config");
const express = require("express");
const morgan = require("morgan");
const helmet = require ("helmet");
const winston = require("winston");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const persianDate = require('persian-date');
const parser = require("body-parser");
const jalaali = require('jalaali-js');
const { User } = require("./model/user");
const { authenticate, athenticate} = require('./middleware/authenticate');
const e = require("express");
//const bodyParser = require("body-parser");//

const {
  splitDate,
  // persianDate,
  printRunLevel
} = require('./utils/utils');

printRunLevel(config.get('Level'));

const app = express();
app.use(express.json());
const requestLogger = fs.createWriteStream(path.join(__dirname, 'log/request.log'));

const {
  logger
} = require('./utils/winstonOption');



app.use(express.json());
app.use(helmet());
app.use(morgan('combined', {stream: requestLogger}));
app.use(express.urlencoded({ extended: true }));
app.post("/api/users", async (req, res) => {
  try {
    const body = _.pick(req.body, ["fullname", "email", "password"]);
    let user = new User(body); // inja user jadid ro sakhtim //

    await user.save();
    res.status(200).send(user); //agar ke dorost bod rest kon in code 200 ro //
  } catch (error) {
    res.status(400).json({
      Error: `Somthing went wrong. ${error.message}`, // err 400 bad request hast
    });
  }
});

app.post("/api/login", async(req, res) => {
  
  try {
    const body = _.pick(req.body, ['email', 'password']);
    let user = await User.findByCredentials(body.email, body.password);
    if(!user){
      if (!user) {
        return res.status(404).json({
          Error: 'User not found'
        });
      }
    }
    let token = await user.generateAuthToken();
    res.header('x-auth', token).status(200).send({ token });

} catch (error) {
    res.status(400).send({
        error: 'Email or password notcorrect',
        // details: error.message || error
        details: JSON.stringify(error)
    });
}
});

app.delete('/api/logout', authenticate, async (req, res)=>{
  try {
    await req.user.removeToken(req.token);
    res.status(200).json({
      Message: 'Logout successfull'
    })
  } catch (error) {
    res.status(400).json({
      Error: `Somthing went wrong. ${e}`
    });
  }
})
app.put('/api/payments', authenticate, async (req, res)=>{
  let body = _.pick(req.body, ['id', 'info', 'amount', 'date']);

  try {
    let user = await User.findOneAndUpdate({
      _id: req.user._id,
      // 'payments._id': mongoose.Types.ObjectId(body.id)
      // 'payments._id': body.id
    },{
      $set: {
        'payment.$.info': body.info,
        'payment.$.amount': body.amount,
        'payment.$.date': body.date
      }
    },{
    });

    if(!user) {
      return res.status(404).json({
        Error: 'Not found'
      })
    }
    console.log('User after update:', user);
    res.status(200).json({
      Message: 'Payment Updated',
    });
  } catch (error) {
    console.log('Error during update:', error);
    res.status(400).json({
      Error: `Somthing went wrong. ${error.message}`, // err 400 bad request hast
    });
  }
});

app.get('/api/paymentsSum', authenticate, async (req, res)=>{
  let amount = [];
  let theDate;

  try {
    let user = await User.findOne({
      _id: req.user._id
    });


    if(!user) {
      return res.status(404).json({
        Error: 'Not found'
      });
    }

    user.payments.forEach((element)=>{
      let splitArr = splitDate(element.date);
      theDate = new persianDate([Number(splitArr[0]), Number(splitArr[1]), Number(splitArr[2])]);
      let todayDate = new persianDate();

      if (theDate.isSameMonth(todayDate)){
        amount.push(element.amount);
      }
    });

    res.status(200).json({
      Sum: `${_.sum(amount)}`
    });
  } catch (error) {
    console.log('Error during update:', error);
    res.status(400).json({
      Error: `Somthing went wrong. ${error.message}`, // err 400 bad request hast
    });
  }
});

app.get('/api/payments/:date', authenticate, async (req, res)=> {
  let param = req.params.date;
  // console.log(param);
  let date = param.replaceAll('-', '/');
  
  try {

    let user = await User.findOne({
      _id: req.user._id
    });
    let payments = [];
    if (!user) {
      return res.status(404).json({
        Error: 'User not found'
      });
    }


    user.payments.forEach((element)=>{
      // console.log(element);
      if (element.date === date) {
        payments.push(element);
        // console.log(date);
      }
    });

    // console.log(payments);
    res.status(200).send(payments);
  } catch (error) {
    res.status(400).json({
      Error: `Somthing went wrong. ${error.message}`, // err 400 bad request hast
    });
  }
});

app.listen(config.get("PORT"), () => {
 logger.log({
  level: 'info',
  message: `server running on port ${config.get('PORT')}`
 });
});

app.delete('/api/payments/:id', authenticate, async (req, res)=>{
  let id = req.params.id;

  try {
    let user = await User.findOneAndUpdate({
      _id: req.user,_id,
      'payments._id' : id
    },{
      $pull: {
        payments: {
          _id: id
        }
      }
    });

    if (!user){
      return res.status(404).json({
        Error: 'User not found'
      });
    }
    res.status(200).send(user.payments);
  } catch (error) {
    res.status(400).json({
      Error: `Somthing went wrong. ${error.message}`, // err 400 bad request hast
    });
  }
})
app.post('/api/payments', authenticate, async (req, res)=>{
  try {
    const body = _.pick(req.body, ['info', 'amount']);
    let date = new Date();
    const jalaaliDate = jalaali.toJalaali(date);
    const formattedDate = `${jalaaliDate.jy}/${jalaaliDate.jm}/${jalaaliDate.jd}`;
    let user = await User.findOneAndUpdate({
      _id: req.user._id
    },{
      $push: {
        payments: {
          info: body.info,
          amount: body.amount,
          date: formattedDate
        }
      }
    },
      {new: true}
    );
    if (!user) {
      return res.status(404).json({
         Error: 'User not found'
      });
    }
    res.status(200).json({
      Message: 'Payment has been saved'
    });
   } catch (error) {
    res.status(400).json({
      Error: `Somthing went wrong. ${error}`
    });
  }

});

app.get('/api/payment', authenticate, async (req, res)=>{
  try {
    let user = await User.findOne({
      _id: req.user._id
    });

    if (!user){
      return res.status(404).json({
        Error: 'User not found'
      });
    }
    res.status(200).send(user.payments)
  } catch (error) {
    res.status(400).json({
      Error: `Somthing went wrong. ${error.message}`, // err 400 bad request hast
    });
  }
});

app.get('/api/receiveSum', authenticate, async (req, res)=>{
  let amount = [];
  let theDate;

  try {
    let user = await User.findOne({
      _id: req.user._id
    });


    if(!user) {
      return res.status(404).json({
        Error: 'Not found'
      });
    }

    user.receive.forEach((element)=>{
      let splitArr = splitDate(element.date);
      theDate = new persianDate([Number(splitArr[0]), Number(splitArr[1]), Number(splitArr[2])]);
      let todayDate = new persianDate();

      if (theDate.isSameMonth(todayDate)){
        amount.push(element.amount);
      }
    });

    res.status(200).json({
      Sum: `${_.sum(amount)}`
    });
  } catch (error) {
    console.log('Error during update:', error);
    res.status(400).json({
      Error: `Somthing went wrong. ${error.message}`, // err 400 bad request hast
    });
  }
});


app.get('/api/receive/:date', authenticate, async (req, res)=> {
  let param = req.params.date;
  let date = param.replaceAll('-', '/');
  // console.log(date);
  try {

    let user = await User.findOne({
      _id: req.user._id
    });
    let receive = [];
    if (!user) {
      return res.status(404).json({
        Error: 'User not found'
      });
    }
    // console.log(`element.date: ${element.date}, date: ${date}`);
    user.receive.forEach((element)=>{
      // console.log(element);
      if (element.date === date) {
        receive.push(element);
        console.log(element);
      }
    });

    // console.log(receives);
    res.status(200).send(receive);
  } catch (error) {
    res.status(400).json({
      Error: `Somthing went wrong. ${error.message}`, // err 400 bad request hast
    });
  }
});
app.post('/api/receive', authenticate, async (req, res)=>{
  const body = _.pick(req.body, ['info', 'amount', 'date']);

  try {
    const user = await User.findById(req.user._id);

    if(!user){
      return res.status(404).json({ Error: 'User not found'});
    }

    user.receive.push(body);
    await user.save();

    res.status(201).json({ Message: 'Data received successfully', data: body });
  } catch (error) {
    res.status(400).json({ Error: `Somthing went wrong: ${error.message}`});
  }
});
app.get('/api/receive', authenticate, async (req, res) =>{
  try {
    const user = await User.findById(req.user._id).select('receive');
    if (!user) return res.status(404).json({ Error: 'User not found' });
    
    res.status(200).json({ data: user.receive });
} catch (error) {
    res.status(400).json({ Error: `Something went wrong: ${error.message}` });
}
});

app.put('/api/receive/:id', authenticate, async (req, res) => {
  const body = _.pick(req.body, ['info', 'amount', 'date']);
  const { id } = req.params; // گرفتن آیدی از پارامترهای URL

  try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ Error: 'User not found' });

      const paymentIndex = user.receive.findIndex(item => item._id.toString() === id);
      if (paymentIndex === -1) return res.status(404).json({ Error: 'Receive data not found' });

      user.receive[paymentIndex] = { ...user.receive[paymentIndex]._doc, ...body };
      await user.save();

      res.status(200).json({ Message: 'Data updated successfully', data: user.receive[paymentIndex] });
  } catch (error) {
      res.status(400).json({ Error: `Something went wrong: ${error.message}` });
  }
});


app.delete('/api/receive/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ Error: 'User not found' });

      user.receive = user.receive.filter(item => item._id.toString() !== id);
      await user.save();

      res.status(200).json({ Message: 'Data deleted successfully' });
  } catch (error) {
      res.status(400).json({ Error: `Something went wrong: ${error.message}` });
  }
});


// let newUser = new User({
//     fullname: 'Mehdi Abdi',
//     email: 'mahdi2.abdiii@gmail.com',
//     password: '123456'
// });

// newUser.save().then((user) => {
//     console.log('User has been saved to the database.', user);
// }).catch((err) => console.log(err));
