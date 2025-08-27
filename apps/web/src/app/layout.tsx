import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "to-do by clarenzmauro",
	description: "A simple to-do list",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
		<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
		  <ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		  >
			<Providers>
			  <div className="grid grid-rows-[auto_1fr] h-svh">
				{children}
			  </div>
			</Providers>
		  </ThemeProvider>
		</body>
	  </html>
  );
}
