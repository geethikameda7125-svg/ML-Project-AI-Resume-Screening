import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn("Could not set PDF worker URL", e);
  }
}

/**
 * Mask sensitive PII like emails and phone numbers for privacy protection.
 */
export function sanitizePII(text) {
  if (!text) return '';
  // Mask email addresses: rahul.demo@example.com -> ra***@example.com
  let sanitized = text.replace(/([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, '$1***@$2');
  // Mask phone numbers (10 digits or with separators)
  sanitized = sanitized.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE REDACTED]');
  return sanitized;
}

/**
 * Fallback lightweight text extractor from raw PDF binary buffer if worker fails.
 */
function extractRawTextFromPDFStream(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let text = '';
  const len = bytes.length;
  let inStream = false;
  let chunk = '';
  
  for (let i = 0; i < len; i++) {
    const char = String.fromCharCode(bytes[i]);
    chunk += char;
    if (chunk.length > 20) chunk = chunk.slice(-20);
    
    // Look for text in standard ASCII range
    if ((bytes[i] >= 32 && bytes[i] <= 126) || bytes[i] === 10 || bytes[i] === 13 || bytes[i] === 9) {
      text += char;
    }
  }
  
  // Extract text patterns commonly found in uncompressed PDF objects: (Text) Tj or [(Text)] TJ
  const matches = [];
  const regex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] && match[1].trim().length > 1) {
      matches.push(match[1]);
    }
  }
  
  if (matches.length > 10) {
    return matches.join(' ');
  }
  
  // Clean whitespace
  return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Extracts plain text from an uploaded file (PDF, DOCX, TXT).
 * Works 100% client-side in the browser on any device.
 */
export async function parseDocument(file) {
  if (!file) throw new Error("No file provided.");

  const fileName = file.name.toLowerCase();
  let extractedText = '';

  if (fileName.endsWith('.txt') || fileName.endsWith('.text') || fileName.endsWith('.md') || fileName.endsWith('.json')) {
    extractedText = await file.text();
  } else if (fileName.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value || '';
    } catch (err) {
      console.warn("Mammoth DOCX parsing fallback:", err);
      extractedText = await file.text();
    }
  } else if (fileName.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: true,
      });
      const pdf = await loadingTask.promise;
      const textParts = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items.map((item) => item.str || '');
        textParts.push(pageStrings.join(' '));
      }
      extractedText = textParts.join('\n\n');
    } catch (pdfErr) {
      console.warn("PDF.js worker failed, using stream fallback:", pdfErr);
      extractedText = extractRawTextFromPDFStream(arrayBuffer);
    }
  } else {
    // Attempt plain text read as universal fallback
    extractedText = await file.text();
  }

  // Clean and sanitize
  extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const sanitized = sanitizePII(extractedText);

  if (!sanitized || sanitized.length < 10) {
    throw new Error(`The file '${file.name}' could not be parsed or contains no readable text. Please copy and paste your resume text into the text box.`);
  }

  return {
    raw_text: extractedText,
    sanitized_text: sanitized,
    character_count: sanitized.length,
    file_name: file.name,
    file_type: file.name.split('.').pop().toLowerCase()
  };
}
