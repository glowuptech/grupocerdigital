import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Grupo C&R Digital | Financeiro",
  description: "Gestão financeira do grupo — ambiente demonstrativo",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
