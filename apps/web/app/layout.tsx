import "./globals.css";
import type { ReactNode } from "react";
import Shell from "./Shell";

export const metadata = { title: "ZAPYE Food", description: "Atendimento com IA no WhatsApp" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
