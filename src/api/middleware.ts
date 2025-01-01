import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(error.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
