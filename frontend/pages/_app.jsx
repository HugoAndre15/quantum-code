import "../styles/globals.css";
import { AuthProvider } from "../context/AuthContext";
import { Analytics } from "@vercel/analytics/next";

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Analytics />
    </AuthProvider>
  );
}

export default MyApp;
