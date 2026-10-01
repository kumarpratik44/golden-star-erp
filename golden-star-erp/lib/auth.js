function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Not allowed for this role" });
    }
    next();
  };
}

module.exports = { requireRole };
