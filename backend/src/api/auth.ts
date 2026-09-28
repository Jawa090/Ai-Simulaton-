import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { signToken, verifyPassword } from "../auth/auth";
import { requireAuth } from "../auth/middleware";
import { asyncHandler, ApiError } from "../middleware/errorHandler";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(401, "Invalid credentials");
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new ApiError(401, "Invalid credentials");

    const token = signToken({ sub: user.id, email: user.email, role: user.role, displayName: user.displayName });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName } });
  })
);

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
