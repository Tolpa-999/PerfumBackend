const asyncWrapper = require("../middlewares/asyncWrapper")
const Users = require("../models/users.model")
const appError = require("../utils/appError")
const httpStatus = require("../utils/httpStatusText")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const generateJWT = require("../utils/generateJWT")
const { sendVerificationMail } = require("../services/verificationMail")
const crypto = require('crypto'); // To generate a random token
const validatorRequest = require("../schemas/validatorRequest")
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: 'Too many login attempts, please try again later'
});




const getAllUsers = asyncWrapper(async (req, res, next) => {
    const error = validatorRequest("getAllUsers", req.query)
    if (error !== true ) {
        return next(error)
    }
    const { page = 1, limit = 10 } = req.query;

    const users = await Users.find({}, { __v: 0, password: 0, refreshTokens: 0  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

    console.table(users);

    res.status(200).json({
        status: httpStatus.SUCCESS,
        data: users,
    })
})


// const register = asyncWrapper(async (req, res, next) => {


//     const error = validatorRequest("register", req.body)
//     if (error !== true ) {
//         return next(error)
//     }

//     const { username, email, password } = req.body
//     const bcryptPass = await bcrypt.hash(password, 12)


//     const oldUserByUsername = await Users.findOne({ username }, { __v: 0, password: 0, refreshTokens: 0  })
//     const oldUserByEmail = await Users.findOne({ email }, { __v: 0, password: 0, refreshTokens: 0  })

//     if (oldUserByUsername || oldUserByEmail) {
//       if (oldUserByEmail?.emailVerified || oldUserByUsername?.emailVerified) {
//         const error = appError.create("user already exist", 400, httpStatus.FAIL)
//         return next(error)
//     } else {
//       await oldUserByUsername.updateOne()
//     }
//     } else {
//       const newUser = new Users({
//         username,
//         email,
//         password: bcryptPass,
//         emailVerificationExpires: Date.now() + 3600000 
//     })
//     }

    

    

//     // const token = await generateJWT({ _id: newUser._id, username, email }, '1h')

//     // newUser.token = token
//     // console.log("user id =============", newUser._id);
//     const verificationToken = await generateJWT({ userId: newUser.id, username, email }, '15m');
//     try {
//         await sendVerificationMail(newUser.email, "Email Verification", `http://localhost:5173/verify-email?token=${verificationToken}`)
//     } catch (error) {
//         console.log(error);
//     }

//     await newUser.save()

//     const { password: _, ...userData } = newUser.toObject();

//     res.status(201).json({
//         status: httpStatus.SUCCESS,
//         data: userData,
//     })
// })

const register = asyncWrapper(async (req, res, next) => {
  const error = validatorRequest("register", req.body);
  if (error !== true) {
      return next(error);
  }

  const { username, email, password } = req.body;
  const bcryptPass = await bcrypt.hash(password, 12);

  // Check for existing user using single query
  const existingUser = await Users.findOne({
      $or: [{ username }, { email }]
  });

  if (existingUser) {
      if (existingUser.emailVerified) {
          const error = appError.create("User already exists", 400, httpStatus.FAIL);
          return next(error);
      }

      // Update existing unverified user
      existingUser.password = bcryptPass;
      existingUser.emailVerificationExpires = Date.now() + 3600000;
      const verificationToken = await generateJWT(
          { userId: existingUser._id, username, email },
          '15m'
      );

      try {
          await sendVerificationMail(
              existingUser.email,
              "Email Verification Resent",
              `https://perfumeni.vercel.app/verify-email?token=${verificationToken}`
          );
      } catch (error) {
          console.log("Email sending error:", error);
      }

      await existingUser.save();

      const { password: _, ...userData } = existingUser.toObject();
      return res.status(200).json({
          status: httpStatus.SUCCESS,
          data: userData,
          message: "Verification email resent"
      });
  }

  // Create new user if no existing record found
  const newUser = new Users({
      username,
      email,
      password: bcryptPass,
      emailVerificationExpires: Date.now() + 3600000
  });

  const verificationToken = await generateJWT(
      { userId: newUser._id, username, email },
      '15m'
  );

  try {
      await sendVerificationMail(
          newUser.email,
          "Email Verification",
          `https://perfumeni.vercel.app/verify-email?token=${verificationToken}`
      );
  } catch (error) {
      console.log("Email sending error:", error);
  }

  await newUser.save();

  const { password: _, ...userData } = newUser.toObject();

  res.status(201).json({
      status: httpStatus.SUCCESS,
      data: userData,
  });
});

const verifyEmail = asyncWrapper(async (req, res, next) => {
    
    const error = validatorRequest("verifyEmail", req.query)
    if (error !== true ) {
        return next(error)
    }
    
    const token = req.query.token
    
    // const accessToken = await generateJWT({ token }, '1h')

    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
        if (err) {
            const error = appError.create(err.message || "invalid token", 400, httpStatus.FAIL)
            return next(error)
        }

        const user = await Users.findOne({ email: decoded.email }, { __v: 0, password: 0 , refreshTokens: 0  });
        if (!user) {
            const error = appError.create("user not found", 400, httpStatus.FAIL)
            return next(error)
        }

        if (user.emailVerified) {
            const error = appError.create("user already verified", 400, httpStatus.FAIL)
            return next(error)
        }

        user.emailVerified = true
        await user.save()

        return res.status(200).json({ status: httpStatus.SUCCESS, data: user })
    })
})

