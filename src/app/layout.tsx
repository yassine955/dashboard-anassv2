import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuickInvoice - Professional Invoicing Made Simple",
  description: "The ultimate invoicing solution for freelancers and small businesses. Create professional invoices, manage clients, track payments, and get paid faster with integrated Stripe and ING Bank payment processing.",
  keywords: ["invoicing", "freelancer", "small business", "payments", "stripe", "ing bank", "invoice management", "client management"],
  authors: [{ name: "QuickInvoice Team" }],
  robots: "index, follow",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "QuickInvoice - Professional Invoicing Made Simple",
    description: "Create professional invoices, manage clients, and get paid faster with integrated payment processing.",
    type: "website",
    locale: "nl_NL",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuickInvoice - Professional Invoicing Made Simple",
    description: "Create professional invoices, manage clients, and get paid faster.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-background antialiased")}>
        <AuthProvider>
          <NotificationProvider>
            {children}
            <Toaster />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}