import express from "express"
import cors from 'cors'
import 'dotenv/config'
import connectDB from "./config/mongodb.js"
import connectCloudinary from "./config/cloudinary.js"
import userRouter from "./routes/userRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import adminRouter from "./routes/adminRoute.js"

// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)

app.get("/", (req, res) => {
  res.send("API Working")
});

// ========== TEMPORARY SEED ROUTE (remove after seeding once) ==========
app.get("/seed-database", async (req, res) => {
  if (req.query.secret !== "prescripto2026") {
    return res.status(403).json({ success: false, message: "Wrong secret key" });
  }

  try {
    const { spawn } = await import("child_process");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const child = spawn("node", ["seed.js"], {
      cwd: __dirname,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.on("data", (d) => (output += d.toString()));
    child.stderr.on("data", (d) => (output += d.toString()));

    child.on("close", (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: "✅ Database seeded successfully! Doctors + demo accounts are ready.",
          log: output.slice(-1800),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Seed failed. Check the log below.",
          log: output.slice(-2500),
        });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// =====================================================================

app.listen(port, () => console.log(`Server started on PORT:${port}`))
