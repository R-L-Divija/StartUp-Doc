// Smooth nav
document.querySelectorAll('[data-nav]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Carousel
const carousel = document.querySelector('[data-carousel]');
if (carousel) {
  const slides = Array.from(carousel.querySelectorAll('.slide'));
  const dots = carousel.querySelector('[data-dots]');
  const sideNav = carousel.querySelector('[data-side-nav]');
  let idx = 0;
  let timer;
  function show(i) {
    slides.forEach((s, n) => s.classList.toggle('active', n === i));
    if (dots)
      Array.from(dots.children).forEach((d, n) =>
        d.classList.toggle('active', n === i)
      );
    if (sideNav)
      Array.from(sideNav.children).forEach((d, n) =>
        d.classList.toggle('active', n === i)
      );
    idx = i;
  }
  function next() {
    show((idx + 1) % slides.length);
  }
  function prev() {
    show((idx - 1 + slides.length) % slides.length);
  }
  carousel.querySelector('[data-next]').addEventListener('click', () => {
    next();
    restart();
  });
  carousel.querySelector('[data-prev]').addEventListener('click', () => {
    prev();
    restart();
  });
  if (dots) {
    slides.forEach((_, n) => {
      const b = document.createElement('button');
      b.addEventListener('click', () => {
        show(n);
        restart();
      });
      dots.appendChild(b);
    });
  }
  if (sideNav) {
    // Create 5 nav buttons labeled 1..5 on the left
    slides.forEach((_, n) => {
      const b = document.createElement('button');
      b.textContent = String(n + 1);
      b.addEventListener('click', () => {
        show(n);
        restart();
      });
      sideNav.appendChild(b);
    });
  }
  function restart() {
    clearInterval(timer);
    timer = setInterval(next, 5000);
  }
  restart();
  show(0);
}

// Scroll reveal
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal, .card').forEach((el) => io.observe(el));

// About Us scroll animations
const aboutScrollObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
      }
    });
  },
  {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px',
  }
);

// Observe scroll animation elements
document.addEventListener('DOMContentLoaded', function () {
  document
    .querySelectorAll('.scroll-animate, .scroll-animate-item')
    .forEach((el) => {
      aboutScrollObserver.observe(el);
    });
});

// Company page: timeline click shows only the selected step's fields
const processBar = document.getElementById('companyTimeline');
if (processBar) {
  const steps = Array.from(processBar.querySelectorAll('.timeline-step'));
  const panels = Array.from(document.querySelectorAll('#companyFlow details'));
  function showStep(idx) {
    steps.forEach((b, i) => b.classList.toggle('active', i === idx));
    panels.forEach((p, i) => {
      const open = i === idx;
      p.classList.toggle('active', open);
      p.open = open;
    });
    const target = panels[idx];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const first = panels[idx]?.querySelector('input, select, textarea, button');
    if (first) first.focus({ preventScroll: true });
  }
  steps.forEach((btn, i) => btn.addEventListener('click', () => showStep(i)));
  // init
  if (steps.length) showStep(0);
}

// Auth UI
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const userBox = document.getElementById('userBox');
const usernameDisplay = document.getElementById('usernameDisplay');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');

function setUser(username) {
  if (username) {
    localStorage.setItem('currentUser', username);
    updateAuthUI();
  } else {
    localStorage.removeItem('currentUser');
    updateAuthUI();
  }
}

function updateAuthUI() {
  const currentUser = localStorage.getItem('currentUser');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const userBox = document.getElementById('userBox');
  const usernameDisplay = document.getElementById('usernameDisplay');

  if (currentUser) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';
    if (userBox) userBox.style.display = 'block';
    if (usernameDisplay) {
      usernameDisplay.textContent = currentUser;
      // Username is now a styled button, no need for inline styling
      usernameDisplay.title = 'Click to view profile';
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (registerBtn) registerBtn.style.display = 'inline-block';
    if (userBox) userBox.style.display = 'none';
    if (usernameDisplay) usernameDisplay.textContent = '';
  }
}

function setupAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => showAuth3DOverlay('login'));
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', () => showAuth3DOverlay('register'));
  }

  updateAuthUI();
}

// Function to show user registrations
function showUserRegistrations() {
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) return;

  fetch(`/api/user/registrations?username=${encodeURIComponent(currentUser)}`)
    .then((response) => response.json())
    .then((data) => {
      const registrations = data.registrations || [];
      showRegistrationsModal(registrations);
    })
    .catch((error) => {
      console.error('Error fetching registrations:', error);
      alert('Failed to fetch registrations');
    });
}

