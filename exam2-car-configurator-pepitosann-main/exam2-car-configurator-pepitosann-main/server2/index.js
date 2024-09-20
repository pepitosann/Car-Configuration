'use strict';

const express = require('express');

const morgan = require('morgan');
const cors = require('cors');

const { body, validationResult } = require("express-validator");

const { expressjwt: jwt } = require('express-jwt');

const jwtSecret = '47e5edcecab2e23c8545f66fca6f3aec8796aee5d830567cc362bb7fb31adafc';

const jsonwebtoken = require('jsonwebtoken');
const expireTime = 60;

const app = new express();
const port = 3002;

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// set-up the middlewares
app.use(morgan('dev'));
app.use(express.json());

// Check token validity
app.use(jwt({
  secret: jwtSecret,
  algorithms: ["HS256"],
})
);

// To return a better object in case of errors
app.use(function (err, req, res, next) {
  console.log("err: ", err);
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ errors: [{ 'param': 'Server', 'msg': 'Authorization error', 'path': err.code }] });
  } else {
    next();
  }
});

app.post('/api/time',
  body('savedCarConfiguration.model', 'Invalid array of model').isArray({ min: 1 }),
  body('savedCarConfiguration.accessories', 'Invalid array of accessories').isArray(),
  (req, res) => {
    // Check if validation is ok
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({ errors: errList });
    }

    const quality = req.auth?.quality;
    const accessories = req.body.savedCarConfiguration.accessories;
    const savedCarConfiguration = req.body.savedCarConfiguration;

    let time = 0;
    const randomNum = Math.random() * 89 + 1;

    if (quality !== undefined && savedCarConfiguration !== undefined) {
      for (const acc of accessories) {
        const accessoryName = acc.accessory_name; // Access the first element in the array
        if (accessoryName) {
          time += accessoryName.trim().length * 3;
        } else {
          return res.status(400).json({ errors: [`Accessory name ${acc.accessory_name} not found`] });
        }
      }
      time = Math.round(time + randomNum);

      // Adjust the estimate for particularly good customers
      if (quality === true) {
        const randomDivisor = Math.random() * 2 + 2; // Generates a number between 2 (inclusive) and 4 (exclusive)
        time = Math.round(time / randomDivisor);
      }
    }

    res.json({ manufacturingTime: time });
  }
);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
