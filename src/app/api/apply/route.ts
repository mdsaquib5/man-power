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
    const experienceType = (formData.get('experienceType') as string | null)?.trim() ?? '';
    const currentSalary = (formData.get('currentSalary') as string | null)?.trim() ?? '';
    const experience = (formData.get('experience') as string | null)?.trim() ?? '';
    const resumeFile = formData.get('resume') as File | null;

    // --- Required field validation ---
    if (!fullName || !email || !phone || !jobProfile || !experienceType) {
      return NextResponse.json(
        { error: 'Full name, email, phone, job profile, and experience type are required.' },
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

    // --- Resume validation ---
    let resumePath: string | null = null;
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

      // Save file to uploads/resumes/
      const uploadsDir = path.join(process.cwd(), 'uploads', 'resumes');
      await mkdir(uploadsDir, { recursive: true });

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const filename = `resume-${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      const bytes = await resumeFile.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      resumePath = `/uploads/resumes/${filename}`;
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
        experienceType,
        currentSalary: currentSalary ? parseFloat(currentSalary) : null,
        experience: experience ? parseFloat(experience) : null,
        resumePath,
      },
    });

    // --- Sync to Google Sheets (decoupled — failure does not block 201) ---
    const sheetsSynced = await appendRowToSheet([
      new Date().toISOString(),
      fullName,
      email,
      phone,
      jobProfile,
      experienceType,
      currentSalary || '',
      experience || '',
      resumePath || '',
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
