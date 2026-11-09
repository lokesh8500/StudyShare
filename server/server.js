require("dotenv").config();

const adminRoutes = require("./routes/adminRoutes");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const noteRoutes = require("./routes/noteRoutes");
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    message: "StudyShare API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    app.listen(process.env.PORT || 5000, () => {
      console.log("Server running on port 5000");
    });
  } catch (error) {
    console.error("Server error:", error.message);
    process.exit(1);
  }
}

startServer();
