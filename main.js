import { lessons } from './data.js';

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────
  const PAGE_SIZE = 10;
  let currentPage = 1;
  let sortOrder = 'desc'; // 'asc' | 'desc'
  let activeLessonId = null;
  let overlayPhase = 'closed'; // 'closed' | 'entering' | 'open' | 'exiting'

  // ── DOM refs ──────────────────────────────────────────────────────
  const overlay = document.getElementById('overlay');
  const overlayCard = document.getElementById('overlay-card');
  const overlayContent = document.getElementById('overlay-content');
  const overlayBadge = document.getElementById('overlay-badge');
  const overlayIcon = document.getElementById('overlay-icon');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySubtitle = document.getElementById('overlay-subtitle');
  const closeBtn = document.getElementById('overlay-close');
  const cardsGrid = document.getElementById('cards-grid');
  const sortBtns = document.querySelectorAll('.sort-btn');
  const pageInfo = document.getElementById('page-info');
  const pageNumbers = document.getElementById('page-numbers');
  const pagePrev = document.getElementById('page-prev');
  const pageNext = document.getElementById('page-next');

  // ── Helpers ───────────────────────────────────────────────────────
  function getSortedLessons() {
    return [...lessons].sort((a, b) => {
      if (sortOrder === 'asc') return a.day - b.day;
      return b.day - a.day;
    });
  }

  function getTotalPages() {
    return Math.ceil(lessons.length / PAGE_SIZE);
  }

  function getPageRange(page) {
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, lessons.length);
    return `${start} – ${end} von ${lessons.length}`;
  }

  // ── Build card HTML ────────────────────────────────────────────────
  function buildCard(lesson) {
    return `<div class="card-wrapper" data-lesson-id="${lesson.id}">
      <div class="card-inner">
        <div class="card-face card-front">
          <div class="card-back-design">
            <span class="lesson-badge">Lektion ${lesson.day}</span>
            <span class="card-icon">${lesson.icon}</span>
            <h2 class="card-title">${lesson.title}</h2>
            <p class="card-subtitle">${lesson.subtitle}</p>
            <span class="flip-hint">Tippe zum Öffnen</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ── Render ─────────────────────────────────────────────────────────
  function renderPage() {
    const sorted = getSortedLessons();
    const start = (currentPage - 1) * PAGE_SIZE;
    const page = sorted.slice(start, start + PAGE_SIZE);

    cardsGrid.innerHTML = page.map(buildCard).join('');

    // Rebind card interactions (click + touch)
    cardsGrid.querySelectorAll('.card-wrapper').forEach(card => {
      const openOnInteraction = (e) => {
        e.preventDefault();
        const id = parseInt(card.dataset.lessonId, 10);
        if (overlayPhase === 'closed' || overlayPhase === 'exiting') {
          openLesson(id);
        } else if (overlayPhase === 'open') {
          closeOverlay();
        }
      };

      card.addEventListener('touchstart', openOnInteraction, { passive: false });
      card.addEventListener('click', openOnInteraction);
    });

    // Page info
    pageInfo.textContent = getPageRange(currentPage);

    // Prev/Next buttons
    pagePrev.disabled = currentPage === 1;
    pageNext.disabled = currentPage === getTotalPages();

    // Page number buttons (show window of up to 5)
    const total = getTotalPages();
    pageNumbers.innerHTML = '';
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(total, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.className = 'page-num-btn' + (i === currentPage ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => {
        currentPage = i;
        renderPage();
      });
      pageNumbers.appendChild(btn);
    }
  }

  // ── Sort ───────────────────────────────────────────────────────────
  sortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sortOrder = btn.dataset.sort;
      sortBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPage = 1;
      renderPage();
    });
  });

  // ── Pagination nav ─────────────────────────────────────────────────
  pagePrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  });

  pageNext.addEventListener('click', () => {
    if (currentPage < getTotalPages()) {
      currentPage++;
      renderPage();
    }
  });

  // ── URL helpers ──────────────────────────────────────────────────
  function setLessonUrl(lessonId) {
    const url = new URL(window.location.href);
    url.searchParams.set('open', lessonId);
    history.pushState({ lessonId }, '', url.toString());
  }

  function clearLessonUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete('open');
    history.pushState({}, '', url.toString());
  }

  function getLessonFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('open'), 10);
    return lessons.find(l => l.id === id) ? id : null;
  }

  // ── Open overlay ──────────────────────────────────────────────────
  function openLesson(lessonId) {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    activeLessonId = lessonId;

    // Populate content
    overlayBadge.textContent = `Lektion ${lesson.day}`;
    overlayIcon.textContent = lesson.icon;
    overlayTitle.textContent = lesson.title;
    overlaySubtitle.textContent = lesson.subtitle;
    overlayContent.innerHTML = lesson.content;

    // Attach next-insight handler
    const nextBtn = overlayContent.querySelector('.next-insight-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', function (e) {
        e.preventDefault();
        const nextId = parseInt(this.dataset.next, 10);
        if (nextId && nextId <= lessons.length) {
          overlayCard.className = 'overlay-card card-exiting';
          overlay.classList.remove('overlay-visible');
          overlayPhase = 'exiting';
          setLessonUrl(nextId);
          setTimeout(() => {
            openLesson(nextId);
          }, 520);
        }
      });
    }

    // Lock scroll
    document.body.style.overflow = 'hidden';

    // Update URL
    setLessonUrl(lessonId);

    // Start enter animation
    overlayCard.className = 'overlay-card card-entering';
    overlay.classList.add('overlay-visible');
    overlayPhase = 'entering';

    setTimeout(() => {
      overlayCard.className = 'overlay-card card-open';
      overlayPhase = 'open';
    }, 650);
  }

  // ── Close overlay ─────────────────────────────────────────────────
  function closeOverlay() {
    if (overlayPhase === 'closed' || overlayPhase === 'exiting') return;

    overlayPhase = 'exiting';
    overlayCard.className = 'overlay-card card-exiting';
    overlay.classList.remove('overlay-visible');

    setTimeout(() => {
      activeLessonId = null;
      overlayPhase = 'closed';
      overlayCard.className = 'overlay-card';
      document.body.style.overflow = '';
      clearLessonUrl();
    }, 520);
  }

  // ── Event listeners ────────────────────────────────────────────────
  closeBtn.addEventListener('click', closeOverlay);

  // Click outside card to close
  overlay.addEventListener('click', e => {
    if (e.target === overlay && overlayPhase === 'open') {
      closeOverlay();
    }
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlayPhase === 'open') {
      closeOverlay();
    }
  });

  // Browser back/forward
  window.addEventListener('popstate', e => {
    if (e.state && e.state.lessonId) {
      if (overlayPhase === 'open' || overlayPhase === 'entering') {
        closeOverlay();
        setTimeout(() => openLesson(e.state.lessonId), 550);
      } else {
        openLesson(e.state.lessonId);
      }
    } else {
      if (overlayPhase === 'open') closeOverlay();
    }
  });

  // ── Initial render ─────────────────────────────────────────────────
  renderPage();

  // ── Auto-open from URL ─────────────────────────────────────────────
  const urlLessonId = getLessonFromUrl();
  if (urlLessonId) {
    setTimeout(() => openLesson(urlLessonId), 100);
  }

})();