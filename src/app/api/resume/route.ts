import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Missing ID parameter', { status: 400 });
    }

    const application: any = await prisma.application.findUnique({
      where: { id },
    });

    if (!application || !application.resumeBase64) {
      return new Response('Resume not found', { status: 404 });
    }

    const buffer = Buffer.from(application.resumeBase64, 'base64');

    return new Response(buffer, {
      headers: {
        'Content-Type': application.resumeMime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${application.resumeName || 'resume'}"`,
      },
    });
  } catch (error) {
    console.error('[resume] Error retrieving resume:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
