// MyCluster Documentation Viewer
// Loads and displays markdown files with syntax highlighting

const defaultFile = 'COMPLETE_GUIDE.md';
let currentFile = defaultFile;

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Custom renderer for better styling
const renderer = new marked.Renderer();

renderer.heading = (text, level) => {
  const id = text.toLowerCase().replace(/[^\w]+/g, '-');
  return `<h${level} id="${id}"><a href="#${id}" class="heading-link"></a>${text}</h${level}>`;
};

renderer.code = (code, language) => {
  const lang = language || 'plaintext';
  return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
};

renderer.link = (href, title, text) => {
  if (href.startsWith('./')) {
    href = href.replace('./', '#');
    return `<a href="${href}" data-file="${href.replace('#', '')}" class="internal-link">${text}</a>`;
  }
  return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
};

// Escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Load markdown file
async function loadFile(filename) {
  const content = document.getElementById('content');
  const currentFileEl = document.getElementById('current-file');
  
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.file === filename) {
      item.classList.add('active');
    }
  });

  // Show loading
  content.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Loading documentation...</p>
    </div>
  `;

  try {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`Failed to load ${filename}`);
    
    const markdown = await response.text();
    const html = marked.parse(markdown);
    
    content.innerHTML = `<article>${html}</article>`;
    
    // Update breadcrumb
    const fileTitle = filename.replace('.md', '').replace(/_/g, ' ');
    currentFileEl.textContent = fileTitle;
    
    // Generate TOC
    generateTOC();
    
    // Update URL hash
    history.pushState({ file: filename }, '', `#${filename}`);
    
    // Scroll to top
    content.scrollTop = 0;
    
  } catch (error) {
    content.innerHTML = `
      <div class="error">
        <h2>😕 Oops!</h2>
        <p>Failed to load documentation: ${error.message}</p>
        <p>Try refreshing the page or selecting another document from the sidebar.</p>
      </div>
    `;
  }
}

// Generate Table of Contents
function generateTOC() {
  const tocNav = document.getElementById('toc-nav');
  const headings = document.querySelectorAll('.content h2, .content h3');
  
  tocNav.innerHTML = '';
  
  headings.forEach(heading => {
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    link.style.paddingLeft = heading.tagName === 'H3' ? '24px' : '12px';
    link.style.fontSize = heading.tagName === 'H3' ? '0.8rem' : '0.875rem';
    
    tocNav.appendChild(link);
  });
}

// Theme toggle
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
}

// Navigation
function initNavigation() {
  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-file]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const filename = item.dataset.file;
      loadFile(filename);
    });
  });

  // Internal links in content
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('internal-link')) {
      e.preventDefault();
      const filename = e.target.dataset.file;
      loadFile(filename);
    }
  });

  // Handle browser back/forward
  window.addEventListener('popstate', (event) => {
    if (event.state?.file) {
      loadFile(event.state.file);
    }
  });
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to search (future)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // Future: Open search
    }
    
    // Escape to close sidebar on mobile
    if (e.key === 'Escape') {
      document.querySelector('.sidebar')?.classList.remove('open');
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initKeyboardShortcuts();
  
  // Load file from hash or default
  const hash = window.location.hash.slice(1);
  const fileToLoad = hash || defaultFile;
  loadFile(fileToLoad);
});

// Service Worker for offline support (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Uncomment to enable offline support
    // navigator.serviceWorker.register('/sw.js');
  });
}

console.log('🚀 MyCluster Documentation loaded successfully!');
