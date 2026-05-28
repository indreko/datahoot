import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/admin', '/api/quizzes', '/api/games'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) return NextResponse.next();

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const colonIdx = decoded.indexOf(':');
      const user = decoded.slice(0, colonIdx);
      const pass = decoded.slice(colonIdx + 1);
      if (
        user === process.env.ADMIN_USERNAME &&
        pass === process.env.ADMIN_PASSWORD
      ) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Datahoot Admin"' },
  });
}

export const config = {
  matcher: ['/admin/:path*', '/api/quizzes/:path*', '/api/games/:path*'],
};
