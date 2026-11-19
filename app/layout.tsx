import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Court Flow | Pickleball Matchmaking",
  description: "Pickleball matchmaking and game queue management prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
