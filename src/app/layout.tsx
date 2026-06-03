import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Careers | Join Our Team — CareerPortal",
  description:
    "Explore exciting career opportunities and submit your application. We're hiring Frontend, Backend, Full Stack, DevOps, and more.",
  openGraph: {
    title: "Careers | Join Our Team — CareerPortal",
    description:
      "Explore exciting career opportunities and submit your application. We're hiring talented professionals across multiple roles.",
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
