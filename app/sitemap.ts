import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitbybit.dev';

  // Static pages
  const routes = [
    '',
    '/courses',
    '/dashboard',
    '/contests',
    '/auth/signin',
    '/auth/signup',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // TODO: Add dynamic routes for courses and lessons
  // You can fetch from database and add them here
  // Example:
  // const courses = await fetchAllCourses();
  // const courseRoutes = courses.map(course => ({
  //   url: `${baseUrl}/courses/${course.id}`,
  //   lastModified: course.updated_at,
  //   changeFrequency: 'weekly',
  //   priority: 0.7,
  // }));

  return routes;
}
