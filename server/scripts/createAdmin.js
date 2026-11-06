
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password || password.length < 12) {
      throw new Error(
        "Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters)"
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    const existing = await User.findOne({ email });

    if (existing) {
      throw new Error("This email is already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: "StudyShare Admin",
      email,
      password: hashedPassword,
      role: "admin"
    });

    console.log("Admin account created successfully");
  } catch (error) {
    console.error("Setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
