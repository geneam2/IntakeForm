import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  ClerkProvider,
  SignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intake Form",
  description: "Intake form",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <Analytics />
          <SpeedInsights />
          <SignedOut>
            <div className="h-screen flex items-center justify-center">
              <SignIn
                routing="hash"
                appearance={{
                  elements: {
                    footer: "hidden",
                    footerActionLink: "hidden",
                  },
                }}
              />
            </div>
          </SignedOut>

          <SignedIn>
            <div className="h-screen relative">
              <div className="absolute top-4 right-10">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-12 w-12",
                    },
                  }}
                />
              </div>
              {children}
            </div>
          </SignedIn>
        </ClerkProvider>
      </body>
    </html>
  );
}