const login = asyncWrapper(async (req, res, next) => {
    // Validate request
    const error = validatorRequest("login", req.body);
    if (error !== true) {
      return next(error);
    }
  
    const { email, password } = req.body;
  
    // Find user with password and necessary fields
    const user = await Users.findOne({ email })
      .select('+password +loginAttempts +lockUntil +emailVerified +refreshTokens')
      .lean(); // Use .lean() for faster query
  
    if (!user) {
      return next(appError.create("User not found", 400, httpStatus.FAIL));
    }
  
    // Check if email is verified
    if (!user.emailVerified) {
      return next(appError.create("Email not verified", 400, httpStatus.FAIL));
    }
  
    // Account locking check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((user.lockUntil - Date.now()) / 1000);
      res.set('Retry-After', retryAfter);
      return next(
        appError.create(
          `Account locked. Try again in ${Math.ceil(retryAfter / 60)} minutes`,
          423,
          httpStatus.FAIL
        )
      );
    }
  
    // Validate credentials
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await Users.updateOne(
        { email },
        { $inc: { loginAttempts: 1 } }
      );
  
      if (user.loginAttempts >= 4) {
        await Users.updateOne(
          { email },
          {
            $set: { lockUntil: Date.now() + 15 * 60 * 1000 }, // 15-minute lock
            $unset: { loginAttempts: "" },
          }
        );
  
        return next(
          appError.create("Account locked. Try again in 15 minutes", 423, httpStatus.FAIL)
        );
      }
  
      return next(appError.create("Invalid username or password", 401, httpStatus.FAIL));
    }
  
    // Reset login attempts on success
    await Users.updateOne(
      { email },
      { $unset: { loginAttempts: 1, lockUntil: 1 } }
    );
  
    // Generate tokens
    const accessToken = await generateJWT({ userId: user._id, email, username: user.username  }, '15m');
    const refreshToken = await generateJWT({ userId: user._id, email, username: user.username}, '7d');
  
    // Store refresh token securely
    await Users.updateOne(
      { email },
      { $push: { refreshTokens: { token: refreshToken, issuedAt: new Date() } } }
    );
  
    // Set secure cookies
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  
    // Remove sensitive data from response
    const { password: _, ...userData } = user;
  
    res.json({
      status: httpStatus.SUCCESS,
      data: {
        accessToken,
        user: userData,
      },
    });
  });

