import { lessons } from './data.js';

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────
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
  const cards = document.querySelectorAll('.card-wrapper');

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

    // Attach next-insight handler (new: look for .next-insight-btn inside wrapper)
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
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.lessonId, 10);
      if (overlayPhase === 'closed' || overlayPhase === 'exiting') {
        openLesson(id);
      } else if (overlayPhase === 'open') {
        closeOverlay();
      }
    });
  });

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

  // ── Auto-open from URL ─────────────────────────────────────────────
  const urlLessonId = getLessonFromUrl();
  if (urlLessonId) {
    // Small delay so page is visible first
    setTimeout(() => openLesson(urlLessonId), 100);
  }

})();
