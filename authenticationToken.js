const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - Token not provided" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, "your-secret-key");

    // Attach the user_id to the request for later use in route handlers
    req.user = decoded.user_id;

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

module.exports = authenticateToken;
