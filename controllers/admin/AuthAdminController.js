const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../../config/database");

const secretKey = process.env.JWT_SECRET;
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  console.log("Request body:", req.body);

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

    if (user.role_id !== 1) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya admin yang bisa login ke halaman ini.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        field: "password",
        message: "Password salah",
      });
    }

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
    res.cookie("admin_refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    return res.status(200).json({
      message: "Login admin berhasil",
      name: user.name,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phonenumber: user.phonenumber,
      role: "admin",
    });
  } catch (err) {
    console.error("Error saat login admin:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
};

const getAdminData = async (req, res) => {
  const adminId = req.user.id;
  try {
    const result = await query(
      "SELECT id,name, firstname, lastname, email, role_id FROM users WHERE id = ?",
      [adminId]
    );

    if (result.length === 0) {
      return res.status(404).json({ msg: "Admin not found" });
    }

    const admin = result[0];

    // Cek apakah dia role admin
    if (admin.role_id !== 1) {
      return res.status(403).json({ msg: "Forbidden: Not an admin" });
    }

    return res.status(200).json({
      msg: "Data admin berhasil diambil",
      data: {
        id: admin.id,
        name: admin.name,
        firstname: admin.firstname,
        lastname: admin.lastname,
        email: admin.email,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ msg: "Error fetching admin data", error: error.message });
  }
};

const refreshAdminTokenHandler = async (req, res) => {
  const token = req.cookies.admin_refreshToken;

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
    res.cookie("admin_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000, // 1 jam
    });

    res.status(200).json({ message: "Access token diperbarui" });
  });
};

module.exports = {
  loginAdmin,
  getAdminData,
  refreshAdminTokenHandler,
};
