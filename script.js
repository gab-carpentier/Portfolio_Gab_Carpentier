// Signature accent: the acid-green dot only appears while hovering a project
// tile, and lags slightly behind the real cursor — a small nod to the
// tracking/sensor logic across Gabriel's installation work.
const dot = document.getElementById('cursorDot');
const tiles = document.querySelectorAll('.project-tile');

let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

window.addEventListener('mousemove', (e) => {
  targetX = e.clientX;
  targetY = e.clientY;
});

function animateDot() {
  currentX += (targetX - currentX) * 0.18;
  currentY += (targetY - currentY) * 0.18;
  dot.style.transform = `translate(${currentX}px, ${currentY}px) translate(-50%, -50%)`;
  requestAnimationFrame(animateDot);
}
animateDot();

tiles.forEach((tile) => {
  const video = tile.querySelector('.tile-video');
  let pendingPlay = null;

  tile.addEventListener('mouseenter', () => {
    dot.classList.add('active');
    if (!video) return;

    // make sure no other tile is still mid-playback competing for resources
    tiles.forEach((other) => {
      if (other === tile) return;
      const otherVideo = other.querySelector('.tile-video');
      if (otherVideo && !otherVideo.paused) {
        otherVideo.pause();
        otherVideo.currentTime = 0;
      }
    });

    pendingPlay = video.play().catch(() => {}); // ignore autoplay rejection edge cases
  });

  tile.addEventListener('mouseleave', () => {
    dot.classList.remove('active');
    if (!video) return;

    // wait for the play() promise to settle before pausing, otherwise a
    // pause() that lands mid-play() throws and can leave playback stuck
    Promise.resolve(pendingPlay).then(() => {
      video.pause();
      video.currentTime = 0;
    });
  });
});

// Nav becomes solid once scrolled past most of the hero
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.7);
});

// Scroll-reveal: fade + rise elements into view as they enter the viewport
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('revealed'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach((el) => observer.observe(el));

// ================= media sliders (galerie projet + archive) =================
function initSliders() {
  document.querySelectorAll('[data-slider]').forEach((slider) => {
    const track = slider.querySelector('.slider-track');
    const slides = Array.from(slider.querySelectorAll('.slide'));
    const prevBtn = slider.querySelector('.slider-arrow.prev');
    const nextBtn = slider.querySelector('.slider-arrow.next');
    const dots = Array.from(slider.querySelectorAll('.slider-dot'));
    const expandBtn = slider.querySelector('.slider-expand');
    let index = 0;

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('active', di === index));
      // pause any video left playing on a slide we're leaving
      slides.forEach((s) => {
        const v = s.querySelector('video');
        if (v) v.pause();
      });
    }

    prevBtn && prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(index - 1); });
    nextBtn && nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(index + 1); });
    dots.forEach((d, di) => d.addEventListener('click', (e) => { e.stopPropagation(); goTo(di); }));
    expandBtn && expandBtn.addEventListener('click', (e) => { e.stopPropagation(); openLightbox(slides, index); });

    if (slides.length > 1) goTo(0);
  });
}

// ================= lightbox (vue plein écran) =================
let lightboxSlides = [];
let lightboxIndex = 0;
const lightbox = document.getElementById('lightbox');
const lightboxContent = lightbox ? lightbox.querySelector('.lightbox-content') : null;

function renderLightbox() {
  if (!lightboxContent) return;
  lightboxContent.innerHTML = '';
  const source = lightboxSlides[lightboxIndex];
  const clone = source.cloneNode(true);
  const video = clone.querySelector('video');
  if (video) {
    video.controls = true;
    video.muted = false;
    video.removeAttribute('autoplay');
  }
  lightboxContent.appendChild(clone);
}

function openLightbox(slides, startIndex) {
  if (!lightbox) return;
  lightboxSlides = slides;
  lightboxIndex = startIndex;
  renderLightbox();
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  if (lightboxContent) lightboxContent.innerHTML = '';
}

function lightboxStep(delta) {
  if (!lightboxSlides.length) return;
  lightboxIndex = (lightboxIndex + delta + lightboxSlides.length) % lightboxSlides.length;
  renderLightbox();
}

if (lightbox) {
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-arrow.prev');
  const nextBtn = lightbox.querySelector('.lightbox-arrow.next');

  closeBtn && closeBtn.addEventListener('click', closeLightbox);
  prevBtn && prevBtn.addEventListener('click', () => lightboxStep(-1));
  nextBtn && nextBtn.addEventListener('click', () => lightboxStep(1));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') lightboxStep(1);
    if (e.key === 'ArrowLeft') lightboxStep(-1);
  });
}

initSliders();

// ================= coverflow carousel (galerie projet) =================
// Positions three visible items in 3D: one large centered item in front,
// and the neighbours scaled down, pushed back and rotated behind it —
// matching the reference animation Gabriel provided.
function initCoverflows() {
  document.querySelectorAll('[data-coverflow]').forEach((cf) => {
    const items = Array.from(cf.querySelectorAll('.cf-item'));
    const prevBtn = cf.querySelector('.slider-arrow.prev');
    const nextBtn = cf.querySelector('.slider-arrow.next');
    const dots = Array.from(cf.querySelectorAll('.slider-dot'));
    const n = items.length;
    let current = 0;

    function layout() {
      items.forEach((item, i) => {
        // shortest signed distance from `current`, wrapping around the ends
        let diff = i - current;
        if (diff > n / 2) diff -= n;
        if (diff < -n / 2) diff += n;

        item.classList.toggle('is-center', diff === 0);

        if (diff === 0) {
          item.style.transform = 'translate(-50%, -50%) translateX(0) scale(1) rotateY(0deg)';
          item.style.opacity = '1';
          item.style.zIndex = '5';
        } else if (Math.abs(diff) === 1) {
          const side = diff > 0 ? 1 : -1;
          item.style.transform = `translate(-50%, -50%) translateX(${side * 62}%) scale(0.76) rotateY(${side * -28}deg)`;
          item.style.opacity = '0.5';
          item.style.zIndex = '3';
        } else {
          const side = diff > 0 ? 1 : -1;
          item.style.transform = `translate(-50%, -50%) translateX(${side * 100}%) scale(0.6) rotateY(${side * -32}deg)`;
          item.style.opacity = '0';
          item.style.zIndex = '1';
        }

        const video = item.querySelector('video');
        if (video && diff !== 0) video.pause();
      });

      dots.forEach((d, di) => d.classList.toggle('active', di === current));
    }

    function goTo(i) {
      current = (i + n) % n;
      layout();
    }

    prevBtn && prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn && nextBtn.addEventListener('click', () => goTo(current + 1));
    dots.forEach((d, di) => d.addEventListener('click', () => goTo(di)));

    items.forEach((item, i) => {
      const expandBtn = item.querySelector('.cf-expand');
      expandBtn && expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(items, i);
      });

      item.addEventListener('click', () => {
        if (i === current) {
          openLightbox(items, current);
        } else {
          goTo(i);
        }
      });
    });

    layout();
  });
}

initCoverflows();
