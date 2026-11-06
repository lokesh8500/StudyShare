
const express = require("express");
const router = express.Router();

const {
  register,
  login
} = require("../controllers/authController");

const {
  protect
} = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
