import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Menu from "./Menu";
import { auth, isAdminEmail, signOut } from "@/auth";
import { listOwnersSharingWith } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Painel NFC-e",
  description: "Dashboard de cupons fiscais (NFC-e) com upload de PDF.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const sharedWithMe = session?.user?.email
    ? await listOwnersSharingWith(session.user.email)
    : [];
  const isAdmin = isAdminEmail(session?.user?.email);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        suppressHydrationWarning
        style={{ margin: 0, background: "#0d0f0e" }}
      >
        {session?.user && (
          <Menu
            userEmail={session.user.email ?? null}
            logoutAction={logout}
            sharedWithMe={sharedWithMe}
            isAdmin={isAdmin}
          />
        )}
        {children}
      </body>
    </html>
  );
}