// Function to show registrations modal
function showRegistrationsModal(registrations) {
  const modalHtml = `
    <div id="registrationsModal" class="modal" style="display: block;">
      <div class="modal-content">
        <span class="close" onclick="closeRegistrationsModal()">&times;</span>
        <h2>Your Registrations</h2>
        ${
          registrations.length === 0
            ? '<p>No registrations found.</p>'
            : `<div class="registrations-list">
            ${registrations
              .map(
                (reg) => `
              <div class="registration-item">
                <div class="reg-header">
                  <strong>${reg.type}</strong>
                  <span class="reg-date">${new Date(
                    reg.date
                  ).toLocaleDateString()}</span>
                </div>
                <div class="reg-details">
                  <p><strong>Company:</strong> ${reg.companyName}</p>
                  <p><strong>Business Owner:</strong> ${reg.businessOwner}</p>
                  <p><strong>File:</strong> ${reg.fileName}</p>
                </div>
              </div>
            `
              )
              .join('')}
          </div>`
        }
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('registrationsModal');
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Function to close registrations modal
function closeRegistrationsModal() {
  const modal = document.getElementById('registrationsModal');
  if (modal) {
    modal.remove();
  }
}

// Modify form submissions to include username
function addFormListeners() {
  // Company name registration form
  const companyForm = document.getElementById('nameRegForm');
  if (companyForm) {
    companyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        alert('Please login first');
        return;
      }

      const formData = new FormData(companyForm);
      formData.append('username', currentUser);

      try {
        const response = await fetch('/api/company/name-registration', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (result.file) {
          downloadFile(result.file, `name-approval-${Date.now()}.pdf`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error generating PDF. Please try again.');
      }
    });
  }

  // Company DSC form
  const dscForm = document.getElementById('dscForm');
  if (dscForm) {
    dscForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        alert('Please login first');
        return;
      }

      const formData = new FormData(dscForm);
      formData.append('username', currentUser);

      try {
        const response = await fetch('/api/company/dsc', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (result.file) {
          downloadFile(result.file, `dsc-${Date.now()}.pdf`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error generating PDF. Please try again.');
      }
    });
  }

  // Company DIN form
  const dinForm = document.getElementById('dinForm');
  if (dinForm) {
    dinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        alert('Please login first');
        return;
      }

      const formData = new FormData(dinForm);
      formData.append('username', currentUser);

      try {
        const response = await fetch('/api/company/din', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (result.file) {
          downloadFile(result.file, `din-${Date.now()}.pdf`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error generating PDF. Please try again.');
      }
    });
  }

  // Company incorporation certificate form
  const incorporationForm = document.getElementById('incorporationForm');
  if (incorporationForm) {
    incorporationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        alert('Please login first');
        return;
      }

      const formData = new FormData(incorporationForm);
      formData.append('username', currentUser);

      try {
        const response = await fetch('/api/company/certificate', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (result.file) {
          downloadFile(result.file, `incorporation-${Date.now()}.pdf`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error generating PDF. Please try again.');
      }
    });
  }

  // Tax license forms
  const taxForm = document.getElementById('taxForm');
  if (taxForm) {
    taxForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        alert('Please login first');
        return;
      }

      const formData = new FormData(taxForm);
      const data = {
        type: formData.get('type'),
        companyName: formData.get('companyName'),
        username: currentUser,
      };

      try {
        const response = await fetch('/api/license/tax', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.file) {
          downloadFile(
            result.file,
            `${data.type}-registration-${Date.now()}.pdf`
          );
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error generating PDF. Please try again.');
      }
    });
  }

  // Government license forms
  const govtForm = document.getElementById('govtForm');
  if (govtForm) {
    govtForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        alert('Please login first');
        return;
      }

      const formData = new FormData(govtForm);
      const data = {
        type: formData.get('type'),
        businessName: formData.get('businessName'),
        ownerName: formData.get('ownerName'),
        username: currentUser,
      };

      try {
        const response = await fetch('/api/license/government', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (result.file) {
          downloadFile(result.file, `govt-${data.type}-${Date.now()}.pdf`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error generating PDF. Please try again.');
      }
    });
  }

  // Legal Advise form
  const legalForm = document.getElementById('legalForm');
  if (legalForm)
    legalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = document.getElementById('legalResult');
      out.textContent = 'Submitting...';
      try {
        const data = await postJson(
          '/api/legal/consult',
          Object.fromEntries(new FormData(legalForm))
        );
        out.textContent = `Request ID: ${data.id}`;
        legalForm.reset();
      } catch (err) {
        out.textContent = err.message;
      }
    });

  // Summarization - Text
  const sumFormText = document.getElementById('sumFormText');
  if (sumFormText)
    sumFormText.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = document.getElementById('sumResultText');
      out.textContent = 'Summarizing...';
      const text = new FormData(e.target).get('text');
      try {
        const data = await postJson('/api/summarize', { text });
        out.textContent = data.summary;
      } catch (err) {
        out.textContent = err.message;
      }
    });

  // Summarization - PDF upload -> summary PDF
  const sumFormPdf = document.getElementById('sumFormPdf');
  if (sumFormPdf)
    sumFormPdf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = document.getElementById('sumResultPdf');
      out.textContent = 'Uploading & summarizing PDF...';
      try {
        const fileInput = sumFormPdf.querySelector(
          'input[type="file"][name="file"]'
        );
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
          out.textContent = 'Please select a PDF file.';
          return;
        }
        const file = fileInput.files[0];
        // Do not block on mime type detection which can be inconsistent; server validates again
        // Request JSON first; if it fails due to content-type, fallback to direct download
        try {
          const data = await postFormData('/api/summarize/pdf', sumFormPdf);
          out.textContent = 'Summary ready. Downloading...';
          await downloadFile(data.file);
        } catch (jsonErr) {
          // Fallback: request direct file stream
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch('/api/summarize/pdf?direct=1', {
            method: 'POST',
            body: fd,
          });
          if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
          const blob = await res.blob();
          const a = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);
          a.href = objectUrl;
          a.download = 'summary.pdf';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objectUrl);
          out.textContent = 'Summary ready. Downloading...';
        }
      } catch (err) {
        out.textContent = err.message;
      }
    });
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let json = {};
  try {
    json = await res.json();
  } catch {}
  if (!res.ok)
    throw new Error(json.error || `Request failed (HTTP ${res.status})`);
  return json;
}

const loginForm = document.getElementById('loginForm');
if (loginForm)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('loginResult');
    out.textContent = 'Signing in...';
    const fd = new FormData(loginForm);
    try {
      const data = await postJson('/api/auth/login', Object.fromEntries(fd));
      setUser(data.username);
      out.textContent = 'Success';
      loginModal.close();
    } catch (err) {
      out.textContent = err.message;
    }
  });

const registerForm = document.getElementById('registerForm');
if (registerForm)
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('registerResult');
    out.textContent = 'Registering...';
    const fd = new FormData(registerForm);
    try {
      const data = await postJson('/api/auth/register', Object.fromEntries(fd));
      setUser(data.username);
      out.textContent = 'Success';
      registerModal.close();
    } catch (err) {
      out.textContent = err.message;
    }
  });

async function downloadFile(url, filename) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
    const blob = await res.blob();
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    a.href = objectUrl;
    a.download = filename || url.split('/').pop() || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      a.remove();
    }, 0);
  } catch (e) {
    // Fallback: open the file directly (browser will open or download)
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

async function postFormData(url, form) {
  const fd = new FormData(form);
  const res = await fetch(url, { method: 'POST', body: fd });
  let json = {};
  try {
    json = await res.json();
  } catch (e) {
    /* non-JSON error */
  }
  if (!res.ok)
    throw new Error(json.error || `Request failed (HTTP ${res.status})`);
  return json;
}

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let json = {};
  try {
    json = await res.json();
  } catch (e) {
    /* non-JSON */
  }
  if (!res.ok)
    throw new Error(json.error || `Request failed (HTTP ${res.status})`);
  return json;
}

// Name Registration
const nameRegForm = document.getElementById('nameRegForm');
if (nameRegForm)
  nameRegForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('nameRegResult');
    out.textContent = 'Submitting...';
    try {
      const data = await postFormData(
        '/api/company/name-registration',
        e.target
      );
      out.textContent = `Approved: ${data.fullCompanyName}. Downloading PDF...`;
      downloadFile(data.file);
    } catch (err) {
      out.textContent = err.message;
    }
  });

// Enhance timeline content: convert newline text to heading + bullet list for readability
(function () {
  const cards = document.querySelectorAll('#timeline .content.card');
  cards.forEach((card) => {
    if (!card || card.querySelector('h3')) return;
    const raw = card.textContent || '';
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;
    const [first, ...rest] = lines;
    const heading = first.replace(/^\d+[\.)\-]?\s*/, '');
    card.innerHTML = '';
    const h3 = document.createElement('h3');
    h3.textContent = heading;
    card.appendChild(h3);
    if (rest.length) {
      const ul = document.createElement('ul');
      rest.forEach((t) => {
        const li = document.createElement('li');
        li.textContent = t.replace(/^[-\u2022\u25CF\u25E6\u2023]\s*/, '');
        ul.appendChild(li);
      });
      card.appendChild(ul);
    }
  });
})();

// DSC
const dscForm = document.getElementById('dscForm');
if (dscForm)
  dscForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('dscResult');
    out.textContent = 'Generating DSC...';
    try {
      const data = await postFormData('/api/company/dsc', e.target);
      out.textContent = 'DSC ready. Downloading...';
      downloadFile(data.file);
    } catch (err) {
      out.textContent = err.message;
    }
  });

// DIN
const dinForm = document.getElementById('dinForm');
if (dinForm)
  dinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('dinResult');
    out.textContent = 'Generating DIN...';
    try {
      const data = await postFormData('/api/company/din', e.target);
      out.textContent = `DIN: ${data.din}. Downloading...`;
      downloadFile(data.file);
    } catch (err) {
      out.textContent = err.message;
    }
  });

// MOA
const moaForm = document.getElementById('moaForm');
if (moaForm)
  moaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('moaResult');
    out.textContent = 'Generating MOA...';
    const fd = new FormData(e.target);
    const classes = [
      fd.get('class1'),
      fd.get('class2'),
      fd.get('class3'),
      fd.get('class4'),
      fd.get('class5'),
      fd.get('class6'),
    ];
    try {
      const data = await postJson('/api/company/moa', { classes });
      out.textContent = 'MOA ready. Downloading...';
      downloadFile(data.file);
    } catch (err) {
      out.textContent = err.message;
    }
  });

// AOA
const aoaForm = document.getElementById('aoaForm');
if (aoaForm)
  aoaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('aoaResult');
    out.textContent = 'Generating AOA...';
    const fd = new FormData(e.target);
    const classes = [
      fd.get('class1'),
      fd.get('class2'),
      fd.get('class3'),
      fd.get('class4'),
      fd.get('class5'),
      fd.get('class6'),
    ];
    try {
      const data = await postJson('/api/company/aoa', { classes });
      out.textContent = 'AOA ready. Downloading...';
      downloadFile(data.file);
    } catch (err) {
      out.textContent = err.message;
    }
  });

// Certificate
const certForm = document.getElementById('certForm');
if (certForm)
  certForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('certResult');
    out.textContent = 'Generating certificate...';
    const fd = new FormData(e.target);
    try {
      const data = await postJson('/api/company/certificate', {
        businessOwnerName: fd.get('businessOwnerName'),
        companyName: fd.get('companyName') || undefined,
      });
      out.textContent = 'Certificate ready. Downloading...';
      downloadFile(data.file);
    } catch (err) {
      out.textContent = err.message;
    }
  });

// Tax
const taxForm = document.getElementById('taxForm');
if (taxForm)
  taxForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('taxResult');
    out.textContent = 'Generating...';
    try {
      const data = await postJson(
        '/api/license/tax',
        Object.fromEntries(new FormData(e.target))
      );
      out.textContent = `${
        data.number ? 'Number: ' + data.number + '. ' : ''
      }Downloading...`;
      downloadFile(data.file);
    } catch (err) {
      out.textContent = err.message;
    }
  });

// Government
const govForm = document.getElementById('govForm');
if (govForm)
  govForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('govResult');
    out.textContent = 'Applying...';
    try {
      const data = await postJson(
        '/api/license/government',
        Object.fromEntries(new FormData(e.target))
      );
      out.textContent = `License ID: ${data.licenseId}. Downloading...`;
      downloadFile(data.file);
    } catch (err) {
      out.textContent = err.message;
    }
  });

// Legal Advise form
const legalForm = document.getElementById('legalForm');
if (legalForm)
  legalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('legalResult');
    out.textContent = 'Submitting...';
    try {
      const data = await postJson(
        '/api/legal/consult',
        Object.fromEntries(new FormData(legalForm))
      );
      out.textContent = `Request ID: ${data.id}`;
      legalForm.reset();
    } catch (err) {
      out.textContent = err.message;
    }
  });

// Summarization - Text
const sumFormText = document.getElementById('sumFormText');
if (sumFormText)
  sumFormText.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('sumResultText');
    out.textContent = 'Summarizing...';
    const text = new FormData(e.target).get('text');
    try {
      const data = await postJson('/api/summarize', { text });
      out.textContent = data.summary;
    } catch (err) {
      out.textContent = err.message;
    }
  });

// Summarization - PDF upload -> summary PDF
const sumFormPdf = document.getElementById('sumFormPdf');
if (sumFormPdf)
  sumFormPdf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = document.getElementById('sumResultPdf');
    out.textContent = 'Uploading & summarizing PDF...';
    try {
      const fileInput = sumFormPdf.querySelector(
        'input[type="file"][name="file"]'
      );
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        out.textContent = 'Please select a PDF file.';
        return;
      }
      const file = fileInput.files[0];
      // Do not block on mime type detection which can be inconsistent; server validates again
      // Request JSON first; if it fails due to content-type, fallback to direct download
      try {
        const data = await postFormData('/api/summarize/pdf', sumFormPdf);
        out.textContent = 'Summary ready. Downloading...';
        await downloadFile(data.file);
      } catch (jsonErr) {
        // Fallback: request direct file stream
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/summarize/pdf?direct=1', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
        const blob = await res.blob();
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = 'summary.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        out.textContent = 'Summary ready. Downloading...';
      }
    } catch (err) {
      out.textContent = err.message;
    }
  });

// Navbar loader for all pages
function loadNavbar() {
  fetch('/navbar.html')
    .then((res) => res.text())
    .then((html) => {
      // Replace existing navbar or insert at top
      const existing = document.querySelector('header.navbar');
      if (existing) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        existing.replaceWith(temp.firstElementChild);
      } else {
        document.body.insertAdjacentHTML('afterbegin', html);
      }
      // Re-bind navbar auth controls and reflect current user
      setupAuthUI();
      setUser(localStorage.getItem('currentUser'));
    });
}
// Call on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
  loadNavbar();
}

// 3D Auth Overlay (non-invasive; no server changes)
function showAuth3DOverlay(defaultTab) {
  const existing = document.getElementById('auth3dOverlay');
  if (existing) {
    existing.remove();
  }
  const overlay = document.createElement('div');
  overlay.id = 'auth3dOverlay';
  overlay.innerHTML = `
  <style id="auth3dStyles">
    #auth3dOverlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; background: rgba(3,9,20,0.65); backdrop-filter: blur(4px) saturate(1.1); }
    .auth3d-card { position: relative; width: min(880px, 92vw); border-radius: 20px; border: 1px solid rgba(255,255,255,0.14); background: rgba(14,20,38,0.85); box-shadow: 0 20px 60px rgba(0,0,0,0.6); transform-style: preserve-3d; perspective: 1200px; overflow: hidden; }
    .auth3d-card::before { content: ''; position: absolute; inset: -2px; padding: 2px; border-radius: 20px; background: conic-gradient(from 0deg, #7cffcb, #3399ff, #ff6a3d, #7cffcb); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: a3dspin 6s linear infinite; opacity: .5; }
    @keyframes a3dspin { to { transform: rotate(360deg); } }
    .a3d-grid { display: grid; grid-template-columns: 1fr; }
    .a3d-form { padding: 28px; display: grid; gap: 16px; align-content: center; }
    .a3d-tabs { display: flex; gap: 10px; }
    .a3d-tabs button { flex: 1; padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: #e6ecff; cursor: pointer; }
    .a3d-tabs button.active { background: #111a2c; color: var(--accent2); }
    .a3d-flip { position: relative; min-height: 300px; transform-style: preserve-3d; transition: transform 600ms cubic-bezier(.2,.7,.2,1.1); }
    .a3d-flip.flipped { transform: rotateY(180deg); }
    .a3d-face { position: absolute; inset: 0; backface-visibility: hidden; display: grid; gap: 14px; }
    .a3d-face.register { transform: rotateY(180deg); }
    .a3d-field { display: grid; gap: 8px; }
    .a3d-field input { padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.25); color: #e6ecff; }
    .a3d-actions { display: flex; gap: 10px; align-items: center; }
    .a3d-actions button { padding: 10px 14px; border-radius: 10px; cursor: pointer; background: var(--accent); color: #0b1120; border: none; font-weight: 700; }
    .a3d-close { position: absolute; top: 10px; right: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #e6ecff; border-radius: 10px; padding: 6px 10px; cursor: pointer; }
    @media (max-width: 880px) { .a3d-grid { grid-template-columns: 1fr; } .a3d-visual { display: none; } }
  </style>
  <div class="auth3d-card" role="dialog" aria-modal="true" aria-labelledby="a3dTitle">
    <button class="a3d-close" aria-label="Close" id="a3dClose">Close</button>
    <div class="a3d-grid">
      <div class="a3d-form">
        <div class="a3d-tabs"><button id="a3dTabLogin" class="active" type="button">Login</button><button id="a3dTabRegister" type="button">Register</button></div>
        <div class="a3d-flip" id="a3dFlip">
          <div class="a3d-face login">
            <form id="a3dLoginForm">
              <div class="a3d-field"><label>Email</label><input name="email" type="email" required placeholder="you@example.com" /></div>
              <div class="a3d-field"><label>Password</label><input name="password" type="password" required placeholder="••••••••" /></div>
              <div class="a3d-actions"><button type="submit">Login</button><span class="muted">Use email as username</span></div>
              <div class="result" id="a3dLoginResult"></div>
            </form>
          </div>
          <div class="a3d-face register">
            <form id="a3dRegisterForm">
              <div class="a3d-field"><label>Email</label><input name="email" type="email" required placeholder="you@example.com" /></div>
              <div class="a3d-field"><label>Password</label><input name="password" type="password" required placeholder="Create a password" /></div>
              <div class="a3d-field"><label>Confirm Password</label><input name="password2" type="password" required placeholder="Repeat password" /></div>
              <div class="a3d-actions"><button type="submit">Create Account</button><span class="muted">Account uses email</span></div>
              <div class="result" id="a3dRegisterResult"></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);

  // Tabs
  const tabLogin = document.getElementById('a3dTabLogin');
  const tabRegister = document.getElementById('a3dTabRegister');
  const flip = document.getElementById('a3dFlip');
  function show(which) {
    const isLogin = which === 'login';
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);
    flip.classList.toggle('flipped', !isLogin);
  }
  tabLogin.onclick = () => show('login');
  tabRegister.onclick = () => show('register');
  show(defaultTab === 'register' ? 'register' : 'login');
  document.getElementById('a3dClose').onclick = () => overlay.remove();

  // API helpers reuse
  async function postAuth(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let json = {};
    try {
      json = await res.json();
    } catch {}
    if (!res.ok)
      throw new Error(json.error || `Request failed (HTTP ${res.status})`);
    return json;
  }

  function completeLogin(email) {
    try {
      // For 3D overlay, we'll use email as username for backward compatibility
      localStorage.setItem('currentUser', email);
      localStorage.setItem('userEmail', email);
    } catch {}
    if (typeof setUser === 'function') setUser(email);
    overlay.remove();
  }

  document
    .getElementById('a3dLoginForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = document.getElementById('a3dLoginResult');
      out.textContent = 'Signing in...';
      const fd = new FormData(e.target);
      const email = String(fd.get('email') || '').trim();
      const password = String(fd.get('password') || '');
      try {
        await postAuth('/api/auth/login', { email, password });
        out.textContent = 'Success';
        completeLogin(email);
      } catch (err) {
        out.textContent = err.message;
      }
    });

  document
    .getElementById('a3dRegisterForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = document.getElementById('a3dRegisterResult');
      out.textContent = 'Creating account...';
      const fd = new FormData(e.target);
      const email = String(fd.get('email') || '').trim();
      const password = String(fd.get('password') || '');
      const password2 = String(fd.get('password2') || '');
      if (password !== password2) {
        out.textContent = 'Passwords do not match';
        return;
      }
      try {
        // Generate a username from email for 3D overlay
        const username = email.split('@')[0];
        await postAuth('/api/auth/register', { username, email, password });
        out.textContent = 'Account created';
        completeLogin(email);
      } catch (err) {
        out.textContent = err.message;
      }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Load navbar and setup auth UI
  loadNavbar().then(() => {
    setupAuthUI();
    addFormListeners();
  });

  // Update auth UI immediately for existing users
  updateAuthUI();
});
