import { google } from 'googleapis';
import { sheets_v4 } from 'googleapis';

// Module-level singleton — auth and sheets client are created once per server process
// instead of being recreated on every API request (N4 fix)
let sheetsClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Appends a row to the configured Google Sheet.
 * Returns true on success, false on failure (never throws — caller decides how to handle).
 */
export const appendRowToSheet = async (values: string[]): Promise<boolean> => {
  if (
    !process.env.GOOGLE_CLIENT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY ||
    !process.env.GOOGLE_SHEET_ID
  ) {
    console.warn('[googleSheets] Env vars missing. Skipping Google Sheets sync.');
    return false;
  }

  try {
    const sheets = getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    return true;
  } catch (error) {
    console.error('[googleSheets] Failed to sync row to Google Sheets:', error);
    return false;
  }
};
