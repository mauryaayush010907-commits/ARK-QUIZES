import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export async function authenticateUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(401).json({ message: "Invalid session" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}

export function requireParticipant(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Authentication required" });
  next();
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
