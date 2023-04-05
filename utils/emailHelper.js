const nodemailer = require("nodemailer");

const mailHelper = async (option) => {
  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER, // generated ethereal user
      pass: process.env.SMTP_PASS, // generated ethereal password
    },
  });

  const { email, subject, message } = option;
  const messageDetails = {
    from: "kumargarima59@gmail.com", // sender address
    to: email, // list of receivers
    subject: subject, // Subject line
    text: message, // plain text body
  };
  // send mail with defined transport object
  await transporter.sendMail(messageDetails);
};

module.exports = mailHelper;
