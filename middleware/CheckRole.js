const { query } = require("../config/database.js");

exports.checkRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role_id !== requiredRole) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};
