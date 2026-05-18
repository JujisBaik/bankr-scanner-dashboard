export const metadata = {
  title: 'Bankr Scanner - AI Token Analysis',
  description: 'Real-time AI-powered token analysis powered by MiMo v2 Pro',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#020617',
          color: '#e2e8f0',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
