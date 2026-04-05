import jwt from "jsonwebtoken";
import { env } from "../config/env";

type Payload = {
  sub: string;
  role: string;
  email: string;
};

export function signToken(payload: Payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as Payload;
}
