const userService = require("../services/user.service");

async function update(req, res, next) {
  try {
    const updated = await userService.updateUser(req.user.userId, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  update
};
