import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import type { UploadFile } from '../../../../src/pages/techpack/ai-mode-copilot.page';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

/** The QA-AUTO marker the AI Mode specs type into descriptions and remarks. */
export const QA_AUTO_TEXT = 'QA-AUTO — Techpack regression test data (pw-hybrid-framework).';

/**
 * A copy of `sample-techpack.pdf` that AI Mode hasn't seen: AI Mode skips a
 * document it already has by its bytes, so a line is appended after `%%EOF`
 * (PDF readers ignore it).
 */
export function uniqueTechpackPdf(tag: string): UploadFile {
  const stamp = `${new Date().toISOString()} ${Math.random().toString(36).slice(2)}`;
  return {
    name: `qa-auto-${tag}-${Date.now()}.pdf`,
    mimeType: 'application/pdf',
    buffer: Buffer.concat([
      fs.readFileSync(path.join(FIXTURES, 'sample-techpack.pdf')),
      Buffer.from(`\n%QA-AUTO ${stamp} ${tag}\n`, 'latin1'),
    ]),
  };
}

function fixture(file: string, mimeType: string): UploadFile {
  return {
    name: path.basename(file),
    mimeType,
    buffer: fs.readFileSync(path.join(FIXTURES, 'ai-mode', file)),
  };
}

/** Five simple trouser drawings, 800 × 1000 px PNG, that AI Mode accepts as garment photos. */
export const garmentPhoto = (n: 1 | 2 | 3 | 4 | 5): UploadFile =>
  fixture(`garment-photo-${n}.png`, 'image/png');

/** A 120 × 120 px PNG, below AI Mode's 256 px minimum. */
export const smallPhoto = (): UploadFile => fixture('photo-120px.png', 'image/png');

/** A small spreadsheet with a techpack-like header (Customer, Season, Style #, …). */
export const techpackXlsx = (): UploadFile =>
  fixture(
    'qa-auto-techpack.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );

export const textFile = (): UploadFile => ({
  name: 'qa-auto-notes.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from(`${QA_AUTO_TEXT}\n`),
});

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * A valid RGB PNG of random noise, built in memory and at least `minBytes`
 * big (stored uncompressed). Used for the over-8 MB photo case without
 * committing a 9 MB file.
 */
export function largeNoisePhoto(minBytes: number): UploadFile {
  const width = 2000;
  const height = Math.ceil(minBytes / (width * 3)) + 1;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // filter: none
    for (let i = 1; i <= width * 3; i++) raw[row + i] = Math.floor(Math.random() * 256);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // colour type: RGB
  const buffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 0 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return { name: `qa-auto-large-${buffer.length}.png`, mimeType: 'image/png', buffer };
}
