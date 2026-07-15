import { lessons } from './data.js';

(function () {
  'use strict';

  const PAGE_SIZE = 10;
  let currentPage = 1;
  let sortOrder = 'desc';
  let touchOpened = false; // guard against synthetic click after touchstart

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

  // ── Helpers ─────────────────────────────────────────────────────────
  function getSortedLessons() {
    return [...lessons].sort((a, b) =>
      sortOrder === 'asc' ? a.day - b.day : b.day - a.day
    );
  }

  function getTotalPages() {
    return Math.ceil(lessons.length / PAGE_SIZE);
  }

  function getPageRange(page) {
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, lessons.length);
    return `${start} – ${end} von ${lessons.length}`;
  }

  // ── Open / Close — magic growth animation ───────────────────────
  function openLesson(lessonId) {
    const lesson = lessons.find(l => l.day === lessonId);
    if (!lesson) return;

    overlayBadge.textContent = `Lektion ${lesson.day}`;
    overlayIcon.textContent = lesson.icon;
    overlayTitle.textContent = lesson.title;
    overlaySubtitle.textContent = lesson.subtitle;
    overlayContent.innerHTML = lesson.content;

    // Next lesson button
    const nextBtn = overlayContent.querySelector('.next-insight-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', e => {
        e.preventDefault();
        const nextId = parseInt(nextBtn.dataset.next, 10);
        if (nextId && nextId <= lessons.length) openLesson(nextId);
      });
    }

    overlay.style.display = 'flex';
    overlayCard.style.animation = 'none';
    overlayCard.offsetHeight; // force reflow to restart animation
    overlayCard.style.animation = 'overlayGrowthOpen 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
    setLessonUrl(lessonId);
  }

  function closeOverlay() {
    overlayCard.style.animation = 'overlayGrowthClose 0.4s ease-in forwards';
    overlayCard.addEventListener('animationend', () => {
      overlay.style.display = 'none';
      overlayCard.style.animation = 'none';
      clearLessonUrl();
    }, { once: true });
  }

  // ── Card interaction ────────────────────────────────────────────────
  function handleCardClick(lessonId, fromTouch) {
    if (overlay.style.display === 'flex') {
      closeOverlay();
    } else {
      if (fromTouch) touchOpened = true;
      openLesson(lessonId);
    }
  }

  // ── Build card HTML ────────────────────────────────────────────────
  function buildCard(lesson) {
    return `<div class="card-wrapper" data-lesson-id="${lesson.day}">
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

    // Attach events
    cardsGrid.querySelectorAll('.card-wrapper').forEach(card => {
      const id = parseInt(card.dataset.lessonId, 10);

      // Touch — only opens card if it's a tap (finger didn't move far)
      let touchStartX = 0;
      let touchStartY = 0;

      card.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchOpened = false; // reset for this touch
      }, { passive: true });

      card.addEventListener('touchend', function (e) {
        const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
        const isTap = dx < 10 && dy < 10;
        if (isTap) {
          e.preventDefault();
          touchOpened = true;
          handleCardClick(id, true);
        }
      }, { passive: false });

      // Click — on touch devices, ignore if touchstart already opened it
      card.addEventListener('click', function (e) {
        e.stopPropagation();
        if (touchOpened) {
          touchOpened = false;
          return;
        }
        handleCardClick(id, false);
      });
    });

    pageInfo.textContent = getPageRange(currentPage);
    pagePrev.disabled = currentPage === 1;
    pageNext.disabled = currentPage === getTotalPages();

    const total = getTotalPages();
    pageNumbers.innerHTML = '';
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(total, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.className = 'page-num-btn' + (i === currentPage ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => { currentPage = i; renderPage(); });
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

  // ── Pagination ─────────────────────────────────────────────────────
  pagePrev.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderPage(); }
  });
  pageNext.addEventListener('click', () => {
    if (currentPage < getTotalPages()) { currentPage++; renderPage(); }
  });

  // ── Close overlay ──────────────────────────────────────────────────
  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeOverlay();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') closeOverlay();
  });

  // ── URL helpers ───────────────────────────────────────────────────
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
    return lessons.find(l => l.day === id) ? id : null;
  }

  // ── Popstate ───────────────────────────────────────────────────────
  window.addEventListener('popstate', e => {
    if (e.state && e.state.lessonId) {
      if (overlay.style.display === 'flex') {
        closeOverlay();
        setTimeout(() => openLesson(e.state.lessonId), 50);
      } else {
        openLesson(e.state.lessonId);
      }
    } else {
      if (overlay.style.display === 'flex') closeOverlay();
    }
  });

  // ── Init ───────────────────────────────────────────────────────────
  overlay.style.display = 'none';
  renderPage();

  const urlLessonId = getLessonFromUrl();
  if (urlLessonId) openLesson(urlLessonId);
})();
