export const metadata = {
  title: "HMIDA — Veille & Riposte · Groupe OCP",
  description: "Hub de Monitoring, d'Intelligence, de Défense & d'Anticipation — au service du groupe OCP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="color-scheme" content="light" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
