import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "../context/AuthContext";
import RouteGuard from '../components/RouteGuard';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WhatsApp Bot Dashboard",
  description: "Management interface for WhatsApp AI chatbot",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <RouteGuard>
            {children}
          </RouteGuard>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
} 