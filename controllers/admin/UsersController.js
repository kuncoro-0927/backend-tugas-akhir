const { query } = require("../../config/database");
const bcrypt = require("bcrypt");

const getRoles = async (req, res) => {
  try {
    const roles = await query("SELECT id, name FROM roles");
    return res.json(roles);
  } catch (error) {
    console.error("Error getting roles:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      name,
      firstname,
      lastname,
      email,
      password,
      phone,
      address,
      city,
      province,
      role_id,
      postal_code,
      isverified = 1,
    } = req.body;

    // Validasi wajib
    if (!name || !email || !password || !role_id) {
      return res
        .status(400)
        .json({ message: "Field wajib tidak boleh kosong." });
    }

    // Cek apakah email sudah digunakan
    const existingUser = await query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan user
    const sql = `
      INSERT INTO users (
        name, firstname, lastname, email, password, phone,
        address, city, province, role_id,postal_code, isverified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?)
    `;
    const values = [
      name,
      firstname,
      lastname,
      email,
      hashedPassword,
      phone,
      address,
      city,
      province,
      role_id,
      postal_code,
      isverified,
    ];

    const result = await query(sql, values);

    return res
      .status(201)
      .json({ message: "User berhasil dibuat", user_id: result.insertId });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      message: "Gagal membuat user",
      error: error.message,
    });
  }
};
const getAllUsers = async (req, res) => {
  try {
    const sql = `
    SELECT 
      users.id,
         users.name,
      users.firstname,
      users.lastname,
      users.email,
            users.address,
         users.phone,
          users.province,
            users.isverified,
           users.city,
      roles.name AS role_name,
      users.role_id
    FROM users
    JOIN roles ON users.role_id = roles.id
    ORDER BY users.created_at DESC
  `;

    const users = await query(sql);

    return res.json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      firstname,
      lastname,
      email,
      password,
      phone,
      address,
      city,
      province,
      role_id,
      postal_code,
      isverified,
    } = req.body;

    // Cek apakah user ada
    const existingUser = await query("SELECT * FROM users WHERE id = ?", [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    let updateFields = `
      name = ?, firstname = ?, lastname = ?, email = ?, phone = ?,
      address = ?, city = ?, province = ?, postal_code = ?,  role_id = ?, isverified = ?
    `;
    const values = [
      name,
      firstname,
      lastname,
      email,
      phone,
      address,
      city,
      province,
      postal_code,
      role_id,
      isverified,
    ];

    // Jika ada password baru, hash & update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields += `, password = ?`;
      values.push(hashedPassword);
    }

    values.push(id); // Untuk WHERE clause

    const sql = `
      UPDATE users SET ${updateFields} WHERE id = ?
    `;

    await query(sql, values);

    return res.json({ message: "User berhasil diperbarui" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      message: "Gagal memperbarui user",
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        users.id,
        users.name,
        users.firstname,
        users.lastname,
        users.email,
        users.address,
        users.phone,
        users.postal_code,
        users.province,
        users.password,
        users.isverified,
        users.city,
          users.created_at,
            users.updated_at,
        roles.name AS role_name,
        users.role_id
      FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.id = ?
    `;

    const users = await query(sql, [id]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    return res.json(users[0]);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return res.status(500).json({
      message: "Gagal mengambil user",
      error: error.message,
    });
  }
};
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah user ada
    const existingUser = await query("SELECT * FROM users WHERE id = ?", [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    // Hapus user
    await query("DELETE FROM users WHERE id = ?", [id]);

    return res.json({ message: "User berhasil dihapus." });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      message: "Gagal menghapus user",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  getRoles,
  updateUser,
  getUserById,
  deleteUser,
};
