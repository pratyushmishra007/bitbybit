import Head from 'next/head';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  keywords?: string | string[];
  author?: string;
  noindex?: boolean;
}

export default function SEO({
  title,
  description,
  canonical,
  ogImage = '/og-image.png',
  ogType = 'website',
  keywords = [],
  author = 'BitByBit',
  noindex = false,
}: SEOProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitbybit.dev';
  const fullTitle = `${title} | BitByBit - Learn to Code`;
  const canonicalUrl = canonical || siteUrl;
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;
  
  // Convert keywords to array if string
  const keywordsArray: string[] = typeof keywords === 'string' 
    ? keywords.split(',').map(k => k.trim()) 
    : keywords as string[];

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywordsArray.length > 0 && <meta name="keywords" content={keywordsArray.join(', ')} />}
      <meta name="author" content={author} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="BitByBit" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Additional */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Language" content="en" />
      <meta name="theme-color" content="#007bff" />
    </Head>
  );
}
