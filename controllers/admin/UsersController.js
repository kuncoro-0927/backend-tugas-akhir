const { query } = require("../../config/database");
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
module.exports = { getAllUsers };
