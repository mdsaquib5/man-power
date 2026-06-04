import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { appendRowToSheet } from '@/lib/googleSheets';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

export async function POST(req: Request) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
    }

    // --- Extract fields ---
    const fullName = (formData.get('fullName') as string | null)?.trim() ?? '';
    const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
    const phone = (formData.get('phone') as string | null)?.trim() ?? '';
    const jobProfile = (formData.get('jobProfile') as string | null)?.trim() ?? '';
    const currentSalary = (formData.get('currentSalary') as string | null)?.trim() ?? '';
    const indianExperience = (formData.get('indianExperience') as string | null)?.trim() ?? '';
    const gulfExperience = (formData.get('gulfExperience') as string | null)?.trim() ?? '';
    const resumeFile = formData.get('resume') as File | null;

    // --- Required field validation ---
    if (!fullName || !email || !phone || !jobProfile) {
      return NextResponse.json(
        { error: 'Full name, email, phone, and job profile are required.' },
        { status: 400 }
      );
    }

    // --- Email validation ---
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // --- Phone validation ---
    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format.' },
        { status: 400 }
      );
    }

    // --- Resume validation & Base64 Conversion ---
    let resumeName: string | null = null;
    let resumeMime: string | null = null;
    let resumeBase64: string | null = null;
    if (resumeFile && resumeFile.size > 0) {
      if (resumeFile.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Resume file must be 5MB or smaller.' }, { status: 400 });
      }

      const ext = path.extname(resumeFile.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(resumeFile.type)) {
        return NextResponse.json(
          { error: 'Only PDF, DOC, and DOCX files are allowed.' },
          { status: 400 }
        );
      }

      const bytes = await resumeFile.arrayBuffer();
      resumeBase64 = Buffer.from(bytes).toString('base64');
      resumeName = resumeFile.name;
      resumeMime = resumeFile.type;
    }

    // --- Duplicate email check ---
    const existingApplication = await prisma.application.findFirst({
      where: { email },
    }).catch(() => null);

    if (existingApplication) {
      return NextResponse.json(
        { error: 'An application with this email already exists.' },
        { status: 409 }
      );
    }

    // --- Save to DB ---
    const application = await prisma.application.create({
      data: {
        fullName,
        email,
        phone,
        jobProfile,
        currentSalary: currentSalary ? parseFloat(currentSalary) : null,
        indianExperience: indianExperience ? parseFloat(indianExperience) : null,
        gulfExperience: gulfExperience ? parseFloat(gulfExperience) : null,
        resumeName,
        resumeMime,
        resumeBase64,
      } as any,
    });

    // Format date as YYYY-MM-DD
    const formattedDate = new Date().toISOString().split('T')[0];

    // Prepend site URL to form public resume download link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const resumePublicUrl = resumeBase64 ? `${siteUrl}/api/resume?id=${application.id}` : '';

    // --- Sync to Google Sheets (decoupled — failure does not block 201) ---
    const sheetsSynced = await appendRowToSheet([
      formattedDate,
      fullName,
      email,
      phone,
      jobProfile,
      indianExperience || '',
      gulfExperience || '',
      currentSalary || '',
      resumePublicUrl,
    ]).catch(() => false);

    if (!sheetsSynced) {
      console.warn(`[apply] Google Sheets sync failed for application ${application.id}`);
    }

    return NextResponse.json({ success: true, application }, { status: 201 });
  } catch (error) {
    console.error('[apply] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
