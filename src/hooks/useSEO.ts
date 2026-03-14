import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'profile';
}

const DEFAULT = {
  title: 'Alvus — Encontre Serviços Perto de Você',
  description: 'Conectamos você com os melhores prestadores de serviços da sua cidade. Limpeza, reformas, elétrica e muito mais.',
  image: 'https://iservice-dusky.vercel.app/og-image.png',
  url: 'https://iservice-dusky.vercel.app',
};

function setMeta(selector: string, value: string) {
  let el = document.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const attrMatch = selector.match(/\[([^=]+)="([^"]+)"\]/);
    if (attrMatch) el.setAttribute(attrMatch[1], attrMatch[2]);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export function useSEO({ title, description, image, url, type = 'website' }: SEOProps = {}) {
  useEffect(() => {
    const t = title ? `${title} | Alvus` : DEFAULT.title;
    const d = description || DEFAULT.description;
    const img = image || DEFAULT.image;
    const u = url || window.location.href;

    document.title = t;

    // Standard
    setMeta('meta[name="description"]', d);

    // Open Graph
    setMeta('meta[property="og:title"]', t);
    setMeta('meta[property="og:description"]', d);
    setMeta('meta[property="og:image"]', img);
    setMeta('meta[property="og:url"]', u);
    setMeta('meta[property="og:type"]', type);
    setMeta('meta[property="og:site_name"]', 'Alvus Clube');

    // Twitter Card
    setMeta('meta[name="twitter:card"]', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', t);
    setMeta('meta[name="twitter:description"]', d);
    setMeta('meta[name="twitter:image"]', img);

    // Reset on unmount
    return () => {
      document.title = DEFAULT.title;
      setMeta('meta[name="description"]', DEFAULT.description);
      setMeta('meta[property="og:title"]', DEFAULT.title);
      setMeta('meta[property="og:description"]', DEFAULT.description);
      setMeta('meta[property="og:image"]', DEFAULT.image);
      setMeta('meta[property="og:url"]', DEFAULT.url);
    };
  }, [title, description, image, url, type]);
}
