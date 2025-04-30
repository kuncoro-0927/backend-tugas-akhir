const { query } = require("../config/database");

const updateUserProfile = async (req, res) => {
  const { firstname, lastname, address, province, city, postal_code, phone } =
    req.body;
  const userId = req.user.id;

  try {
    await query(
      `UPDATE users 
       SET firstname = ?, lastname = ?, address = ?, province = ?, city = ?, postal_code = ?, phone = ?, updated_at = NOW() 
       WHERE id = ?`,
      [firstname, lastname, address, province, city, postal_code, phone, userId]
    );

    return res.status(200).json({
      msg: "Update profil berhasil",
      data: {
        firstname,
        lastname,
        address,
        province,
        city,
        postal_code,
        phone,
      },
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Update profil gagal",
      error: error.message,
    });
  }
};

const getUserData = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await query(
      "SELECT id, firstname, lastname, email, phone, address, province, city, postal_code, role_id FROM users WHERE id = ?",
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ msg: "User not found" });
    }

    const user = result[0];

    // Cek apakah dia benar role user biasa
    if (user.role_id !== 2) {
      return res.status(403).json({ msg: "Forbidden: Not a regular user" });
    }

    return res.status(200).json({
      msg: "Data pengguna berhasil diambil",
      data: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        address: user.address,
        province: user.province,
        city: user.city,
        postal_code: user.postal_code,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ msg: "Error fetching user data", error: error.message });
  }
};

const getTopUsers = async (req, res) => {
  try {
    const sql = `
      SELECT 
      users.id AS users_id,
        users.name AS user_name,
        users.email AS user_email,
        
        COUNT(transactions.id) AS total_transactions,
        SUM(transactions.gross_amount) AS total_amount
      FROM 
        users
      JOIN 
        orders ON users.id = orders.user_id
      JOIN 
        transactions ON orders.order_id = transactions.order_id
        
      WHERE 
        transactions.transaction_status = 'success' 
      GROUP BY 
        users.id
      ORDER BY 
        total_transactions DESC
      LIMIT 4;
    `;
    const result = await query(sql);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch data" });
  }
};

const getAll = async (req, res) => {
  try {
    const sql = `
      SELECT id, name, email, firstname, lastname, phonenumber, isverified, google_id
      FROM users WHERE role_id = 2;
    `;

    const users = await query(sql);

    return res.json(users);
  } catch (error) {
    console.error("Error getting order details:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const totalUsersQuery = `
      SELECT COUNT(*) AS total_users
      FROM users  WHERE role_id = 2;
    `;

    const totalVerifiedUsersQuery = `
      SELECT COUNT(*) AS total_verified_users
      FROM users
      WHERE isverified = 1  AND role_id = 2;
    `;

    const totalGoogleUsersQuery = `
      SELECT COUNT(*) AS total_google_users
      FROM users
      WHERE google_id IS NOT NULL AND role_id = 2;
    `;

    const [totalUsersResult] = await query(totalUsersQuery);
    const [totalVerifiedUsersResult] = await query(totalVerifiedUsersQuery);
    const [totalGoogleUsersResult] = await query(totalGoogleUsersQuery);

    return res.json({
      totalUsers: totalUsersResult.total_users,
      totalVerifiedUsers: totalVerifiedUsersResult.total_verified_users,
      totalGoogleUsers: totalGoogleUsersResult.total_google_users,
    });
  } catch (error) {
    console.error("Error getting user stats:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  updateUserProfile,
  getUserData,
  getTopUsers,
  getAll,
  getUserStats,
};
