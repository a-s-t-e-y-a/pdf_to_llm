import pdfParse from 'pdf-parse';
import fs from 'fs';

function splitAllTextFromPdf(PATH) {
  if (!PATH || typeof PATH !== 'string') {
    throw new Error('Invalid file path provided');
  }

  if (!fs.existsSync(PATH)) {
    throw new Error(`File not found: ${PATH}`);
  }

  try {
    const buffer = fs.readFileSync(PATH);
    if (!buffer || buffer.length === 0) {
      throw new Error('PDF file is empty');
    }
    return pdfParse(buffer);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Cannot read file: ${PATH}`);
    }
    throw error;
  }
}

export default splitAllTextFromPdf;