const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const { sendOTPEmail } = require("../services/emailService");
const nodemailer = require("nodemailer");
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.verifyOTP = async (req, res) => {
  const { otp, otpToken } = req.body;

  try {
    // Verifikasi token OTP yang dikirimkan user
    const decoded = jwt.verify(otpToken, process.env.JWT_SECRET);

    // Cek apakah OTP yang dimasukkan benar
    if (decoded.otp !== otp) {
      return res.status(400).json({ message: "Kode OTP tidak valid" });
    }

    // Jika OTP benar, tandai user sebagai terverifikasi di database
    const result = await query(
      "UPDATE users SET isVerified = true WHERE email = ?",
      [decoded.email]
    );

    // Ambil data user setelah verifikasi
    const userResult = await query("SELECT * FROM users WHERE email = ?", [
      decoded.email,
    ]);
    const user = userResult[0];

    // Buat token login baru setelah verifikasi berhasil
    const loginToken = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token berlaku selama 1 jam
    );

    // Simpan token di cookies
    res.cookie("user_token", loginToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000, // Token berlaku selama 1 jam
    });

    // Kirimkan respons sukses dengan data user
    res.status(200).json({
      message: "Verifikasi berhasil, Anda telah login",
      user: {
        name: user.name,
        email: user.email,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(400).json({
      message: "Kode OTP kadaluwarsa atau salah",
      error: error.message,
    });
  }
};

exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const otp = generateOTP();

    const token = jwt.sign({ email, otp }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    await sendOTPEmail(email, otp);

    res.status(200).json({ message: "OTP resent successfully", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

exports.FormContact = async (req, res) => {
  const { firstName, lastName, email, phone, message } = req.body;

  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ error: "Semua field wajib diisi!" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Form Kontak" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Pesan Baru dari Form Kontak",
      html: `
        <h3>Pesan Baru dari Form Kontak</h3>
        <p><strong>Nama:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>No Telepon:</strong> ${phone || "Tidak diberikan"}</p>
        <p><strong>Pesan:</strong></p>
        <p>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Pesan berhasil dikirim!" });
  } catch (error) {
    console.error("Error saat mengirim email:", error);
    res.status(500).json({ error: "Terjadi kesalahan. Coba lagi nanti." });
  }
};
