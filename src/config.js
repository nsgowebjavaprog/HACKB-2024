const mongoose = require("mongoose");

const dbURI = "mongodb://localhost:27017/login-tut";

mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("Database connected successfully");
})
.catch((err) => {
  console.error("Database connection error:", err);
});

mongoose.connection.on("connected", () => {
  console.log("Database connected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("Database connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Database connection disconnected");
});

const LoginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("users", LoginSchema);
module.exports = User;