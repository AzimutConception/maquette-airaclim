gsap.registerPlugin(ScrollTrigger);

/* ============ Config ============ */
const FRAME_COUNT = 97;
const FRAME_SPEED = 2.0;
const IMAGE_SCALE = 0.72;
const framePath = (i) => `frames/frame_${String(i).padStart(4, "0")}.webp`;

/* ============ DOM refs ============ */
const loader = document.getElementById("loader");
const loaderBar = document.getElementById("loader-bar");
const loaderPercent = document.getElementById("loader-percent");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const canvasWrap = document.getElementById("canvasWrap");
const darkOverlay = document.getElementById("dark-overlay");
const heroSection = document.getElementById("hero");
const scrollContainer = document.getElementById("scroll-container");
const sections = document.querySelectorAll(".scroll-section");

/* ============ Lenis smooth scroll ============ */
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ============ Canvas sizing ============ */
let bgColor = "#d9cfbf";
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", () => {
  resizeCanvas();
  if (currentFrame != null) drawFrame(currentFrame);
});
resizeCanvas();

function sampleBgColor(img) {
  const s = document.createElement("canvas");
  s.width = 8; s.height = 8;
  const sctx = s.getContext("2d");
  sctx.drawImage(img, 0, 0, 8, 8);
  const d = sctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
}

let currentFrame = null;
function drawFrame(index) {
  const img = frames[index];
  if (!img) return;
  const cw = window.innerWidth, ch = window.innerHeight;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
  if (index % 20 === 0) bgColor = sampleBgColor(img);
}

/* ============ Frame preload (two-phase) ============ */
const frames = new Array(FRAME_COUNT);
let loadedCount = 0;

function updateLoaderProgress() {
  const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
  loaderBar.style.width = pct + "%";
  loaderPercent.textContent = pct + "%";
  if (loadedCount >= FRAME_COUNT) onAllFramesLoaded();
}

function loadFrame(i) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      frames[i] = img;
      loadedCount++;
      updateLoaderProgress();
      resolve();
    };
    img.onerror = () => { loadedCount++; updateLoaderProgress(); resolve(); };
    img.src = framePath(i + 1);
  });
}

async function preloadFrames() {
  const firstBatch = Math.min(10, FRAME_COUNT);
  const first = [];
  for (let i = 0; i < firstBatch; i++) first.push(loadFrame(i));
  await Promise.all(first);
  drawFrame(0);
  currentFrame = 0;

  const rest = [];
  for (let i = firstBatch; i < FRAME_COUNT; i++) rest.push(loadFrame(i));
  await Promise.all(rest);
}

function onAllFramesLoaded() {
  loader.classList.add("is-hidden");
  document.body.classList.add("loaded");
  playHeroIntro();
  initScroll();
}

preloadFrames();

/* ============ Hero intro (staggered load-in) ============ */
function playHeroIntro() {
  const tl = gsap.timeline({ delay: 0.2 });
  tl.to(".hero-label", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0)
    .from(".hero-label", { opacity: 0, y: 14 }, 0)
    .to(".hero-heading .word", { y: 0, duration: 1, ease: "power4.out", stagger: 0.09 }, 0.15)
    .from(".hero-tagline", { opacity: 0, y: 20, duration: 0.9, ease: "power3.out" }, 0.55)
    .to(".hero-tagline", { opacity: 1 }, 0.55)
    .from(".scroll-indicator", { opacity: 0, duration: 0.8 }, 0.85)
    .to(".scroll-indicator", { opacity: 1 }, 0.85);
}
gsap.set(".hero-tagline", { opacity: 0 });
gsap.set(".scroll-indicator", { opacity: 0 });
gsap.set(".hero-label", { opacity: 0 });

/* ============ Section animation system ============ */
const sectionConfigs = [];

