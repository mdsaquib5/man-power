import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { appendRowToSheet } from '@/lib/googleSheets';

// Input length limits (N3 fix)
const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 20;
const MAX_COMPANY_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 1000;

// Phone validation regex — allows international formats (N2 fix)
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { fullName, email, phone, companyName, message } = body as Record<string, unknown>;

    // --- Required field check ---
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: 'Full name, email, and phone are required.' },
        { status: 400 }
      );
    }

    // --- Type guards ---
    if (
      typeof fullName !== 'string' ||
      typeof email !== 'string' ||
      typeof phone !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid field types.' }, { status: 400 });
    }

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedCompany = typeof companyName === 'string' ? companyName.trim() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    // --- Length validation (N3 fix) ---
    if (trimmedName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Full name must be ${MAX_NAME_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    if (trimmedPhone.length > MAX_PHONE_LENGTH) {
      return NextResponse.json(
        { error: `Phone number must be ${MAX_PHONE_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    if (trimmedCompany.length > MAX_COMPANY_LENGTH) {
      return NextResponse.json(
        { error: `Company name must be ${MAX_COMPANY_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    // --- Email format validation ---
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // --- Phone format validation (N2 fix) ---
    if (!PHONE_REGEX.test(trimmedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please include country code if outside India.' },
        { status: 400 }
      );
    }

    // --- Duplicate email check (N1 fix) ---
    const existing = await prisma.lead.findFirst({
      where: { email: trimmedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered. We will be in touch!' },
        { status: 409 }
      );
    }

    // --- Save to MongoDB ---
    const lead = await prisma.lead.create({
      data: {
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        companyName: trimmedCompany || null,
        message: trimmedMessage || null,
      },
    });

    // --- Sync to Google Sheets (C4 fix: decoupled — failure does NOT affect the 201 response) ---
    const sheetsSynced = await appendRowToSheet([
      new Date().toISOString(),
      trimmedName,
      trimmedEmail,
      trimmedPhone,
      trimmedCompany,
      trimmedMessage,
    ]);

    if (!sheetsSynced) {
      console.warn(`[leads] Google Sheets sync failed for lead ${lead.id} — lead is saved in DB.`);
    }

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error('[leads] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
