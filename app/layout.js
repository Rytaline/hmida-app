export const metadata = {
  title: "HMIDA 1.1 — Compagnon TELL'R",
  description: "Hmida ne demande pas « que veux-tu publier ? » mais « qu'essayons-nous de comprendre ? »",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="color-scheme" content="light" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
