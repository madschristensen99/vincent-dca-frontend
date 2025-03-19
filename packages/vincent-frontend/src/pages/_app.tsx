import type { AppProps } from 'next/app';
import '../styles/globals.css';
import '../styles/dca.css';
import '../styles/dashboard.css';
import '../styles/approve.css';
import '../styles/tools.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}