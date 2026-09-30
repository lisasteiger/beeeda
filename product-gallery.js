const gallery = document.getElementById("product-gallery");

if (gallery) {
  const slides = [...gallery.querySelectorAll(".gallery-slide")];
  const dots = [...gallery.querySelectorAll(".gallery-dot")];
  let current = 0;
  let start;
  let lastSwipe = 0;
  let timer;

  function show(index, manual = false) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => { slide.hidden = position !== current; });
    dots.forEach((dot, position) => { dot.setAttribute("aria-pressed", String(position === current)); });
    if (manual) restartTimer();
  }

  function restartTimer() {
    clearInterval(timer);
    timer = setInterval(() => show(current + 1), 5000);
  }

  dots.forEach((dot, index) => dot.addEventListener("click", event => {
    event.stopPropagation();
    show(index, true);
  }));
  gallery.addEventListener("click", event => {
    if (Date.now() - lastSwipe < 400 || event.target.closest(".gallery-dots")) return;
    const { left, width } = gallery.getBoundingClientRect();
    show(current + (event.clientX < left + width / 2 ? -1 : 1), true);
  });
  gallery.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    show(current + (event.key === "ArrowRight" ? 1 : -1), true);
  });
  gallery.addEventListener("touchstart", event => {
    if (event.touches.length === 1) start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  gallery.addEventListener("touchend", event => {
    if (!start || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      event.preventDefault();
      lastSwipe = Date.now();
      show(current + (dx < 0 ? 1 : -1), true);
    }
    start = undefined;
  });
  gallery.addEventListener("touchcancel", () => { start = undefined; });
  if (slides.length > 1) restartTimer();
}