sections.forEach((section) => {
  const type = section.dataset.animation;
  const persist = section.dataset.persist === "true";
  const enter = parseFloat(section.dataset.enter) / 100;
  const leave = parseFloat(section.dataset.leave) / 100;
  const children = section.querySelectorAll(
    ".section-label, .section-heading, .section-body, .cta-button, .stat"
  );

  section.style.top = ((enter + leave) / 2) * 100 + "%";

  const tl = gsap.timeline({ paused: true });
  switch (type) {
    case "fade-up":
      tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" });
      break;
    case "slide-left":
      tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
      break;
    case "slide-right":
      tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" });
      break;
    case "scale-up":
      tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: "power2.out" });
      break;
    case "stagger-up":
      tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" });
      break;
    case "clip-reveal":
      tl.from(children, { clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.15, duration: 1.2, ease: "power4.inOut" });
      break;
  }

  sectionConfigs.push({ section, tl, enter, leave, persist });

  // Trigger play/reverse off the section's own viewport intersection
  // (not the global scroll fraction) so the reveal timing always matches
  // when the box actually becomes visible, regardless of its height.
  ScrollTrigger.create({
    trigger: section,
    start: "top 82%",
    end: "bottom 18%",
    onEnter: () => tl.play(),
    onEnterBack: () => tl.play(),
    onLeave: () => { if (!persist) tl.reverse(); },
    onLeaveBack: () => { if (!persist) tl.reverse(); },
  });
});

/* ============ Counter animations ============ */
document.querySelectorAll(".stat-number").forEach((el) => {
  const target = parseFloat(el.dataset.value);
  const decimals = parseInt(el.dataset.decimals || "0");
  gsap.set(el, { textContent: 0 });
  ScrollTrigger.create({
    trigger: el.closest(".scroll-section"),
    start: "top 75%",
    onEnter: () => {
      gsap.to(el, {
        textContent: target,
        duration: 1.8,
        ease: "power1.out",
        snap: { textContent: decimals === 0 ? 1 : 1 / Math.pow(10, decimals) },
        onUpdate: function () {
          el.textContent = decimals === 0
            ? Math.round(el.textContent)
            : parseFloat(el.textContent).toFixed(decimals);
        }
      });
    },
    once: false,
    toggleActions: "play none none reverse"
  });
});

/* ============ Dark overlay ============ */
function updateDarkOverlay(p) {
  const enter = 0.58, leave = 1.0, fadeRange = 0.04;
  let opacity = 0;
  if (p >= enter - fadeRange && p <= enter) opacity = (p - (enter - fadeRange)) / fadeRange;
  else if (p > enter && p <= leave) opacity = 0.9;
  darkOverlay.style.opacity = opacity;
}

/* ============ Hero / circle-wipe transition ============ */
function updateHeroTransition(p) {
  heroSection.style.opacity = Math.max(0, 1 - p * 15);
  heroSection.style.pointerEvents = p > 0.02 ? "none" : "auto";
  const wipeProgress = Math.min(1, Math.max(0, (p - 0.01) / 0.06));
  const radius = wipeProgress * 75;
  canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;
}

/* ============ Master scroll binding ============ */
function initScroll() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      const accelerated = Math.min(p * FRAME_SPEED, 1);
      const index = Math.min(Math.floor(accelerated * (FRAME_COUNT - 1)), FRAME_COUNT - 1);
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }

      updateHeroTransition(p);
      updateDarkOverlay(p);
    }
  });

  ScrollTrigger.refresh();
}

/* ============ Nav smooth-scroll ============ */
document.querySelectorAll(".nav-links a[data-target]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const target = parseFloat(a.dataset.target) / 100;
    const y = heroSection.offsetHeight + target * scrollContainer.offsetHeight;
    lenis.scrollTo(y, { duration: 1.4 });
  });
});

/* Anchor links (FAQ, Devis) — scroll straight to the element, since these
   sections sit after the scroll-container in normal document flow. */
document.querySelectorAll("[data-anchor]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.getElementById(a.dataset.anchor);
    if (target) lenis.scrollTo(target, { duration: 1.4, offset: -90 });
  });
});

/* ============ FAQ accordion ============ */
document.querySelectorAll(".faq-item").forEach((item) => {
  const button = item.querySelector(".faq-question");
  button.addEventListener("click", () => {
    const isOpen = item.classList.toggle("is-open");
    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
});

/* ============ Quote form ============ */
const quoteForm = document.getElementById("quoteForm");
if (quoteForm) {
  const quoteSuccess = document.getElementById("quoteSuccess");
  quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!quoteForm.reportValidity()) return;
    // No backend is wired up yet — this simply confirms receipt client-side.
    // Connect to a form service (e.g. Formspree, EmailJS) or your own
    // endpoint to actually deliver submissions.
    quoteSuccess.classList.add("is-visible");
    quoteForm.reset();
  });
}
