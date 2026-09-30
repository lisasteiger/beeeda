const carousel = document.getElementById("carousel");
const items = [...document.querySelectorAll(".item")];
const itemCount = items.length;

// Bewegungswerte des Carousels.
const spacing = () => window.matchMedia("(max-width: 700px)").matches
  ? Math.min(window.innerWidth * 0.78, 340)
  : 700;
const depth = 180;
const scaleAmount = 0.27;
const smoothness = 0.1;
const wheelSensitivity = () => window.matchMedia("(max-width: 700px)").matches ? 0.006 : 0.0025;

let position = 0;
let target = 0;
let animationFrame = null;
let touchStartX = 0;
let touchStartY = 0;
let touchStartPosition = 0;
let touchMoved = false;
let pressedPointer = null;
let pointerStartX = 0;
let pointerStartTarget = 0;
let snapTimer;
let leaving = false;

// Der Browser stellt die Startseite beim Zurückgehen oft aus dem Cache wieder her.
window.addEventListener("pageshow", () => {
  leaving = false;
  touchMoved = false;
  pressedPointer = null;
  document.body.classList.remove("leaving-to-subsite");
});

// Die Startposition für die Rückkehr wird bereits vor dem CSS gesetzt.
if (carousel && new URLSearchParams(window.location.search).has("back")) {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove("returning-from-subsite");
    window.history.replaceState({}, document.title, window.location.pathname);
  });
}

function wrap(value, length) {
  let result = ((value % length) + length) % length;
  return result > length / 2 ? result - length : result;
}

function render() {
  items.forEach((item, index) => {
    const offset = wrap(index - position, itemCount);
    const distance = Math.abs(offset);
    const limitedDistance = Math.min(distance, 4);

    item.style.transform = `translate(-50%, -50%)
      translate3d(${offset * spacing()}px, 0, ${-limitedDistance * depth}px)
      scale(${1 - limitedDistance * scaleAmount})`;
    item.style.opacity = 1 - limitedDistance * 0.15;
    item.style.filter = `blur(${Math.min(distance, 3) * 1.2}px)`;
    item.style.zIndex = 1000 - Math.round(distance * 10);
  });
}

function animate() {
  animationFrame = null;
  const nextPosition = position + (target - position) * smoothness;

  // Erst pausieren, wenn die ursprüngliche Berechnung nichts mehr verändert.
  if (nextPosition === position) return;
  position = nextPosition;
  render();
  startAnimation();
}

function startAnimation() {
  if (animationFrame === null && itemCount > 0) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function snap() {
  target = Math.round(target);
  startAnimation();
}

function stopAnimation() {
  clearTimeout(snapTimer);
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  target = position;
}

if (carousel) {
  // Beim Drücken bleibt das Bild bis zum Loslassen unter dem Zeiger.
  carousel.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    touchMoved = false;
    if (!event.target.closest(".image-link")) return;
    pressedPointer = event.pointerId;
    pointerStartX = event.clientX;
    stopAnimation();
    pointerStartTarget = target;
  });

  window.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pressedPointer || event.pointerType !== "mouse") return;
    const deltaX = pointerStartX - event.clientX;
    if (Math.abs(deltaX) > 8) touchMoved = true;
    if (!touchMoved) return;
    target = pointerStartTarget + deltaX / (window.innerWidth <= 700 ? 160 : spacing());
    startAnimation();
  });

  const releasePointer = (event) => {
    if (event.pointerId === pressedPointer) {
      pressedPointer = null;
      if (touchMoved && event.pointerType === "mouse") snap();
    }
  };
  window.addEventListener("pointerup", releasePointer);
  window.addEventListener("pointercancel", releasePointer);
  window.addEventListener("blur", () => { pressedPointer = null; });

  // Maus und Trackpad: Bewegung und verzögertes Einrasten gemeinsam behandeln.
  carousel.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (pressedPointer !== null) return;
    const scroll = Math.abs(event.deltaX) < 0.01 ? event.deltaY : event.deltaX;
    target += scroll * wheelSensitivity();
    startAnimation();
    clearTimeout(snapTimer);
    snapTimer = setTimeout(snap, 120);
  }, { passive: false });

  carousel.addEventListener("touchstart", (event) => {
    stopAnimation();
    touchMoved = false;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartPosition = target;
  }, { passive: true });

  carousel.addEventListener("touchmove", (event) => {
    const deltaX = touchStartX - event.touches[0].clientX;
    const deltaY = touchStartY - event.touches[0].clientY;
    // Kleine Fingerbewegungen bleiben ein Tippen, kein Wischen.
    if (Math.hypot(deltaX, deltaY) > 8) touchMoved = true;
    if (!touchMoved) return;
    event.preventDefault();
    target = touchStartPosition + deltaX / (window.innerWidth <= 700 ? 160 : spacing());
    startAnimation();
  }, { passive: false });

  carousel.addEventListener("touchend", () => {
    if (touchMoved) snap();
  });

  carousel.addEventListener("touchcancel", () => {
    touchMoved = false;
    pressedPointer = null;
    snap();
  });

  // Ein Wisch darf keinen Produktlink öffnen. Echte Klicks starten den Übergang.
  carousel.addEventListener("click", (event) => {
    const link = event.target.closest(".image-link");
    if (touchMoved && event.detail !== 0 && link) {
      event.preventDefault();
      touchMoved = false;
      return;
    }
    touchMoved = false;
    if (!link || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    stopAnimation();
    document.body.classList.add("leaving-to-subsite");
    setTimeout(() => { window.location.href = link.href; }, 900);
  });
}

render();
window.addEventListener("resize", render);
