const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database.js");
const { sendOTPEmail } = require("../services/emailService");
const nodemailer = require("nodemailer");
const secretKey = process.env.JWT_SECRET;
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const registerUser = async (req, res) => {
  const { phone, email, password } = req.body;

  try {
    if (!phone.trim()) {
      return res
        .status(400)
        .json({ field: "phone", message: "Nomor telepon tidak boleh kosong" });
    }
    if (!email.trim()) {
      return res
        .status(400)
        .json({ field: "email", message: "Email tidak boleh kosong" });
    }
    if (!password.trim()) {
      return res
        .status(400)
        .json({ field: "password", message: "Password tidak boleh kosong" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ field: "email", message: "Format email tidak valid" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ field: "password", message: "Password minimal 8 karakter" });
    }

    const emailExists = await query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (emailExists.length > 0) {
      return res
        .status(400)
        .json({ field: "email", message: "Email sudah terdaftar" });
    }

    const phoneExists = await query("SELECT id FROM users WHERE phone = ?", [
      phone,
    ]);
    if (phoneExists.length > 0) {
      return res
        .status(400)
        .json({ field: "phone", message: "Nomor telepon sudah dipakai" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query(
      "INSERT INTO users (phone, email, password,role_id) VALUES (?, ?, ?,?)",
      [phone, email, hashedPassword, 2]
    );

    const otp = generateOTP();

    const token = jwt.sign({ email, otp }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    await sendOTPEmail(email, otp);

    res
      .status(201)
      .json({ message: "User registered, OTP sent to email", token });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "Daftar akun gagal", error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({
      field: "email",
      message: "Email harus diisi",
    });
  }
  if (!password) {
    return res.status(400).json({
      field: "password",
      message: "Password harus diisi",
    });
  }

  try {
    const result = await query("SELECT * FROM users WHERE email = ?", [email]);

    if (result.length === 0) {
      return res.status(400).json({
        field: "email",
        message: "Email yang Anda masukkan salah",
      });
    }
    const user = result[0];

    if (!user.isverified) {
      const generateOTP = () =>
        Math.floor(100000 + Math.random() * 900000).toString();

      const otp = generateOTP();
      const otpToken = jwt.sign({ email, otp }, process.env.JWT_SECRET, {
        expiresIn: "5m",
      });

      await sendOTPEmail(email, otp);

      return res.status(400).json({
        field: "email",
        message: "Mohon verifikasi Email Anda sebelum login",
        isverified: false,
        otpToken,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        field: "password",
        message: "Password salah",
      });
    }
    if (user.role_id !== 2) {
      return res.status(403).json({
        message: "Akun Anda tidak memiliki izin untuk mengakses aplikasi ini.",
      });
    }
    const role =
      user.role_id === 1 ? "admin" : user.role_id === 2 ? "user" : null;

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phonenumber: user.phonenumber,
        role_id: user.role_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Simpan refresh token di database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari
    await query(
      "INSERT INTO refresh_tokens (user_id, refresh_token, expires_at) VALUES (?, ?, ?)",
      [user.id, refreshToken, expiresAt]
    );

    // Set cookies
    res.cookie("user_refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });

    res.cookie("user_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    return res.status(200).json({
      message: "Login berhasil",
      name: user.name,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phonenumber: user.phonenumber,
      role_id: user.role_id,
      role,
      isverified: true,
    });
  } catch (err) {
    console.error("Error saat login:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const refreshTokenHandler = async (req, res) => {
  const token = req.cookies.user_refreshToken;

  if (!token) {
    return res.status(403).json({ message: "Refresh token tidak ditemukan" });
  }

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Refresh token tidak valid" });
    }

    // Cek apakah refresh token ada di database
    const result = await query(
      "SELECT * FROM refresh_tokens WHERE refresh_token = ?",
      [token]
    );
    if (result.length === 0) {
      return res
        .status(403)
        .json({ message: "Refresh token tidak ditemukan di database" });
    }

    const newToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        role_id: decoded.role_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set cookie baru untuk access token
    res.cookie("user_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000, // 1 jam
    });

    res.status(200).json({ accessToken: newToken });
  });
};

const loginWithGoogle = async (req, res) => {
  try {
    const user = req.user;

    // Generate token dan refresh token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role_id: user.role_id,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role_id: user.role_id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Simpan refresh token di database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari
    await query(
      "INSERT INTO refresh_tokens (user_id, refresh_token, expires_at) VALUES (?, ?, ?)",
      [user.id, refreshToken, expiresAt]
    );

    // Set cookies
    res.cookie("user_refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });

    res.cookie("user_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 60 * 60 * 1000, // 1 jam
    });

    // Redirect ke frontend
    res.redirect(process.env.FRONTEND_URL);
  } catch (error) {
    console.error("Login dengan Google gagal:", error);
    res.status(500).json({ message: "Login dengan Google gagal" });
  }
};

const getUserData = (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: "User tidak ditemukan" });
  }

  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Verifikasi refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Hapus token dari database pakai user_id dan token
      await query(
        "DELETE FROM refresh_tokens WHERE user_id = ? AND refresh_token = ?",
        [decoded.id, refreshToken]
      );
    }

    // Hapus cookie token dan refresh token
    res.clearCookie("user_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.clearCookie("user_refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.clearCookie("connect.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    res.status(200).json({ message: "Logout berhasil" });
  } catch (error) {
    console.error("Error saat logout:", error);
    res.status(500).json({ message: "Terjadi kesalahan saat logout" });
  }
};

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ field: "email", message: "Email wajib diisi" });
  }

  try {
    const user = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (user.length === 0) {
      return res
        .status(404)
        .json({ field: "email", message: "Email tidak terdaftar" });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const supportLink = `${process.env.FRONTEND_URL}/kontak`;
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
    await transporter.sendMail({
      from: `"Dukungan Faza Frame" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Kata Sandi Anda - Faza Frame",
      html: `
        <div style="max-width: 500px; margin: auto; font-family: Arial, sans-serif; background-color: #121212; color: white; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="color: white;">Lupa kata sandi Anda?</h2>
          <p style="color: #B0B0B0;">Jangan khawatir, kami siap membantu! Klik tombol di bawah ini untuk mengatur ulang kata sandi Anda.</p>
          
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #198754; color: white; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 10px;">
            Atur Ulang Kata Sandi
          </a>
    
          <p style="color: #B0B0B0; margin-top: 15px;">
            Tautan ini hanya berlaku untuk sekali pakai.<br> Berlaku selama <strong>15 menit</strong>.
          </p>
    
          <p style="color: #B0B0B0;">
            Jika Anda tidak meminta reset kata sandi atau memiliki pertanyaan, silakan 
            <a href="${supportLink}" style="color: #4DA8DA;">hubungi kami</a>.
          </p>
    
          <hr style="border: none; border-top: 1px solid #444; margin: 20px 0;">
          <p style="font-size: 12px; color: gray;">© 2025 Faza Frame. Semua hak dilindungi.</p>
        </div>
      `,
    });

    res
      .status(200)
      .json({ message: "Link reset password telah dikirim ke email" });
  } catch (error) {
    console.error("Error mengirim reset password:", error);
    res.status(500).json({ message: "Gagal mengirim reset password" });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ field: "password", message: "Password minimal 8 karakter" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query("UPDATE users SET password = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    res.status(200).json({ message: "Password berhasil direset" });
  } catch (error) {
    console.error("Error reset password:", error);
    res
      .status(400)
      .json({ message: "Token tidak valid atau sudah kadaluarsa" });
  }
};
module.exports = {
  registerUser,
  loginUser,
  loginWithGoogle,
  getUserData,
  logout,
  requestPasswordReset,
  resetPassword,
  refreshTokenHandler,
};
