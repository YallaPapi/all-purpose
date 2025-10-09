import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || 'factory-core-secret';

  validateToken = (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ valid: false, error: 'No token provided' });
      }

      const decoded = jwt.verify(token, this.jwtSecret);
      res.json({ valid: true, user: decoded });
    } catch (error) {
      res.status(401).json({ valid: false, error: 'Invalid token' });
    }
  };

  generateToken(payload: any): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }
}