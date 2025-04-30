const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendOTPEmail = async (email, otp) => {
  const supportLink = `${process.env.FRONTEND_URL}/kontak`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `${otp} Kode masuk dari Cultivo`,
    html: `
      <div style="background-color: #121212; padding: 20px; color: white; font-family: Arial, sans-serif; text-align: center;">
       <div style="font-size: 28px; font-weight: bold; margin-bottom: 20px;">
    Cultivo
  </div>
        <div style="background: #1E1E1E; padding: 20px; border-radius: 8px;">
          <h2>Selamat Datang Kembali!</h2>
          <p>Berikut adalah kode 6 digit untuk memverifikasi alamat email Anda:</p>
          <h1 style="font-size: 32px; margin: 20px 0; font-weight: bold;">${otp}</h1>
          <p><strong>Kode ini hanya berlaku untuk satu kali penggunaan.</strong></p>
          <p>Kedaluwarsa dalam <strong>5 menit</strong>.</p>
        </div>
        <p style="margin-top: 20px; font-size: 14px;">
          Jika Anda tidak mengajukan permintaan ini atau memiliki pertanyaan, silakan 
          <a href="${supportLink}" style="color: #4DA8DA;">hubungi kami</a> dan kami akan siap membantu.
        </p>
        <p style="font-size: 12px; margin-top: 20px; color: gray;">
          &copy; 2025 Cultivo. Hak cipta dilindungi oleh undang-undang.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
