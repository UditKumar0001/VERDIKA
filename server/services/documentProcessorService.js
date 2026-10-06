import fs from 'fs';
import path from 'path';
import imageSize from 'image-size';
import { PDFParse } from 'pdf-parse';
import { logger } from '../utils/logger.js';

/**
 * Processes an uploaded file (Multer file object or file path or document object) and extracts REAL metadata.
 * Computes real image dimensions (width, height) using image-size.
 * Computes real PDF page count and text using pdf-parse.
 * Detects corruption / readability.
 */
export async function processUploadedDocument(fileOrDoc, fieldName = 'document') {
  if (!fileOrDoc) return null;

  // Extract file path, original name, mime type, size
  let filePath = fileOrDoc.path || fileOrDoc.filePath || null;
  let originalName = fileOrDoc.originalname || fileOrDoc.name || `${fieldName}.bin`;
  let mimeType = fileOrDoc.mimetype || fileOrDoc.type || '';
  let size = fileOrDoc.size || 0;

  let width = null;
  let height = null;
  let pageCount = null;
  let text = fileOrDoc.text || fileOrDoc.content || '';
  let isCorrupted = false;

  const ext = path.extname(originalName).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png'].includes(ext) || mimeType.startsWith('image/');
  const isPdf = ext === '.pdf' || mimeType === 'application/pdf';

  if (filePath && fs.existsSync(filePath)) {
    try {
      size = fs.statSync(filePath).size;
      const buffer = fs.readFileSync(filePath);

      if (isImage) {
        try {
          const dimensions = imageSize(buffer);
          width = dimensions.width || null;
          height = dimensions.height || null;
          if (!width || !height) {
            isCorrupted = true;
          }
        } catch (err) {
          logger.warn(`[DocumentProcessor] Image size extraction failed for ${originalName}: ${err.message}`);
          isCorrupted = true;
        }
      } else if (isPdf) {
        try {
          const parser = new PDFParse({ data: buffer });
          await parser.load();
          const textRes = await parser.getText();
          const infoRes = await parser.getInfo();
          text = typeof textRes === 'string' ? textRes : (textRes?.text || '');
          pageCount = infoRes?.numpages || parser.doc?.numPages || 1;
        } catch (err) {
          logger.warn(`[DocumentProcessor] PDF parse failed for ${originalName}: ${err.message}`);
          isCorrupted = true;
          pageCount = 0;
        }
      }
    } catch (fsErr) {
      logger.error(`[DocumentProcessor] File read error for ${originalName}: ${fsErr.message}`);
      isCorrupted = true;
    }
  } else if (fileOrDoc.buffer) {
    size = fileOrDoc.buffer.length;
    if (isImage) {
      try {
        const dimensions = imageSize(fileOrDoc.buffer);
        width = dimensions.width || null;
        height = dimensions.height || null;
      } catch (err) {
        isCorrupted = true;
      }
    } else if (isPdf) {
      try {
        const parser = new PDFParse({ data: fileOrDoc.buffer });
        await parser.load();
        const textRes = await parser.getText();
        const infoRes = await parser.getInfo();
        text = typeof textRes === 'string' ? textRes : (textRes?.text || '');
        pageCount = infoRes?.numpages || parser.doc?.numPages || 1;
      } catch (err) {
        isCorrupted = true;
        pageCount = 0;
      }
    }
  } else if (fileOrDoc.size && (fileOrDoc.width !== undefined || fileOrDoc.pageCount !== undefined)) {
    // Already structured document object passed in
    width = fileOrDoc.width;
    height = fileOrDoc.height;
    pageCount = fileOrDoc.pageCount;
    isCorrupted = fileOrDoc.isCorrupted || false;
  }

  return {
    name: originalName,
    path: filePath,
    filePath: filePath,
    size,
    sizeFormatted: `${(size / 1024).toFixed(1)} KB`,
    type: mimeType || (isImage ? 'image/png' : isPdf ? 'application/pdf' : 'application/octet-stream'),
    width,
    height,
    pageCount,
    text,
    rawText: text,
    isCorrupted,
    isReadable: !isCorrupted,
    qualityPassed: !isCorrupted,
    verified: false
  };
}
