import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const secret =
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? undefined;

export const authOptions: NextAuthOptions = {
  secret,
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Correo y contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const emailRaw = credentials?.email;
        const passwordRaw = credentials?.password;
        if (
          typeof emailRaw !== "string" ||
          typeof passwordRaw !== "string" ||
          !emailRaw.trim() ||
          !passwordRaw
        ) {
          return null;
        }
        const email = emailRaw.trim().toLowerCase();

        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            name: users.name,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!row) return null;

        const ok = await compare(passwordRaw, row.passwordHash);
        if (!ok) return null;

        return {
          id: row.id,
          email: row.email,
          name: row.name ?? undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/dashboard",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        if (token.email && typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
};
