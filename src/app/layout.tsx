import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coming Soon | Be First to Know",
  description:
    "Something extraordinary is being built. Join our exclusive early-access list and be the first to know when we launch.",
  openGraph: {
    title: "Coming Soon | Be First to Know",
    description:
      "Something extraordinary is being built. Join our exclusive early-access list and be the first to know when we launch.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
