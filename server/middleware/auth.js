import jwt  from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'replace-with-a-long-random-secret') {
  throw new Error('Set a private JWT_SECRET in server/.env before starting the API.');
}

// ── Sign a token ─────────────────────────────────────────────────────────────
export function signToken(user) {
  return jwt.sign(
    {
      userId:             user._id.toString(),
      role:               user.role,
      departmentCategory: user.departmentCategory || null,
      departmentName:     user.departmentName     || null,
      name:               user.name,
      email:              user.email,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// ── Verify token — attaches req.user, returns 401 if invalid ─────────────────
export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated — no token' });
    }

    const token   = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Confirm user still exists and is active
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    req.user = user;  // full Mongoose doc (minus hash)
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token';
    res.status(401).json({ error: msg });
  }
}

// ── Role guard factory — use after protect() ─────────────────────────────────
// requireRole('admin')              — only admins
// requireRole('admin','department') — admins or dept users
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied — requires role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
}
