const authService = require("../services/auth.service");

async function register(req, res, next) {
  try {
    const { email, firstName, lastName, password } = req.body;
    const result = await authService.registerUser({
      email,
      firstName,
      lastName,
      password
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login
};
