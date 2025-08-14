const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

// Static frontend
app.use('/', express.static(path.join(__dirname, '..', 'public')));

// Demo default government credentials
const GOV_DEFAULT = {
  username: 'gov_official@docusuite.gov',
  password: 'Gov@1234',
};

// File-based persistent database for users and registrations
const dbPath = path.join(__dirname, '..', 'data');
const usersFile = path.join(dbPath, 'users.json');
const registrationsFile = path.join(dbPath, 'registrations.json');
const companiesFile = path.join(dbPath, 'companies.json');
const generatedNumbersFile = path.join(dbPath, 'generatedNumbers.json');
const consultsFile = path.join(dbPath, 'consults.json');
const govDocsFile = path.join(dbPath, 'government_documents.json');

// Ensure data directory exists
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

// Load data from files or create default structure
function loadData() {
  const db = {
    users: [],
    registrations: [],
    companies: new Set(),
    generatedNumbers: new Set(),
    consults: [],
    govDocuments: [],
  };

  // Load users
  try {
    if (fs.existsSync(usersFile)) {
      const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      db.users = usersData;
    } else {
      // Create default admin user
      db.users = [{ username: 'admin', email: 'admin@docusuite.com', password: 'admin123' }];
      saveUsers(db.users);
    }
  } catch (err) {
    console.error('Error loading users:', err);
    db.users = [{ username: 'admin', email: 'admin@docusuite.com', password: 'admin123' }];
  }

  // Load registrations
  try {
    if (fs.existsSync(registrationsFile)) {
      const registrationsData = JSON.parse(
        fs.readFileSync(registrationsFile, 'utf8')
      );
      db.registrations = registrationsData;
    }
  } catch (err) {
    console.error('Error loading registrations:', err);
    db.registrations = [];
  }

  // Load companies
  try {
    if (fs.existsSync(companiesFile)) {
      const companiesData = JSON.parse(fs.readFileSync(companiesFile, 'utf8'));
      db.companies = new Set(companiesData);
    }
  } catch (err) {
    console.error('Error loading companies:', err);
    db.companies = new Set();
  }

  // Load generated numbers
  try {
    if (fs.existsSync(generatedNumbersFile)) {
      const numbersData = JSON.parse(
        fs.readFileSync(generatedNumbersFile, 'utf8')
      );
      db.generatedNumbers = new Set(numbersData);
    }
  } catch (err) {
    console.error('Error loading generated numbers:', err);
    db.generatedNumbers = new Set();
  }

  // Load consults
  try {
    if (fs.existsSync(consultsFile)) {
      const consultsData = JSON.parse(fs.readFileSync(consultsFile, 'utf8'));
      db.consults = consultsData;
    }
  } catch (err) {
    console.error('Error loading consults:', err);
    db.consults = [];
  }

  // Load government documents
  try {
    if (fs.existsSync(govDocsFile)) {
      const govData = JSON.parse(fs.readFileSync(govDocsFile, 'utf8'));
      db.govDocuments = govData;
    }
  } catch (err) {
    console.error('Error loading government documents:', err);
    db.govDocuments = [];
  }

  return db;
}

// Save functions
function saveUsers(users) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error saving users:', err);
  }
}

function saveRegistrations(registrations) {
  try {
    console.log(
      'Saving registrations to file:',
      registrations.length,
      'registrations'
    );
    fs.writeFileSync(registrationsFile, JSON.stringify(registrations, null, 2));
    console.log('Registrations saved successfully to:', registrationsFile);
  } catch (err) {
    console.error('Error saving registrations:', err);
  }
}

function saveCompanies(companies) {
  try {
    fs.writeFileSync(companiesFile, JSON.stringify([...companies], null, 2));
  } catch (err) {
    console.error('Error saving companies:', err);
  }
}

function saveGeneratedNumbers(numbers) {
  try {
    fs.writeFileSync(
      generatedNumbersFile,
      JSON.stringify([...numbers], null, 2)
    );
  } catch (err) {
    console.error('Error saving generated numbers:', err);
  }
}

function saveConsults(consults) {
  try {
    fs.writeFileSync(consultsFile, JSON.stringify(consults, null, 2));
  } catch (err) {
    console.error('Error saving consults:', err);
  }
}

function saveGovDocuments(govDocuments) {
  try {
    fs.writeFileSync(govDocsFile, JSON.stringify(govDocuments, null, 2));
  } catch (err) {
    console.error('Error saving government documents:', err);
  }
}

function enqueueGovDocument(userEmail, type, payload) {
  try {
    if (!userEmail || !type) return;
    const entry = {
      id: uuidv4(),
      userEmail: String(userEmail).trim().toLowerCase(),
      documentType: String(type),
      payload: payload || {},
      status: 'pending',
      submittedAt: new Date().toISOString(),
      files: payload && payload.files ? payload.files : {},
    };
    db.govDocuments.push(entry);
    saveGovDocuments(db.govDocuments);
  } catch (err) {
    console.error('enqueueGovDocument error:', err);
  }
}

