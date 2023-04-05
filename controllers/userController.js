const User = require("../models/user");
const Bigpromise = require("../middlewares/bigPromise");
const CustomError = require("../utils/customError");
const cookieToken = require("../utils/cookieToken");
const cloudinary = require("cloudinary");
const mailHelper = require("../utils/emailHelper");
const crypto = require("crypto");

exports.signup = Bigpromise(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!req.files) {
    return next(new CustomError("photo is required for signup", 400));
  }

  if (!email || !name || !password) {
    return next(new CustomError("Name, email or password is missing", 400));
  }

  let file = req.files.photo;
  const result = await cloudinary.v2.uploader.upload(file.tempFilePath, {
    folder: "users",
    width: 150,
    crop: "scale",
  });

  const user = await User.create({
    name,
    email,
    password,
    photo: {
      id: result.public_id,
      secure_url: result.secure_url,
    },
  });

  cookieToken(user, res);
});

exports.login = Bigpromise(async (req, res, next) => {
  const { email, password } = req.body;

  // check for presence of email and password
  if (!email || !password) {
    return next(new CustomError("Email or password is missing", 400));
  }

  // get user from DB
  const user = await User.findOne({ email }).select("+password");

  // if user not found in DB
  if (!user) {
    return next(
      new CustomError("Entered email not found or is incorrect", 400)
    );
  }

  // if password does not match
  const isPasswordCorrect = await user.isValidPassword(password);

  // if password does not match
  if (!isPasswordCorrect) {
    return next(new CustomError("Entered password is incorrect", 400));
  }

  // if everything is fine, send Token
  cookieToken(user, res);
});

exports.logout = Bigpromise(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

exports.forgotPassword = Bigpromise(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // if user not found in DB
  if (!user) {
    return next(new CustomError("Email not found as registered", 400));
  }

  // get token fro user model methods
  const forgotToken = user.getForgotPasswordToken();

  // save user fields in DB
  await user.save({ validateBeforeSave: false });

  // create a URL
  const myUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/password/reset/${forgotToken}`;

  // craft a message
  const message = `Copy paste this link in your URL and hit enter \n\n ${myUrl}`;

  // attempt to send email
  try {
    await mailHelper({
      email: user.email,
      subject: "LCO TStore - Password reset email",
      message,
    });

    // json response if email is success
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    // reset user fields if things go wrong
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new CustomError(error.message, 500));
  }
});

exports.resetPassword = Bigpromise(async (req, res, next) => {
  const token = req.params.token;

  const encryptToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    encryptToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  // res.json({ User, encryptToken });

  if (!user) {
    return next(new CustomError("Token is invalid or expired", 400));
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new CustomError("Password and Confirm password do not match", 400)
    );
  }

  user.password = req.body.password;

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  await user.save();

  cookieToken(user, res);
});

exports.getLoggedInUserDetails = Bigpromise(async (req, res, next) => {
  const user = await User.findById(req.user.id); //  //req.user will be added by middleware
  // find user by id

  res.status(200).json({
    success: true,
    user,
  });
});

exports.changePassword = Bigpromise(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select("+password");

  const isCorrectOldPassword = await user.isValidPassword(req.body.oldPassword);

  if (!isCorrectOldPassword) {
    return next(new CustomError("old password is incorrect", 400));
  }

  // allow to set new password
  user.password = req.body.password;

  await user.save();

  cookieToken(user, res);
});

exports.updateUserDetails = Bigpromise(async (req, res, next) => {
  // update name and email
  const newData = {
    name: req.body.name,
    email: req.body.email,
  };

  // update photo
  if (req.files) {
    const user = await User.findById(req.user.id);

    const imageId = user.photo.id;

    // destroy old photo
    const resp = await cloudinary.v2.uploader.destroy(imageId);

    // add new photo
    const result = await cloudinary.v2.uploader.upload(
      req.files.phot.tempFilePath,
      {
        folder: "users",
        width: 150,
        crop: "scale",
      }
    );

    newData.photo = {
      id: result.public_id,
      secure_url: result.secure_url,
    };
  }

  const user = await User.findByIdAndUpdate(req.user.id, newData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

// ADMIN
exports.adminAllUser = Bigpromise(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

exports.adminGetOneUser = Bigpromise(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new CustomError("No user found", 400));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

exports.adminUpdateOneUserDetails = Bigpromise(async (req, res, next) => {
  // update name and email
  const newData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

exports.adminDeleteOneUser = Bigpromise(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new CustomError("No such user found", 401));
  }

  // remove photo
  const imageId = user.photo.id;
  await cloudinary.v2.uploader.destroy(imageId);

  await User.findByIdAndRemove(req.params.id);

  res.status(200).json({
    success: true,
  });
});

// MANAGER
exports.managerAllUser = Bigpromise(async (req, res, next) => {
  const users = await User.find({ role: "user" });

  res.status(200).json({
    success: true,
    users,
  });
});
