const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// pdf-parse v1.1.1 default export is a function
const pdfParse = require('pdf-parse');

const db = new PrismaClient();
const uploadDir = path.join(process.cwd(), 'upload');

async function summarizeText(text, maxLength = 12000) {
  const cleaned = text.replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength) + '...[truncated]';
}

async function processPDFs() {
  console.log('Processing uploaded PDFs...');
  
  const files = fs.readdirSync(uploadDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files`);
  
  for (const file of files) {
    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);
    
    const existing = await db.course.findFirst({ where: { filename: file } });
    if (existing) {
      console.log(`  Skipped (already exists): ${file}`);
      continue;
    }
    
    try {
      console.log(`  Processing: ${file}...`);
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const text = data.text;
      const summary = summarizeText(text);
      
      await db.course.create({
        data: {
          title: file.replace(/\.pdf$/i, ''),
          filename: file,
          content: text,
          summary: summary,
          fileSize: stats.size,
          status: 'ready',
        }
      });
      
      console.log(`  Done: ${file} (${text.length} chars extracted)`);
    } catch (error) {
      console.error(`  Error: ${file}:`, error.message);
    }
  }
  
  const totalCourses = await db.course.count();
  console.log(`\nAll done! ${totalCourses} courses in database.`);
}

processPDFs()
  .catch(console.error)
  .finally(() => db.$disconnect());