// Initialize database
const db = loadData();
console.log(
  `Database loaded: ${db.users.length} users, ${db.registrations.length} registrations, ${db.companies.size} companies, ${db.generatedNumbers.size} generated numbers, ${db.consults.length} consults, ${db.govDocuments.length} gov docs`
);

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage });
const uploadPdf = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const isPdfMime =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/x-pdf' ||
      file.mimetype === 'application/octet-stream';
    const isPdfExt = ext === '.pdf';
    if (!(isPdfMime && isPdfExt)) {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

function generatePdf(filePath, lines) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.fontSize(18).text('Generated Document', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    lines.forEach((line) => doc.text(line).moveDown(0.3));
    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for Name Approval format with emblem and header
function generateNameApprovalPdf(
  filePath,
  { companyType, fullCompanyName, businessOwnerName, validFrom, validTo }
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Emblem centered if available
    try {
      const emblemPath = path.join(
        __dirname,
        '..',
        'public',
        'images',
        'emblem.png'
      );
      if (fs.existsSync(emblemPath)) {
        const emblemWidth = 90;
        const pageWidth = doc.page.width;
        const x = (pageWidth - emblemWidth) / 2;
        doc.image(emblemPath, x, 40, { width: emblemWidth });
        doc.moveDown(4);
      } else {
        doc.moveDown(1);
      }
    } catch (_) {
      doc.moveDown(1);
    }

    // Header
    doc
      .fontSize(14)
      .font('Times-Bold')
      .text('GOVERNMENT OF INDIA', { align: 'center' });
    doc
      .fontSize(14)
      .font('Times-Bold')
      .text('MINISTRY OF CORPORATE AFFAIRS', { align: 'center' });
    doc
      .fontSize(12)
      .font('Times-Roman')
      .text('Central Registration Centre', { align: 'center' });

    doc.moveDown(2);
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Name Approval', { align: 'center' });
    doc.moveDown(1.2);

    // Body
    doc.font('Helvetica').fontSize(12);
    const body = [
      `Company Type: ${companyType}`,
      `Approved Company Name: ${fullCompanyName}`,
      `Business Owner: ${businessOwnerName}`,
      `Valid From: ${formatDate(validFrom)}`,
      `Valid To: ${formatDate(validTo)}`,
    ];
    body.forEach((line) => doc.text(line).moveDown(0.4));

    doc.moveDown(3);
    const signY = doc.y;
    doc.text('— — — — — — — — — — — — — — — — — — — —', { align: 'right' });
    doc.text('Registrar of Companies', { align: 'right' });
    doc.text('Central Registration Centre', { align: 'right' });

    // Decorative border (light)
    try {
      const { width, height } = doc.page;
      doc.save();
      doc
        .rect(30, 30, width - 60, height - 60)
        .strokeColor('#AAAAAA')
        .lineWidth(0.5)
        .stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

function formatSignedTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const offsetMin = date.getTimezoneOffset(); // minutes behind UTC (>0 for west)
  const sign = offsetMin > 0 ? '-' : '+';
  const absMin = Math.abs(offsetMin);
  const offH = pad(Math.floor(absMin / 60));
  const offM = pad(absMin % 60);
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}:${ss} ${sign}${offH}'${offM}'`;
}

// Specialized generator for DSC: compact digital-signature stamp block
function generateDscStampPdf(filePath, { businessOwnerName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Place a signature box similar to typical DSC stamp
    const boxWidth = 300;
    const boxHeight = 120;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const x = (pageWidth - boxWidth) / 2;
    const y = (pageHeight - boxHeight) / 2;
    doc
      .roundedRect(x, y, boxWidth, boxHeight, 6)
      .lineWidth(1)
      .stroke('#dddddd');

    const innerX = x + 12;
    const innerY = y + 12;
    doc.fillColor('#000000');
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('Digitally signed', innerX, innerY, { continued: false });
    doc.moveDown(0.2);
    doc
      .font('Helvetica')
      .fontSize(18)
      .text(`by ${businessOwnerName}`, { align: 'left' });
    doc.moveDown(0.6);
    doc
      .font('Helvetica')
      .fontSize(16)
      .text(`Date: ${formatSignedTimestamp(new Date())}`);

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for DIN with emblem centered and ministry header
function generateDinCertificatePdf(filePath, { din, businessOwnerName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Emblem centered if available
    try {
      const candidateNames = [
        'emblem.png',
        'finance_emblem.png',
        'mof_emblem.png',
        'emblem_finance.png',
      ];
      let used = null;
      for (const name of candidateNames) {
        const p = path.join(__dirname, '..', 'public', 'images', name);
        if (fs.existsSync(p)) {
          used = p;
          break;
        }
      }
      if (used) {
        const emblemWidth = 90;
        const pageWidth = doc.page.width;
        const x = (pageWidth - emblemWidth) / 2;
        doc.image(used, x, 50, { width: emblemWidth });
        doc.moveDown(4);
      } else {
        doc.moveDown(1);
      }
    } catch (_) {
      doc.moveDown(1);
    }

    // Header
    doc.moveDown(3);
    doc
      .fontSize(16)
      .font('Times-Bold')
      .text('Ministry of Finance', { align: 'center' });
    doc.moveDown(1);
    doc
      .fontSize(12)
      .font('Times-Roman')
      .text('Government of India', { align: 'center' });

    doc.moveDown(2);
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Director Identification Number (DIN)', { align: 'center' });
    doc.moveDown(1.2);

    doc.font('Helvetica').fontSize(12);
    const centerOpts = { align: 'center' };
    doc.text(`DIN: ${din}`, centerOpts).moveDown(0.4);
    doc.text(`Business Owner: ${businessOwnerName}`, centerOpts).moveDown(0.4);
    doc.text(`Issued On: ${formatDate(new Date())}`, centerOpts).moveDown(0.4);

    // Decorative border
    try {
      const { width, height } = doc.page;
      doc.save();
      doc
        .rect(30, 30, width - 60, height - 60)
        .strokeColor('#AAAAAA')
        .lineWidth(0.5)
        .stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for Certificate of Incorporation with emblem and official format
function generateIncorporationCertificatePdf(
  filePath,
  {
    businessOwnerName,
    companyName = 'OMEGAVISA CONSULTANTS (OPC) PRIVATE LIMITED',
  }
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Emblem centered at top
    try {
      const candidateNames = [
        'emblem.png',
        'finance_emblem.png',
        'mof_emblem.png',
        'emblem_finance.png',
      ];
      let used = null;
      for (const name of candidateNames) {
        const p = path.join(__dirname, '..', 'public', 'images', name);
        if (fs.existsSync(p)) {
          used = p;
          break;
        }
      }
      if (used) {
        const emblemWidth = 90;
        const pageWidth = doc.page.width;
        const x = (pageWidth - emblemWidth) / 2;
        doc.image(used, x, 50, { width: emblemWidth });
        doc.moveDown(4);
      } else {
        doc.moveDown(1);
      }
    } catch (_) {
      doc.moveDown(1);
    }

    // Header
    doc.moveDown(3);
    doc
      .fontSize(16)
      .font('Times-Bold')
      .text('Ministry of Finance', { align: 'center' });
    doc.moveDown(1);
    doc
      .fontSize(12)
      .font('Times-Roman')
      .text('Government of India', { align: 'center' });

    doc.moveDown(2);
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('Certificate of Incorporation', { align: 'center' });
    doc.moveDown(1.5);

    // Legal reference
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        '[Pursuant to sub-section (2) of section 7 of the Companies Act, 2013 (18 of 2013) and rule 18 of the Companies (Incorporation) Rules, 2014]',
        { align: 'center' }
      );
    doc.moveDown(1.5);

    // Main certification text
    doc.font('Helvetica').fontSize(12);
    doc.text(
      `I hereby certify that ${companyName} is incorporated on this Thirty first day of December Two thousand eighteen under the Companies Act, 2013 (18 of 2013) and that the company is limited by shares.`
    );
    doc.moveDown(1);

    // Company identification numbers
    doc.text(
      'The Corporate Identity Number of the company is U74999UR2018OPC009348.'
    );
    doc.moveDown(0.5);
    doc.text('The Permanent Account Number (PAN) of the company is AACCO8465A');
    doc.moveDown(0.5);
    doc.text(
      'The Tax Deduction and Collection Account Number (TAN) of the company is MRT001320E'
    );
    doc.moveDown(1);

    // Date and location
    doc.text(
      'Given under my hand at Manesar this Eighth day of January Two thousand nineteen.'
    );
    doc.moveDown(2);

    // Digital signature section (right-aligned)
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Digital Signature Certificate', { align: 'right' });
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(12)
      .text(`Business Owner name: ${businessOwnerName}`, { align: 'right' });

    // Decorative border
    try {
      const { width, height } = doc.page;
      doc.save();
      doc
        .rect(30, 30, width - 60, height - 60)
        .strokeColor('#AAAAAA')
        .lineWidth(0.5)
        .stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for Income Tax Certificate with emblem
function generateIncomeTaxCertificatePdf(
  filePath,
  { registrationNumber, companyName, issueDate }
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Emblem centered at top
    try {
      const candidateNames = [
        'emblem.png',
        'finance_emblem.png',
        'mof_emblem.png',
        'emblem_finance.png',
      ];
      let used = null;
      for (const name of candidateNames) {
        const p = path.join(__dirname, '..', 'public', 'images', name);
        if (fs.existsSync(p)) {
          used = p;
          break;
        }
      }
      if (used) {
        const emblemWidth = 90;
        const pageWidth = doc.page.width;
        const x = (pageWidth - emblemWidth) / 2;
        doc.image(used, x, 50, { width: emblemWidth });
        doc.moveDown(4);
      } else {
        doc.moveDown(1);
      }
    } catch (_) {
      doc.moveDown(1);
    }

    // Header
    doc.moveDown(3);
    doc
      .fontSize(16)
      .font('Times-Bold')
      .text('Ministry of Finance', { align: 'center' });
    doc.moveDown(1);
    doc
      .fontSize(12)
      .font('Times-Roman')
      .text('Government of India', { align: 'center' });

    doc.moveDown(2);
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('Income Tax Registration Certificate', { align: 'center' });
    doc.moveDown(1.5);

    // Main certification text
    doc.font('Helvetica').fontSize(12);
    doc.text(
      `This is to certify that Income Tax Registration Number ${registrationNumber} is issued to ${companyName} on ${formatDate(
        issueDate
      )}.`
    );
    doc.moveDown(1);

    // Additional details
    doc.text(
      'The company is hereby registered for Income Tax purposes under the Income Tax Act, 1961.'
    );
    doc.moveDown(1);
    doc.text(
      'This certificate is valid from the date of issue and remains valid until cancelled or surrendered.'
    );
    doc.moveDown(2);

    // Issue details
    doc.text(`Issue Date: ${formatDate(issueDate)}`);
    doc.moveDown(0.5);
    doc.text(`Registration Number: ${registrationNumber}`);
    doc.moveDown(2);

    // Digital signature section (right-aligned)
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Digital Signature Certificate', { align: 'right' });
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(12)
      .text('Income Tax Department', { align: 'right' });

    // Decorative border
    try {
      const { width, height } = doc.page;
      doc.save();
      doc
        .rect(30, 30, width - 60, height - 60)
        .strokeColor('#AAAAAA')
        .lineWidth(0.5)
        .stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for GST Certificate with emblem
function generateGstCertificatePdf(
  filePath,
  { registrationNumber, companyName, issueDate }
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Emblem centered at top
    try {
      const candidateNames = [
        'emblem.png',
        'finance_emblem.png',
        'mof_emblem.png',
        'emblem_finance.png',
      ];
      let used = null;
      for (const name of candidateNames) {
        const p = path.join(__dirname, '..', 'public', 'images', name);
        if (fs.existsSync(p)) {
          used = p;
          break;
        }
      }
      if (used) {
        const emblemWidth = 90;
        const pageWidth = doc.page.width;
        const x = (pageWidth - emblemWidth) / 2;
        doc.image(used, x, 50, { width: emblemWidth });
        doc.moveDown(4);
      } else {
        doc.moveDown(1);
      }
    } catch (_) {
      doc.moveDown(1);
    }

    // Header
    doc.moveDown(3);
    doc
      .fontSize(16)
      .font('Times-Bold')
      .text('Ministry of Finance', { align: 'center' });
    doc.moveDown(1);
    doc
      .fontSize(12)
      .font('Times-Roman')
      .text('Government of India', { align: 'center' });

    doc.moveDown(2);
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('GST Registration Certificate', { align: 'center' });
    doc.moveDown(1.5);

    // Main certification text
    doc.font('Helvetica').fontSize(12);
    doc.text(
      `This is to certify that GST Registration Number ${registrationNumber} is issued to ${companyName} on ${formatDate(
        issueDate
      )}.`
    );
    doc.moveDown(1);

    // Additional details
    doc.text(
      'The company is hereby registered for Goods and Services Tax purposes under the CGST Act, 2017.'
    );
    doc.moveDown(1);
    doc.text(
      'This certificate is valid from the date of issue and remains valid until cancelled or surrendered.'
    );
    doc.moveDown(2);

    // Issue details
    doc.text(`Issue Date: ${formatDate(issueDate)}`);
    doc.moveDown(0.5);
    doc.text(`GST Registration Number: ${registrationNumber}`);
    doc.moveDown(2);

    // Digital signature section (right-aligned)
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Digital Signature Certificate', { align: 'right' });
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(12)
      .text('GST Department', { align: 'right' });

    // Decorative border
    try {
      const { width, height } = doc.page;
      doc.save();
      doc
        .rect(30, 30, width - 60, height - 60)
        .strokeColor('#AAAAAA')
        .lineWidth(0.5)
        .stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for FSSAI Certificate with official format
function generateFssaiCertificatePdf(
  filePath,
  {
    licenseId,
    businessName,
    ownerName,
    businessAddress,
    businessType,
    issueDate,
    validityDate,
  }
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Top section with emblem and FSSAI logo
    const pageWidth = doc.page.width;

    // Left side - Government emblem
    try {
      const emblemPath = path.join(
        __dirname,
        '..',
        'public',
        'images',
        'emblem.png'
      );
      if (fs.existsSync(emblemPath)) {
        doc.image(emblemPath, 40, 40, { width: 60 });
        doc.fontSize(8).text('GOVERNMENT OF INDIA', 40, 125);
      }
    } catch (_) {}

    // Center - Main header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Registration Certificate', (pageWidth - 200) / 2, 50);
    doc
      .fontSize(10)
      .text('Refer Regulation 2.1.1(5)', (pageWidth - 200) / 2, 75);
    doc.fontSize(12).text('Government of India', (pageWidth - 200) / 2, 95);
    doc
      .fontSize(12)
      .text(
        'Department of Health & Family Welfare',
        (pageWidth - 200) / 2,
        110
      );
    doc
      .fontSize(12)
      .text(
        'Food Safety and Standards Authority of India',
        (pageWidth - 200) / 2,
        125
      );
    doc
      .fontSize(12)
      .text('Registration under FSS Act, 2006', (pageWidth - 200) / 2, 140);

    // Right side - FSSAI logo placeholder
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FSSAI', pageWidth - 120, 50);
    doc.fontSize(10).text('India', pageWidth - 120, 70);

    // Registration number
    doc.moveDown(3);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`Registration No. ${licenseId}`, { align: 'center' });
    doc.moveDown(1);

    // Main information section
    doc.fontSize(11).font('Helvetica');

    // 1. Name and address of FBO
    doc.text(
      '1. Name and permanent address of Food Business Operator (FBO):',
      40,
      200
    );
    doc.font('Helvetica-Bold').text(businessName, 40, 215);
    doc.font('Helvetica').text(businessAddress, 40, 230);
    doc.moveDown(0.5);

    // 2. Business premises address
    doc.text(
      '2. Address of location where food business is to be conducted / premises:',
      40,
      250
    );
    doc.text(businessAddress, 40, 265);
    doc.moveDown(0.5);

    // 3. Kind of Business
    doc.text('3. Kind of Business:', 40, 285);
    doc.text(businessType, 40, 300);
    doc.moveDown(0.5);

    // 4. Photo Identity Card
    doc.text('4. Photo Identity Card:', 40, 320);
    doc.text('Aadhaar Card', 40, 335);

    // Disclaimer
    doc.moveDown(1);
    doc
      .fontSize(10)
      .text(
        'This Registration Certificate is issued under and is subject to the provisions of FSS Act, 2006 all of which must be complied with by the petty food business.',
        { align: 'center' }
      );

    // Date and validity section
    doc.moveDown(1);
    const dateY = doc.y;
    doc.text(
      `Place: ${businessAddress.split(',').pop()?.trim() || 'India'}`,
      40,
      dateY
    );
    doc.text(`Date: ${formatDate(issueDate)}`, 40, dateY + 15);
    doc.text(`Period of Validity: ${formatDate(validityDate)}`, 40, dateY + 30);

    doc.text(
      'Stamp and signature of Registering Authority',
      pageWidth - 200,
      dateY + 30
    );

    // Validation and renewal table
    doc.moveDown(2);
    const tableY = doc.y;

    // Table with proper borders
    const colWidths = [120, 120, 80, 120, 100];
    const startX = 40;
    const rowHeight = 25;

    // Draw table borders
    doc.save();
    doc.strokeColor('#000000').lineWidth(0.5);

    // Horizontal lines
    doc
      .moveTo(startX, tableY)
      .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), tableY)
      .stroke();
    doc
      .moveTo(startX, tableY + rowHeight)
      .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), tableY + rowHeight)
      .stroke();
    doc
      .moveTo(startX, tableY + rowHeight * 2)
      .lineTo(
        startX + colWidths.reduce((a, b) => a + b, 0),
        tableY + rowHeight * 2
      )
      .stroke();

    // Vertical lines
    let currentX = startX;
    doc
      .moveTo(currentX, tableY)
      .lineTo(currentX, tableY + rowHeight * 2)
      .stroke();

    colWidths.forEach((width) => {
      currentX += width;
      doc
        .moveTo(currentX, tableY)
        .lineTo(currentX, tableY + rowHeight * 2)
        .stroke();
    });

    doc.restore();

    // Table headers
    doc.fontSize(9).font('Helvetica-Bold');
    let headerX = startX + 5;
    doc.text('Registration Certificate/Renewal Date', headerX, tableY + 8);
    headerX += colWidths[0] + 5;
    doc.text('Period of Validity/Renewal', headerX, tableY + 8);
    headerX += colWidths[1] + 5;
    doc.text('Registration Fee Paid', headerX, tableY + 8);
    headerX += colWidths[2] + 5;
    doc.text('Items of food Manufactured/Handled', headerX, tableY + 8);
    headerX += colWidths[3] + 5;
    doc.text('Signature of Registering Authority', headerX, tableY + 8);

    // Table data
    doc.font('Helvetica').fontSize(9);
    let dataX = startX + 5;
    doc.text(formatDate(issueDate), dataX, tableY + rowHeight + 8);
    dataX += colWidths[0] + 5;
    doc.text('1 Year(s)', dataX, tableY + rowHeight + 8);
    dataX += colWidths[1] + 5;
    doc.text('100 INR', dataX, tableY + rowHeight + 8);
    dataX += colWidths[2] + 5;
    doc.text(
      'Please refer to annexure for details.',
      dataX,
      tableY + rowHeight + 8
    );
    dataX += colWidths[3] + 5;
    doc.text('', dataX, tableY + rowHeight + 8);

    // Bottom disclaimer
    doc.moveDown(2);
    doc
      .fontSize(9)
      .text(
        'Disclaimer: 1 - This Registration Certificate is only to commence or carry on the food businesses and not for any other purpose.',
        { align: 'center' }
      );

    // Decorative border
    try {
      const { width, height } = doc.page;
      doc.save();
      doc
        .rect(20, 20, width - 40, height - 40)
        .strokeColor('#AAAAAA')
        .lineWidth(0.5)
        .stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for Import-Export Code (IEC) Certificate with official format
function generateImportExportCertificatePdf(
  filePath,
  { licenseId, businessName, ownerName, businessAddress, issueDate }
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;

    // Top section with emblem centered
    try {
      const emblemPath = path.join(
        __dirname,
        '..',
        'public',
        'images',
        'emblem.png'
      );
      if (fs.existsSync(emblemPath)) {
        const emblemWidth = 80;
        const x = (pageWidth - emblemWidth) / 2;
        doc.image(emblemPath, x, 40, { width: emblemWidth });
        doc.moveDown(3);
      } else {
        doc.moveDown(1);
      }
    } catch (_) {
      doc.moveDown(1);
    }

    // Government details below emblem
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Government of India ', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .text('Ministry of Commerce and Industry ', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .text('Directorate General of Foreign Trade', { align: 'center' });
    doc.moveDown(1);

    // Office address
    doc
      .fontSize(10)
      .text(
        'Office of the Additional Director General of Foreign Trade, Mumbai',
        { align: 'center' }
      );
    doc
      .fontSize(9)
      .text(
        'CGO Office, New Building, SE wing, New Marine Lines, Churchgate, MUMBAI, MAHARASHTRA, 400020',
        { align: 'center' }
      );
    doc.moveDown(2);

    // Importer-Exporter Code section
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Importer-Exporter Code', { align: 'center' });
    doc.moveDown(1);
    doc
      .fontSize(11)
      .text(
        `This is to certify that ${businessName} is issued an Importer-Exporter Code (IEC) ${licenseId} with details as follows -`,
        { align: 'center' }
      );
    doc.moveDown(1.5);

    // Details table
    const tableY = doc.y;
    const colWidths = [200, 300];
    const startX = 40;
    const rowHeight = 25;

    // Draw table borders
    doc.save();
    doc.strokeColor('#000000').lineWidth(0.5);

    // Table structure - 9 rows
    for (let i = 0; i <= 9; i++) {
      const y = tableY + i * rowHeight;
      doc
        .moveTo(startX, y)
        .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y)
        .stroke();
    }

    // Vertical lines
    doc
      .moveTo(startX, tableY)
      .lineTo(startX, tableY + 9 * rowHeight)
      .stroke();
    doc
      .moveTo(startX + colWidths[0], tableY)
      .lineTo(startX + colWidths[0], tableY + 9 * rowHeight)
      .stroke();
    doc
      .moveTo(startX + colWidths.reduce((a, b) => a + b, 0), tableY)
      .lineTo(
        startX + colWidths.reduce((a, b) => a + b, 0),
        tableY + 9 * rowHeight
      )
      .stroke();

    doc.restore();

    // Table content
    doc.fontSize(9).font('Helvetica');

    const tableData = [
      { field: 'IEC', detail: licenseId },
      { field: 'PAN', detail: 'AACCO8465A' },
      { field: 'Firm Name', detail: businessName },
      { field: 'Nature of Concern', detail: 'Private Limited Company' },
      { field: 'Date of Issue', detail: formatDate(issueDate) },
      { field: 'Registered Address', detail: businessAddress },
      { field: 'Name of the Signatory', detail: ownerName },
      {
        field: 'Director / Partner Details',
        detail: 'Refer online at https://dgft.gov.in or scan the QR Code',
      },
      {
        field: 'Branch Details',
        detail: 'Refer online at https://dgft.gov.in or scan the QR Code',
      },
    ];

    tableData.forEach((row, index) => {
      const y = tableY + index * rowHeight + 8;
      doc.text(row.field, startX + 5, y);
      doc.text(row.detail, startX + colWidths[0] + 5, y);
    });

    // Bottom section
    doc.moveDown(1);
    doc.fontSize(9).text(`Last Modified : ${formatDate(issueDate)}`);
    doc.text('File Number :');
    doc.moveDown(1);

    // Note section
    doc
      .fontSize(8)
      .text(
        'Note : This is a system-generated certificate. Authenticity / Updated details of the IEC at official DGFT website https://dgft.gov.in by entering the IEC and Firm Name under Services > View Any IEC Details. You can also authenticate the certificate by scanning the QR code.',
        { align: 'center' }
      );

    // Double-line border around entire content
    try {
      const { width, height } = doc.page;
      doc.save();
      doc.strokeColor('#000000').lineWidth(1);
      doc.rect(20, 20, width - 40, height - 40).stroke();
      doc.strokeColor('#000000').lineWidth(0.5);
      doc.rect(22, 22, width - 44, height - 44).stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for Shop Establishment Certificate with official format
function generateShopEstablishmentCertificatePdf(
  filePath,
  {
    licenseId,
    businessName,
    ownerName,
    businessAddress,
    businessType,
    issueDate,
    validityDate,
    phone,
    email,
    maleEmployees,
    femaleEmployees,
    registrationFee,
  }
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;

    // Top section with emblem centered
    try {
      const emblemPath = path.join(
        __dirname,
        '..',
        'public',
        'images',
        'emblem.png'
      );
      if (fs.existsSync(emblemPath)) {
        const emblemWidth = 80;
        const x = (pageWidth - emblemWidth) / 2;
        doc.image(emblemPath, x, 40, { width: emblemWidth });
        doc.moveDown(3);
      } else {
        doc.moveDown(1);
      }
    } catch (_) {
      doc.moveDown(1);
    }

    // Header information
    doc.moveDown(2.5);
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('GOVERNMENT OF TAMILNADU DEPARTMENT OF LABOUR', {
        align: 'center',
      });
    doc.moveDown(1);
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('REGISTRATION CERTIFICATE OF ESTABLISHMENT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text("FORM 'C' - (See Rule 4)", { align: 'center' });
    doc.moveDown(2);

    // Establishment details table
    const tableY = doc.y;
    const colWidths = [250, 300];
    const startX = 40;
    const rowHeight = 25;

    // Draw table borders
    doc.save();
    doc.strokeColor('#000000').lineWidth(0.5);

    // Table structure - 12 rows
    for (let i = 0; i <= 12; i++) {
      const y = tableY + i * rowHeight;
      doc
        .moveTo(startX, y)
        .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y)
        .stroke();
    }

    // Vertical lines
    doc
      .moveTo(startX, tableY)
      .lineTo(startX, tableY + 12 * rowHeight)
      .stroke();
    doc
      .moveTo(startX + colWidths[0], tableY)
      .lineTo(startX + colWidths[0], tableY + 12 * rowHeight)
      .stroke();
    doc
      .moveTo(startX + colWidths.reduce((a, b) => a + b, 0), tableY)
      .lineTo(
        startX + colWidths.reduce((a, b) => a + b, 0),
        tableY + 12 * rowHeight
      )
      .stroke();

    doc.restore();

    // Table content
    doc.fontSize(9).font('Helvetica');

    const tableData = [
      { field: 'Registration No.', detail: licenseId },
      { field: 'Name of the Establishment', detail: businessName },
      { field: 'Name of the Employer', detail: ownerName },
      { field: 'Nature of Business', detail: businessType },
      { field: 'Postal Address of the Establishment', detail: businessAddress },
      { field: 'Telephone / Mobile No.', detail: phone || 'N/A' },
      { field: 'E-Mail', detail: email || 'N/A' },
      { field: 'Fax', detail: 'N/A' },
      {
        field: 'Number of Persons Employed',
        detail: String(maleEmployees + femaleEmployees),
      },
      { field: 'MALE', detail: String(maleEmployees) },
      { field: 'FEMALE', detail: String(femaleEmployees) },
      {
        field: 'Registration Fee Paid & Date',
        detail: `Rs. ${registrationFee || '600.00'} & ${formatDate(issueDate)}`,
      },
    ];

    tableData.forEach((row, index) => {
      const y = tableY + index * rowHeight + 8;
      doc.text(row.field, startX + 5, y);
      doc.text(row.detail, startX + colWidths[0] + 5, y);
    });

    // Certification statement
    doc.moveDown(1);
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(
        `It is hereby certified that the ${businessName} has been Registered as a Commercial Establishment under the Karnataka Shops and Commercial Establishments Act, 1961, On ${formatDate(
          issueDate
        )}. The Registration is valid upto ${formatDate(validityDate)}.`,
        { align: 'center' }
      );

    // Important note box
    doc.moveDown(1);
    const noteY = doc.y;
    doc.save();
    doc.strokeColor('#000000').lineWidth(1);
    doc.rect(40, noteY, pageWidth - 80, 30).stroke();
    doc.restore();
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(
        'U/S 24, employment of child below 14 years is prohibited',
        45,
        noteY + 10
      );

    // Issuing authority details (right side)
    doc.moveDown(2);
    const authY = doc.y;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(
        'Office of Senior Labour Inspector - Circle 34',
        pageWidth - 200,
        authY
      );
    doc
      .fontSize(9)
      .text(
        '"Karmika Bhavan", Bannerughatta Road, Bangalore - 560 029 Karnataka',
        pageWidth - 200,
        authY + 15
      );
    doc.moveDown(1);
    doc.text('Signature of the Inspector and Seal', pageWidth - 200, doc.y);

    // Double-line border around entire content
    try {
      const { width, height } = doc.page;
      doc.save();
      doc.strokeColor('#000000').lineWidth(1);
      doc.rect(20, 20, width - 40, height - 40).stroke();
      doc.strokeColor('#000000').lineWidth(0.5);
      doc.rect(22, 22, width - 44, height - 44).stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// Specialized generator for Drug License Certificate with official format
function generateDrugLicenseCertificatePdf(
  filePath,
  {
    licenseId,
    businessName,
    ownerName,
    businessAddress,
    issueDate,
    inspectionDate,
    dosageForms,
    manufacturerLicense,
    validityYears,
  }
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;

    // Header section
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('OFFICE OF THE DRUG LICENSING & CONTROLLING AUTHORITY,', {
        align: 'center',
      });
    doc.moveDown(0.3);
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('DIRECTORATE GENERAL OF MEDICAL HEALTH AND FAMILY WELFARE', {
        align: 'center',
      });
    doc.moveDown(0.3);
    doc.fontSize(14).text('SAHASTRADHARA ROAD, DEHRADUN, UTTARAKHAND (INDIA)', {
      align: 'center',
    });
    doc.moveDown(1);

    // Document identification
    doc.fontSize(12).text(`File No.: ${licenseId}`, 40, doc.y);
    doc.moveDown(1);

    // Certification statement
    doc
      .fontSize(11)
      .text(
        `On the basis of the Joint Inspection carried out on ${formatDate(
          inspectionDate
        )}, we certify that the site indicated on this certificate complies with Good Manufacturing Practices for the dosage forms, categories and activities listed in Table 1.`,
        { align: 'justify' }
      );
    doc.moveDown(1);

    // Manufacturer details
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('1. Name & Address of Site:', 40, doc.y);
    doc.fontSize(11).text(`M/s ${businessName},`, 50, doc.y + 12);
    doc.text(businessAddress, 50, doc.y + 24);
    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text("2. Manufacturer's License number:", 40, doc.y);
    doc
      .fontSize(11)
      .text(manufacturerLicense || 'Form 28-48/UASCP-2013', 50, doc.y + 12);
    doc.moveDown(1);

    // Table 1: Dosage Forms and Activities
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Table 1: Dosage Forms and Activities', 40, doc.y);
    doc.moveDown(0.5);

    const tableY = doc.y;
    const colWidths = [300, 200];
    const startX = 40;
    const rowHeight = 20;

    // Draw table borders
    doc.save();
    doc.strokeColor('#000000').lineWidth(0.5);

    // Table structure - 5 rows (header + 4 data rows)
    for (let i = 0; i <= 4; i++) {
      const y = tableY + i * rowHeight;
      doc
        .moveTo(startX, y)
        .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y)
        .stroke();
    }

    // Vertical lines
    doc
      .moveTo(startX, tableY)
      .lineTo(startX, tableY + 4 * rowHeight)
      .stroke();
    doc
      .moveTo(startX + colWidths[0], tableY)
      .lineTo(startX + colWidths[0], tableY + 4 * rowHeight)
      .stroke();
    doc
      .moveTo(startX + colWidths.reduce((a, b) => a + b, 0), tableY)
      .lineTo(
        startX + colWidths.reduce((a, b) => a + b, 0),
        tableY + 4 * rowHeight
      )
      .stroke();

    doc.restore();

    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Dosage form(s)', startX + 5, tableY + 6);
    doc.text('Activity(ies)', startX + colWidths[0] + 5, tableY + 6);

    // Table data
    doc.fontSize(9).font('Helvetica');
    const dosageData = dosageForms || [
      {
        form: 'Tablets (Cephalosporin & Penicillin)',
        activity: 'Manufacturing & Testing',
      },
      {
        form: 'Capsules (H.G.) (Cephalosporin & Penicillin)',
        activity: 'Manufacturing & Testing',
      },
      {
        form: 'Dry Syrup (Cephalosporin & Penicillin)',
        activity: 'Manufacturing & Testing',
      },
      {
        form: 'Oral Suspension (Ready-Mix) (Cephalosporin)',
        activity: 'Manufacturing & Testing',
      },
    ];

    dosageData.forEach((row, index) => {
      const y = tableY + (index + 1) * rowHeight + 6;
      doc.text(row.form, startX + 5, y);
      doc.text(row.activity, startX + colWidths[0] + 5, y);
    });

    // Validity and compliance information
    doc.moveDown(1);
    doc
      .fontSize(11)
      .text(
        'The responsibility for the quality of the individual batches of the pharmaceutical products manufactured through this process lies with the manufacturer.',
        { align: 'justify' }
      );
    doc.moveDown(0.5);
    doc.text(
      `This certificate remains valid for ${
        validityYears || 'two'
      } years from the date of issue. It becomes invalid if the activities and / or categories certified herewith are changed or if the site is no longer considered to be in compliance with GMP.`,
      { align: 'justify' }
    );
    doc.moveDown(0.5);
    doc.text(
      'The firm is following Good Manufacturing Practices as per World Health Organization (WHO) TRS Guide Lines, in the manufacturing & testing of the said categories of products and items in respect of which the Certificate of Pharmaceuticals products have been issued.',
      { align: 'justify' }
    );
    doc.moveDown(1);

    // Certifying authority details
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Address of certifying Authority:', 40, doc.y);
    doc
      .fontSize(11)
      .text(
        'Directorate General of Medical Health and Family Welfare,',
        50,
        doc.y + 12
      );
    doc.text(
      'Sahastradhara Road, Dehradun, Uttarakhand (INDIA)',
      50,
      doc.y + 24
    );
    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Name & Function of responsible person:', 40, doc.y);
    doc.fontSize(11).text('Shri Tajber Singh', 50, doc.y + 12);
    doc.text('Drug Licensing & Controlling Authority', 50, doc.y + 24);
    doc.text('Uttarakhand', 50, doc.y + 36);
    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Contact Information:', 40, doc.y);
    doc.fontSize(11).text('Email: drugscontroluk@gmail.com', 50, doc.y + 12);
    doc.text('Tel. No.: NA', 50, doc.y + 24);
    doc.text('Fax No.: 0135260874', 50, doc.y + 36);

    // Double-line border around entire content
    try {
      const { width, height } = doc.page;
      doc.save();
      doc.strokeColor('#000000').lineWidth(1);
      doc.rect(20, 20, width - 40, height - 40).stroke();
      doc.strokeColor('#000000').lineWidth(0.5);
      doc.rect(22, 22, width - 44, height - 44).stroke();
      doc.restore();
    } catch (_) {}

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

// Name Registration and Approval
app.post(
  '/api/company/name-registration',
  upload.fields([
    { name: 'ownerAddressProof', maxCount: 1 },
    { name: 'officeAddressProof', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { companyType, companyName, businessOwnerName } = req.body;
      if (!companyType || !companyName || !businessOwnerName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const key = companyName.trim().toLowerCase();
      if (db.companies.has(key)) {
        return res.status(409).json({ error: 'Name Already Exist' });
      }

      db.companies.add(key);
      saveCompanies(db.companies);
      const fullCompanyName = `${companyName.trim()} (${companyType})`;
      const validFrom = new Date();
      const validTo = addYears(validFrom, 5);

      const fileName = `name-approval-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      await generateNameApprovalPdf(filePath, {
        companyType,
        fullCompanyName,
        businessOwnerName,
        validFrom,
        validTo,
      });

      // Store registration with user info
      const { username } = req.body;
      if (username) {
        enqueueGovDocument(username, 'Company Name Approval', {
          companyName: fullCompanyName,
          businessOwner: businessOwnerName,
        });
        db.registrations.push({
          id: Date.now().toString(),
          type: 'Name Approval',
          companyName: fullCompanyName,
          businessOwner: businessOwnerName,
          date: new Date().toISOString(),
          username: String(username).trim().toLowerCase(),
          fileName: fileName,
        });
        saveRegistrations(db.registrations);
      }

      return res.json({
        message: 'Approved',
        file: `/downloads/${fileName}`,
        fullCompanyName,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// Digital Signature Certificate (generate sign placeholder)
app.post(
  '/api/company/dsc',
  upload.fields([
    { name: 'identityProof', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'passportPhoto', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { email, phone, businessOwnerName } = req.body;
      if (!email || !phone || !businessOwnerName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const fileName = `dsc-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      await generateDscStampPdf(filePath, { businessOwnerName });

      // Store registration with user info
      const { username } = req.body;
      if (username) {
        enqueueGovDocument(username, 'DSC Application', {
          companyName: 'N/A',
          businessOwner: businessOwnerName,
        });
        db.registrations.push({
          id: Date.now().toString(),
          type: 'Digital Signature Certificate',
          companyName: 'N/A',
          businessOwner: businessOwnerName,
          date: new Date().toISOString(),
          username: String(username).trim().toLowerCase(),
          fileName: fileName,
        });
        saveRegistrations(db.registrations);
      }

      return res.json({
        message: 'DSC generated',
        file: `/downloads/${fileName}`,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// DIN generation
app.post(
  '/api/company/din',
  upload.fields([
    { name: 'identityProof', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'passportPhoto', maxCount: 1 },
    { name: 'dscCertificate', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { businessOwnerName } = req.body;
      if (!businessOwnerName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      // generate unique 8-digit number
      let din;
      do {
        din = Math.floor(10000000 + Math.random() * 90000000).toString();
      } while (db.generatedNumbers.has(din));
      db.generatedNumbers.add(din);
      saveGeneratedNumbers(db.generatedNumbers);

      const fileName = `din-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      await generateDinCertificatePdf(filePath, { din, businessOwnerName });

      // Store registration with user info
      const { username } = req.body;
      console.log('DIN Registration - Username from request:', username);
      if (username) {
        enqueueGovDocument(username, 'DIN Application', {
          companyName: 'N/A',
          businessOwner: businessOwnerName,
        });
        const registration = {
          id: Date.now().toString(),
          type: 'Director Identification Number',
          companyName: 'N/A',
          businessOwner: businessOwnerName,
          date: new Date().toISOString(),
          username: String(username).trim().toLowerCase(),
          fileName: fileName,
        };
        db.registrations.push(registration);
        saveRegistrations(db.registrations);
        console.log('DIN Registration saved:', registration);
        console.log('Total registrations:', db.registrations.length);
      } else {
        console.log('No username provided for DIN registration');
      }

      return res.json({
        message: 'DIN generated',
        din,
        file: `/downloads/${fileName}`,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// MOA - 6 classes -> brief elaboration (3-4 pages target)
app.post('/api/company/moa', async (req, res) => {
  try {
    const { classes = [] } = req.body;
    if (!Array.isArray(classes) || classes.length < 6) {
      return res.status(400).json({ error: 'Provide 6 class details' });
    }
    const fileName = `moa-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    const lines = ['Memorandum of Association (MOA)', ''];
    classes.slice(0, 6).forEach((c, i) => {
      lines.push(`Class ${i + 1}: ${c}`);
      lines.push(
        `Elaboration: The company shall engage in ${c} with a focus on sustainable growth, compliance, and innovation across relevant markets. This includes research, development, operations, and service delivery aligned with ${c}.`
      );
      lines.push('');
    });
    // Repeat to simulate 3-4 pages
    for (let i = 0; i < 30; i += 1) lines.push(' ');
    await generatePdf(filePath, lines);
    return res.json({
      message: 'MOA generated',
      file: `/downloads/${fileName}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// AOA - detailed version of MOA
app.post('/api/company/aoa', async (req, res) => {
  try {
    const { classes = [] } = req.body;
    if (!Array.isArray(classes) || classes.length < 6) {
      return res.status(400).json({ error: 'Provide 6 class details' });
    }
    const fileName = `aoa-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    const lines = ['Articles of Association (AOA)', ''];
    classes.slice(0, 6).forEach((c, i) => {
      lines.push(`Article ${i + 1}: Governance for ${c}`);
      lines.push(
        `Details: Roles, responsibilities, capitalization, voting rights, board proceedings, and conflict resolution mechanisms governing the business activities related to ${c}.`
      );
      lines.push('');
    });
    for (let i = 0; i < 40; i += 1) lines.push(' ');
    await generatePdf(filePath, lines);
    return res.json({
      message: 'AOA generated',
      file: `/downloads/${fileName}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Certificate of Incorporation
app.post('/api/company/certificate', async (req, res) => {
  try {
    const {
      businessOwnerName,
      companyName = 'OMEGAVISA CONSULTANTS (OPC) PRIVATE LIMITED',
    } = req.body;
    if (!businessOwnerName)
      return res.status(400).json({ error: 'Missing business owner name' });
    const fileName = `incorporation-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    await generateIncorporationCertificatePdf(filePath, {
      businessOwnerName,
      companyName,
    });

    // Store registration with user info
    const { username } = req.body;
    if (username) {
      enqueueGovDocument(username, 'Certificate of Incorporation', {
        companyName,
        businessOwner: businessOwnerName,
      });
      db.registrations.push({
        id: Date.now().toString(),
        type: 'Certificate of Incorporation',
        companyName: companyName,
        businessOwner: businessOwnerName,
        date: new Date().toISOString(),
        username: String(username).trim().toLowerCase(),
        fileName: fileName,
      });
      saveRegistrations(db.registrations);
    }

    return res.json({
      message: 'Certificate generated',
      file: `/downloads/${fileName}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Tax Registration
app.post('/api/license/tax', async (req, res) => {
  try {
    const { type, companyName, username } = req.body; // type: 'income-tax' | 'gst'
    if (!type || !companyName)
      return res.status(400).json({ error: 'Missing required fields' });
    let regNo;
    if (type === 'income-tax') {
      regNo = Math.floor(
        10_000_000_000 + Math.random() * 90_000_000_000
      ).toString(); // 11 digits
    } else if (type === 'gst') {
      regNo = Math.floor(
        1_000_000_000_000_00 + Math.random() * 900_000_000_000_00
      ).toString(); // 15 digits
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
    const fileName = `${type}-registration-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    if (type === 'income-tax') {
      await generateIncomeTaxCertificatePdf(filePath, {
        registrationNumber: regNo,
        companyName: companyName,
        issueDate: new Date(),
      });
    } else if (type === 'gst') {
      await generateGstCertificatePdf(filePath, {
        registrationNumber: regNo,
        companyName: companyName,
        issueDate: new Date(),
      });
    }

    // Store registration with user info
    enqueueGovDocument(username, `${type.toUpperCase()} Registration`, {
      companyName,
      businessOwner: 'N/A',
    });
    db.registrations.push({
      id: Date.now().toString(),
      type: `${type.charAt(0).toUpperCase() + type.slice(1)} Registration`,
      companyName: companyName,
      businessOwner: 'N/A',
      date: new Date().toISOString(),
      username: String(username).trim().toLowerCase(),
      fileName: fileName,
    });
    saveRegistrations(db.registrations);

    return res.json({
      message: 'Registration generated',
      number: regNo,
      file: `/downloads/${fileName}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Government License Registration
app.post('/api/license/government', async (req, res) => {
  try {
    const { type, businessName, ownerName, username } = req.body; // types: import-export, fssai, shop-establishment, drug
    if (!type || !businessName || !ownerName)
      return res.status(400).json({ error: 'Missing required fields' });
    // Generate license ID automatically
    const licenseId = Math.floor(
      100000000 + Math.random() * 900000000
    ).toString(); // 9-digit license ID
    const fileName = `govt-${type}-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    if (type === 'fssai') {
      await generateFssaiCertificatePdf(filePath, {
        licenseId,
        businessName,
        ownerName,
        businessAddress: '123 Business Street, City, Country', // Placeholder
        businessType: 'Food Business Operator', // Placeholder
        issueDate: new Date(),
        validityDate: addYears(new Date(), 1), // Placeholder
      });
    } else if (type === 'import-export') {
      await generateImportExportCertificatePdf(filePath, {
        licenseId,
        businessName,
        ownerName,
        businessAddress: '123 Business Street, City, Country', // Placeholder
        issueDate: new Date(),
      });
    } else if (type === 'shop-establishment') {
      await generateShopEstablishmentCertificatePdf(filePath, {
        licenseId,
        businessName,
        ownerName,
        businessAddress: '123 Business Street, City, Country', // Placeholder
        businessType: 'Commercial Establishment', // Placeholder
        issueDate: new Date(),
        validityDate: addYears(new Date(), 1), // Placeholder
        phone: '123-456-7890', // Placeholder
        email: 'info@example.com', // Placeholder
        maleEmployees: 10, // Placeholder
        femaleEmployees: 5, // Placeholder
        registrationFee: '600.00', // Placeholder
      });
    } else if (type === 'drug') {
      await generateDrugLicenseCertificatePdf(filePath, {
        licenseId,
        businessName,
        ownerName,
        businessAddress: '123 Business Street, City, Country', // Placeholder
        issueDate: new Date(),
        inspectionDate: new Date(), // Placeholder
        dosageForms: [
          {
            form: 'Tablets (Cephalosporin & Penicillin)',
            activity: 'Manufacturing & Testing',
          },
          {
            form: 'Capsules (H.G.) (Cephalosporin & Penicillin)',
            activity: 'Manufacturing & Testing',
          },
          {
            form: 'Dry Syrup (Cephalosporin & Penicillin)',
            activity: 'Manufacturing & Testing',
          },
          {
            form: 'Oral Suspension (Ready-Mix) (Cephalosporin)',
            activity: 'Manufacturing & Testing',
          },
        ],
        manufacturerLicense: 'Form 28-48/UASCP-2013', // Placeholder
        validityYears: 'two', // Placeholder
      });
    }

    // Store registration with user info
    enqueueGovDocument(username, `${type} license`, {
      companyName: businessName,
      businessOwner: ownerName,
    });
    db.registrations.push({
      id: Date.now().toString(),
      type: `${type.charAt(0).toUpperCase() + type.slice(1)} License`,
      companyName: businessName,
      businessOwner: ownerName,
      date: new Date().toISOString(),
      username: String(username).trim().toLowerCase(),
      fileName: fileName,
    });
    saveRegistrations(db.registrations);

    return res.json({
      message: 'License generated',
      licenseId,
      file: `/downloads/${fileName}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Simple Summarization endpoint (naive)
app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string')
      return res.status(400).json({ error: 'No text provided' });
    const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 3);
    const summary = sentences.join(' ');
    return res.json({ summary });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Summarize an uploaded PDF and return a summary PDF
app.post('/api/summarize/pdf', uploadPdf.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);
    const raw = parsed && parsed.text ? parsed.text : '';
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text || text.length < 40) {
      return res.status(400).json({
        error:
          'Unable to extract meaningful text. The PDF might be a scanned image.',
      });
    }
    const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 5);
    const summary = sentences.join(' ');
    const fileName = `summary-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    await generatePdf(filePath, ['Summary (Generated from PDF)', '', summary]);
    if (req.query && req.query.direct === '1') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`
      );
      return res.sendFile(filePath);
    }
    return res.json({
      message: 'Summary generated',
      file: `/downloads/${fileName}`,
      fileName,
    });
  } catch (err) {
    console.error(
      'PDF summarize error:',
      err && err.message ? err.message : err
    );
    if (err && err.message === 'Only PDF files are allowed') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Auth (demo-only; do not use in production)
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Missing username, email or password' });

    const usernameKey = String(username).trim();
    const emailKey = String(email).trim().toLowerCase();
    
    // Check if username already exists
    const existingUsername = db.users.find(
      (user) => user.username === usernameKey
    );
    if (existingUsername)
      return res.status(409).json({ error: 'Username already exists' });

    // Check if email already exists
    const existingEmail = db.users.find(
      (user) => user.email && user.email.toLowerCase() === emailKey
    );
    if (existingEmail)
      return res.status(409).json({ error: 'Email already exists' });

    db.users.push({ 
      username: usernameKey, 
      email: emailKey,
      password: String(password) 
    });
    saveUsers(db.users);
    return res.json({ ok: true, username: usernameKey, email: emailKey });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!password || (!username && !email))
      return res.status(400).json({ error: 'Missing username/email or password' });

    let user;
    if (username) {
      // Login with username
      const usernameKey = String(username).trim();
      user = db.users.find((user) => user.username === usernameKey);
    } else if (email) {
      // Login with email
      const emailKey = String(email).trim().toLowerCase();
      user = db.users.find((user) => user.email && user.email.toLowerCase() === emailKey);
    }

    if (!user || user.password !== String(password))
      return res.status(401).json({ error: 'Invalid credentials' });

    return res.json({ 
      ok: true, 
      username: user.username, 
      email: user.email || user.username 
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Government login (demo)
app.post('/api/government/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ ok: false, message: 'Missing username or password' });
    }
    if (
      String(username).trim() === GOV_DEFAULT.username &&
      String(password) === GOV_DEFAULT.password
    ) {
      return res.json({ ok: true, username: GOV_DEFAULT.username });
    }
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  } catch (err) {
    console.error('Government login error:', err);
    return res
      .status(500)
      .json({ ok: false, message: 'Internal Server Error' });
  }
});

// Government: submit uploaded docs metadata (called from client forms after upload)
app.post('/api/government/submit-document', (req, res) => {
  try {
    const { username, type, payload } = req.body || {};
    if (!username || !type)
      return res.status(400).json({ error: 'Missing fields' });
    const entry = {
      id: uuidv4(),
      userEmail: String(username).trim().toLowerCase(),
      documentType: String(type),
      payload: payload || {},
      status: 'pending',
      submittedAt: new Date().toISOString(),
      files: payload && payload.files ? payload.files : {},
    };
    db.govDocuments.push(entry);
    saveGovDocuments(db.govDocuments);
    return res.json({ ok: true, id: entry.id });
  } catch (err) {
    console.error('Government submit-document error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Government: list documents
app.get('/api/government/documents', (req, res) => {
  try {
    return res.json({ ok: true, documents: db.govDocuments || [] });
  } catch (err) {
    console.error('Government documents list error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Government: verify document
app.post('/api/government/documents/:id/verify', (req, res) => {
  try {
    const { id } = req.params;
    const idx = (db.govDocuments || []).findIndex((d) => d.id === id);
    if (idx === -1)
      return res.status(404).json({ error: 'Document not found' });
    db.govDocuments[idx].status = 'verified';
    db.govDocuments[idx].verifiedAt = new Date().toISOString();
    saveGovDocuments(db.govDocuments);
    // Also record in registrations so user can download a PDF (simulate available file)
    const fileName = `summary-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    generatePdf(filePath, [
      'Verified Government Document',
      '',
      `Type: ${db.govDocuments[idx].documentType}`,
      `User: ${db.govDocuments[idx].userEmail}`,
      `Verified: ${formatDate(new Date())}`,
    ])
      .then(() => {
        db.registrations.push({
          id: Date.now().toString(),
          type: `${db.govDocuments[idx].documentType} (Verified)`,
          companyName: db.govDocuments[idx].payload?.companyName || 'N/A',
          businessOwner: db.govDocuments[idx].payload?.businessOwner || 'N/A',
          date: new Date().toISOString(),
          username: db.govDocuments[idx].userEmail,
          fileName: fileName,
        });
        saveRegistrations(db.registrations);
        return res.json({ ok: true });
      })
      .catch((e) => {
        console.error('PDF gen error:', e);
        return res.json({ ok: true });
      });
  } catch (err) {
    console.error('Government verify error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Government: reject document
app.post('/api/government/documents/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const idx = (db.govDocuments || []).findIndex((d) => d.id === id);
    if (idx === -1)
      return res.status(404).json({ error: 'Document not found' });
    db.govDocuments[idx].status = 'rejected';
    db.govDocuments[idx].rejectionReason = String(reason || '');
    db.govDocuments[idx].rejectedAt = new Date().toISOString();
    saveGovDocuments(db.govDocuments);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Government reject error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Government: fetch a file blob (simulate from uploads)
app.get('/api/government/documents/:id/files/:key', (req, res) => {
  try {
    // For demo we just return a generated small PDF
    const fileName = `summary-${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    generatePdf(filePath, ['File preview']).then(() => {
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath);
    });
  } catch (err) {
    console.error('Government file fetch error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Legal advice consult
app.post('/api/legal/consult', (req, res) => {
  const { name, email, category, message } = req.body || {};
  if (!name || !email || !category || !message)
    return res.status(400).json({ error: 'All fields are required' });
  const id = uuidv4();
  const consult = {
    id,
    name,
    email,
    category,
    message,
    status: 'pending',
    acceptedBy: null,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.consults.push(consult);
  saveConsults(db.consults);
  return res.json({ ok: true, id });
});

// Lawyer auth (demo)
app.post('/api/lawyer/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: 'Missing username or password' });
    // Demo: accept any credentials
    return res.json({ ok: true, username: String(username).trim() });
  } catch (err) {
    console.error('Lawyer login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List all consultation requests for lawyers
app.get('/api/lawyer/consultations', (req, res) => {
  try {
    const consultations = (db.consults || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ ok: true, consultations });
  } catch (err) {
    console.error('List consultations error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lawyer accepts a consultation
app.post('/api/lawyer/consultations/:id/accept', (req, res) => {
  try {
    const { id } = req.params;
    const { lawyerUsername } = req.body || {};
    const consult = (db.consults || []).find((c) => c.id === id);
    if (!consult)
      return res.status(404).json({ error: 'Consultation not found' });
    consult.status = 'accepted';
    consult.acceptedBy = String(lawyerUsername || 'lawyer');
    consult.updatedAt = new Date().toISOString();
    // Notify user with a system message containing a deep link
    const link = `/user-chat.html?id=${consult.id}`;
    consult.messages = consult.messages || [];
    consult.messages.push({
      sender: 'system',
      text: `Your consultation has been accepted by ${consult.acceptedBy}. Tap to chat: ${link}`,
      timestamp: new Date().toISOString(),
    });
    saveConsults(db.consults);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Accept consultation error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lawyer chat: fetch messages
app.get('/api/lawyer/chat/:id/messages', (req, res) => {
  try {
    const { id } = req.params;
    const consult = (db.consults || []).find((c) => c.id === id);
    if (!consult)
      return res.status(404).json({ error: 'Consultation not found' });
    return res.json({ ok: true, messages: consult.messages || [] });
  } catch (err) {
    console.error('Lawyer chat messages error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Lawyer chat: send message
app.post('/api/lawyer/chat/:id/send', (req, res) => {
  try {
    const { id } = req.params;
    const { message, lawyerUsername } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message required' });
    const consult = (db.consults || []).find((c) => c.id === id);
    if (!consult)
      return res.status(404).json({ error: 'Consultation not found' });
    consult.messages = consult.messages || [];
    consult.messages.push({
      sender: 'lawyer',
      from: String(lawyerUsername || 'lawyer'),
      text: String(message),
      timestamp: new Date().toISOString(),
    });
    consult.updatedAt = new Date().toISOString();
    saveConsults(db.consults);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Lawyer send message error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User: get consultation details by id
app.get('/api/user/consultation/:id', (req, res) => {
  try {
    const { id } = req.params;
    const consult = (db.consults || []).find((c) => c.id === id);
    if (!consult)
      return res.status(404).json({ error: 'Consultation not found' });
    const consultation = { ...consult, lawyerName: consult.acceptedBy };
    return res.json({ ok: true, consultation });
  } catch (err) {
    console.error('Get consultation error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User: list consultations for an email (optional helper)
app.get('/api/user/consultations', (req, res) => {
  try {
    const { email } = req.query || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const key = String(email).trim().toLowerCase();
    const consultations = (db.consults || []).filter(
      (c) => String(c.email || '').toLowerCase() === key
    );
    return res.json({ ok: true, consultations });
  } catch (err) {
    console.error('List user consultations error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User chat: fetch messages
app.get('/api/user/chat/:id/messages', (req, res) => {
  try {
    const { id } = req.params;
    const consult = (db.consults || []).find((c) => c.id === id);
    if (!consult)
      return res.status(404).json({ error: 'Consultation not found' });
    return res.json({ ok: true, messages: consult.messages || [] });
  } catch (err) {
    console.error('User chat messages error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User chat: send message
app.post('/api/user/chat/:id/send', (req, res) => {
  try {
    const { id } = req.params;
    const { message, userEmail } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message required' });
    const consult = (db.consults || []).find((c) => c.id === id);
    if (!consult)
      return res.status(404).json({ error: 'Consultation not found' });
    // Optional: ensure the sender matches consult.email
    consult.messages = consult.messages || [];
    consult.messages.push({
      sender: 'user',
      from: String(userEmail || consult.email),
      text: String(message),
      timestamp: new Date().toISOString(),
    });
    consult.updatedAt = new Date().toISOString();
    saveConsults(db.consults);
    return res.json({ ok: true });
  } catch (err) {
    console.error('User send message error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User chat: mark messages as read (no-op persistence aside from timestamp)
app.post('/api/user/chat/:id/mark-read', (req, res) => {
  try {
    const { id } = req.params;
    const consult = (db.consults || []).find((c) => c.id === id);
    if (!consult)
      return res.status(404).json({ error: 'Consultation not found' });
    consult.updatedAt = new Date().toISOString();
    saveConsults(db.consults);
    return res.json({ ok: true });
  } catch (err) {
    console.error('User mark-read error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get user registrations
app.get('/api/user/registrations', (req, res) => {
  try {
    const { username } = req.query;
    console.log('Fetching registrations for username:', username);
    console.log('Total registrations in DB:', db.registrations.length);
    console.log('All registrations:', db.registrations);

    if (!username)
      return res.status(400).json({ error: 'Username is required' });

    const key = String(username).trim().toLowerCase();
    console.log('Searching for username (lowercase):', key);

    const userRegistrations = db.registrations.filter(
      (reg) => reg.username.toLowerCase() === key
    );
    console.log('Found registrations for user:', userRegistrations);

    return res.json({ registrations: userRegistrations });
  } catch (err) {
    console.error('Error fetching user registrations:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Serve generated files
app.use('/downloads', express.static(uploadsDir));

// Global error handler to ensure JSON responses (e.g., multer fileFilter errors)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.message === 'Only PDF files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