const reset_password_request = asyncWrapper(async (req, res, next) => {

    const error = validatorRequest("reset_password_request", req.body)
    if (error !== true ) {
        return next(error)
    }
    const { email } = req.body
   

    const user = await Users.findOne({ email: email }, { __v: 0, password: 0 , refreshTokens: 0  });
    if (!user) {
        const error = appError.create("user not found", 404, httpStatus.FAIL)
        return next(error)
    }

    const token = await crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = `reset-${token}`
    user.resetPasswordExpires = Date.now() + 3600000 // 1 hour to expired
    await user.save()

    const url = `${req.protocol}://${req.get('host')}/api/users/reset-pass?token=reset-${token}`

    await sendVerificationMail(email, 'Password Reset', url)

    return res.status(200).json({ status: httpStatus.SUCCESS, data: user })
})


const reset_password = asyncWrapper(async (req, res, next) => {

    const toVerify = {
        ...req?.query,
        ...req?.body
    } 

    const errorValidation = validatorRequest('reset_password', toVerify);
    if (errorValidation !== true) {
        return next(errorValidation)
    } 




    const user = await Users.findOne({
        resetPasswordToken: toVerify.token,
        resetPasswordExpires: { $gt: Date.now() }
    }).select('+password');


    if (!user) {
        const error = appError.create("user not found or token is expired", 400, httpStatus.FAIL)
        return next(error)
    }

    const isMatch = await bcrypt.compare(toVerify.newPassword, user.password)
    if (isMatch) {
        const error = appError.create("new password cannot be the same as old password", 400, httpStatus.FAIL)
        return next(error)
    }

    const bcryptPass = await bcrypt.hash(toVerify.newPassword, 12)

    // const user = await Users.findOneAndUpdate({
    //     resetPasswordToken: token,
    //     resetPasswordExpires: { $gt: Date.now() }
    // }, {
    //     password: bcryptPass,
    //     resetPasswordToken: null,
    //     resetPasswordExpires: null
    // })

    user.password = bcryptPass
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    user.refreshTokens = [];
    await user.save()

    const { password: _, ...userData } = user.toObject();

    return res.status(200).json({ status: httpStatus.SUCCESS, data: userData })
})


const refreshToken = asyncWrapper(async (req, res, next) => {
    
    const error = validatorRequest("refreshToken", req?.cookies)
    if (error !== true ) {
        return next(error)
    }
    
    const oldToken = req?.cookies?.refreshToken;


    jwt.verify(oldToken, process.env.JWT_SECRET_KEY, async (err, decoded) => {
        if (err) {
            // invalid token
            const err = appError.create("unavlid or expired token sign in again", 406, httpStatus.FAIL);
            return next(err)
        }



        // token is valid send new access token
        const accessToken = await generateJWT({ userId: decoded.userId, email: decoded.email, username: decoded.username}, '15m')

        // console.log('decoded =========', decoded)

        // console.log('accessToken ================', accessToken)

        const user = await Users.findOne({ _id: decoded.userId }, { __v: 0, password: 0, refreshTokens: 0 });


        return res.status(200).json({
            status: httpStatus.SUCCESS,
            data: {
                accessToken,
                user,
            }
        })
    })

})


const invalidateSessions = asyncWrapper(async (req, res, next) => {
    await Users.findByIdAndUpdate(req.user.id, {
      $set: { refreshTokens: [] }
    });
    res.clearCookie('refreshToken');
    res.status(204).json({ status: 'success' });
  });

const logout = asyncWrapper(async (req, res, next) => {
    // const oldToken = req.cookies?.refreshToken;
    await res.clearCookie('refreshToken')
    await res.clearCookie('authjs.session-token')

    return res.status(200).json({
        status: httpStatus.SUCCESS,
        data: null
    })

})

module.exports = {
    getAllUsers,
    register,
    login,
    refreshToken,
    verifyEmail,
    reset_password_request,
    reset_password,
    invalidateSessions,
    logout,
}
