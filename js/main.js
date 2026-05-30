/* ═══════════════════════════════════════════
   TENTACLES Archive — Main Application
   Navigation, Filtering, Lazy Loading
   ═══════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Lazy Loading Images ──
  function initLazyImages() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    if ('loading' in HTMLImageElement.prototype) {
      images.forEach(img => {
        if (img.complete) img.classList.add('loaded');
        else img.addEventListener('load', () => img.classList.add('loaded'));
        if (img.error) img.classList.add('loaded');
      });
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) img.src = img.dataset.src;
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      });
      images.forEach(img => observer.observe(img));
    }
  }

  // ── Mobile Navigation ──
  function initNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Archive Filtering ──
  let archiveData = [];
  let activeFilters = { year: null, type: null, search: '' };

  async function loadArchiveData() {
    try {
      const resp = await fetch('/tentaclesgallery-archive/data/archive.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      archiveData = await resp.json();
      renderFilters();
      applyFilters();
    } catch (e) {
      console.warn('Archive data not found:', e.message);
      const cards = document.querySelectorAll('.archive-card');
      archiveData = Array.from(cards).map(card => ({
        title: card.querySelector('.card-title')?.textContent || '',
        type: card.dataset.type || 'page',
        year: card.dataset.year || '',
        path: card.querySelector('a')?.getAttribute('href') || '',
        image: card.querySelector('img')?.getAttribute('src') || '',
        excerpt: card.querySelector('.card-excerpt')?.textContent || ''
      }));
      renderFilters();
    }
  }

  function createFilterBtn(label, filter, value) {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (value === null ? ' active' : '');
    btn.textContent = label;
    btn.dataset.filter = filter;
    btn.dataset.value = value;
    return btn;
  }

  function renderFilters() {
    const bar = document.querySelector('.filter-bar');
    if (!bar || !archiveData.length) return;

    const years = [...new Set(archiveData.map(d => d.year).filter(Boolean))].sort().reverse();
    const types = [...new Set(archiveData.map(d => d.type).filter(Boolean))];

    const yearContainer = bar.querySelector('.filter-years');
    const typeContainer = bar.querySelector('.filter-types');
    const searchInput = bar.querySelector('.filter-search');
    const countEl = bar.querySelector('.filter-count');

    if (yearContainer) {
      yearContainer.innerHTML = '<span class="filter-label">Year</span>';
      yearContainer.appendChild(createFilterBtn('All Years', 'year', null));
      years.forEach(y => yearContainer.appendChild(createFilterBtn(y, 'year', y)));
    }
    if (typeContainer) {
      typeContainer.innerHTML = '<span class="filter-label">Type</span>';
      typeContainer.appendChild(createFilterBtn('All Types', 'type', null));
      types.forEach(t => typeContainer.appendChild(createFilterBtn(capitalize(t), 'type', t)));
    }
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeFilters.search = e.target.value.toLowerCase().trim();
        applyFilters();
      });
    }
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      const siblings = btn.parentElement.querySelectorAll('.filter-btn');
      siblings.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      activeFilters[btn.dataset.filter] = btn.dataset.value === 'null' ? null : btn.dataset.value;
      applyFilters();
    });
  }

  function applyFilters() {
    const grid = document.querySelector('.archive-grid');
    const countEl = document.querySelector('.filter-count');
    if (!grid) return;

    const filtered = archiveData.filter(item => {
      if (activeFilters.year && item.year !== activeFilters.year) return false;
      if (activeFilters.type && item.type !== activeFilters.type) return false;
      if (activeFilters.search) {
        const s = activeFilters.search;
        const title = (item.title || '').toLowerCase();
        const excerpt = (item.excerpt || '').toLowerCase();
        const type = (item.type || '').toLowerCase();
        if (!title.includes(s) && !excerpt.includes(s) && !type.includes(s)) return false;
      }
      return true;
    });

    const cards = grid.querySelectorAll('.archive-card');
    let visible = 0;
    cards.forEach(card => {
      const path = card.dataset.path || '';
      const matches = filtered.some(f => f.path === path);
      card.style.display = matches ? '' : 'none';
      if (matches) visible++;
    });

    if (countEl) countEl.textContent = `${visible} of ${archiveData.length} items`;

    let noResults = grid.querySelector('.no-results');
    if (visible === 0 && archiveData.length > 0) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'no-results';
        grid.appendChild(noResults);
      }
      noResults.innerHTML = `<p>No items match your filters. Try adjusting your search.</p>`;
      noResults.style.display = '';
    } else if (noResults) {
      noResults.style.display = 'none';
    }
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  // ── Keyboard Shortcuts ──
  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const nav = document.querySelector('.main-nav.open');
        if (nav) { nav.classList.remove('open'); document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false'); }
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        document.querySelector('.filter-search')?.focus();
      }
    });
  }

  // ── Smooth Scroll ──
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ── Gallery Lightbox ──
  function initGalleryLightbox() {
    document.addEventListener('click', (e) => {
      const img = e.target.closest('.gallery-grid img');
      if (!img) return;
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:1000;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:2rem;';
      const fullImg = document.createElement('img');
      fullImg.src = img.src.replace(/-?\d+x\d+/, '');
      fullImg.style.cssText = 'max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px;';
      overlay.appendChild(fullImg);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    initLazyImages();
    initNavToggle();
    initKeyboardNav();
    initSmoothScroll();
    initGalleryLightbox();
    if (document.querySelector('.archive-grid')) loadArchiveData();
  });
})();
