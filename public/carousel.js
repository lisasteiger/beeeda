export function initCarousel(carousel, selectedId) {
  const lifecycle = new AbortController();
  const on = (element, type, handler, options = {}) => element.addEventListener(type, handler, { ...options, signal: lifecycle.signal });
  const soldLabel = carousel.querySelector("#carousel-sold");
  const reducedLabel = carousel.querySelector("#carousel-reduced");
  const items = [...carousel.querySelectorAll(".item")];
  const sizes = [...carousel.querySelectorAll(".carousel-size")];
  // Keep the shuffled order during live stock updates; a reload creates fresh ranks.
  const shuffled = items.map((item, index) => ({ item, size: sizes[index], rank: Number(item.dataset.shuffleRank ??= Math.random()) }))
    .sort((a, b) => a.rank - b.rank);
  items.splice(0, items.length, ...shuffled.map(entry => entry.item));
  sizes.splice(0, sizes.length, ...shuffled.map(entry => entry.size));
  const itemCount = items.length;
  const ids = items.map(item => item.dataset.productId);
  const storage = key => key === 'beeeda.carousel-start' ? localStorage : sessionStorage;
  const readSaved = key => { try { return storage(key).getItem(key); } catch { return null; } };
  const save = (key, value) => { try { storage(key).setItem(key, value); } catch {} };
  const query = new URLSearchParams(window.location.search);
  const preferred = selectedId || query.get('product') || (query.has('back') ? readSaved('beeeda.last-product') : null);
  let initialIndex = ids.indexOf(preferred);
  if (initialIndex < 0 || items[initialIndex].dataset.sold === 'true') {
    const previous = ids.indexOf(readSaved('beeeda.carousel-start'));
    const available = ids.map((_, index) => index).filter(index => items[index].dataset.sold !== 'true');
    const candidates = available.filter(index => available.length < 2 || index !== previous);
    initialIndex = candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
  }
  if (ids[initialIndex]) save('beeeda.carousel-start', ids[initialIndex]);
  // Return parameters are consumed once; a later refresh gets a new starting product.
  if (query.has('back') || query.has('product')) {
    query.delete('back'); query.delete('product');
    const suffix = query.toString();
    window.history.replaceState({}, '', window.location.pathname + (suffix ? '?' + suffix : '') + window.location.hash);
  }
  items.forEach(item => {
    const image = item.querySelector('img');
    if (!image) return;
    const fit = () => { if (image.naturalWidth) item.style.setProperty('--image-fit', image.naturalHeight / image.naturalWidth); };
    fit();
    on(image, 'load', fit);
  });

  // Bewegungswerte des Carousels.
  const spacing = () => window.matchMedia("(max-width: 700px)").matches
    ? Math.min(window.innerWidth * 0.78, 340)
    : 700;
  const depth = 180;
  const scaleAmount = 0.27;
  const responseTime = 75;
  const wheelSensitivity = () => window.matchMedia("(max-width: 700px)").matches ? 0.006 : 0.0035;

  let position = initialIndex;
  let target = initialIndex;
  let animationFrame = null;
  let lastFrameTime = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartPosition = 0;
  let touchMoved = false;
  let pressedPointer = null;
  let pointerStartX = 0;
  let pointerStartTarget = 0;
  let snapTimer;
  let navigationTimer;

  // Der Browser stellt die Startseite beim Zurückgehen oft aus dem Cache wieder her.
  on(window, "pageshow", (event) => {
    clearTimeout(navigationTimer);
    touchMoved = false;
    pressedPointer = null;
    document.body.classList.remove("leaving-to-subsite");
    if (event.persisted) {
      const index = ids.indexOf(readSaved('beeeda.last-product'));
      if (index >= 0) { position = target = index; render(); }
    }
  });

  function wrap(value, length) {
    let result = ((value % length) + length) % length;
    return result > length / 2 ? result - length : result;
  }

  function render() {
    if (!itemCount) return;
    const itemSpacing = spacing();
    carousel.dataset.currentProduct = ids[((Math.round(position) % itemCount) + itemCount) % itemCount];
    let soldOpacity = 0;
    let reducedOpacity = 0;
    items.forEach((item, index) => {
      const offset = wrap(index - position, itemCount);
      const distance = Math.abs(offset);
      const size = sizes[index];
      if (size) {
        size.style.opacity = Math.max(0, 1 - distance / 0.2);
        size.hidden = distance >= 0.2;
      }
      if (item.dataset.sold === 'true') soldOpacity = Math.max(soldOpacity, Math.max(0, Math.min(1, (0.55 - distance) / 0.15)));
      else if (item.dataset.reduced === 'true') reducedOpacity = Math.max(reducedOpacity, Math.max(0, Math.min(1, (0.55 - distance) / 0.15)));
      const limitedDistance = Math.min(distance, 4);

      item.style.transform = `translate(-50%, -50%)
        translate3d(${offset * itemSpacing}px, 0, ${-limitedDistance * depth}px)
        scale(${Math.max(0.15, 1 - limitedDistance * scaleAmount)})`;
      item.style.opacity = 1 - limitedDistance * 0.15;
      item.style.zIndex = 1000 - Math.round(distance * 10);
    });
    // The label stays in the screen centre; only its opacity follows the products.
    if (soldLabel) soldLabel.style.opacity = soldOpacity;
    if (reducedLabel) reducedLabel.style.opacity = reducedOpacity;
  }

  function animate(timestamp) {
    animationFrame = null;
    const elapsed = lastFrameTime === null ? 1000 / 60 : Math.min(timestamp - lastFrameTime, 50);
    lastFrameTime = timestamp;
    const smoothness = 1 - Math.exp(-elapsed / responseTime);
    const nextPosition = position + (target - position) * smoothness;

    // Die Bewegung endet exakt auf dem ausgewählten Produkt.
    if (Math.abs(target - position) < 0.001) { position = target; render(); return; }
    position = nextPosition;
    render();
    animationFrame = requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (animationFrame === null && itemCount > 0) {
      lastFrameTime = null;
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function snap() {
    target = Math.round(target);
    startAnimation();
  }

  if (carousel) {
    // A press alone must not stop the carousel's existing movement.
    on(carousel, "pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      touchMoved = false;
      if (!event.target.closest(".image-link")) return;
      pressedPointer = event.pointerId;
      pointerStartX = event.clientX;
      pointerStartTarget = position;
    });

    on(window, "pointermove", (event) => {
      if (event.pointerId !== pressedPointer || event.pointerType !== "mouse") return;
      const deltaX = pointerStartX - event.clientX;
      if (Math.abs(deltaX) > 8) touchMoved = true;
      if (!touchMoved) return;
      clearTimeout(snapTimer);
      target = pointerStartTarget + deltaX / (window.innerWidth <= 700 ? 160 : spacing());
      startAnimation();
    });

    const releasePointer = (event) => {
      if (event.pointerId === pressedPointer) {
        pressedPointer = null;
        if (touchMoved && event.pointerType === "mouse") snap();
      }
    };
    on(window, "pointerup", releasePointer);
    on(window, "pointercancel", releasePointer);
    on(window, "blur", () => { pressedPointer = null; });

    // Maus und Trackpad: Bewegung und verzögertes Einrasten gemeinsam behandeln.
    on(carousel, "wheel", (event) => {
      event.preventDefault();
      if (pressedPointer !== null) return;
      const scroll = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerWidth : 1;
      target += scroll * unit * wheelSensitivity();
      startAnimation();
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snap, 120);
    }, { passive: false });

    on(carousel, "touchstart", (event) => {
      touchMoved = false;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      touchStartPosition = position;
    }, { passive: true });

    on(carousel, "touchmove", (event) => {
      const deltaX = touchStartX - event.touches[0].clientX;
      const deltaY = touchStartY - event.touches[0].clientY;
      // Kleine Fingerbewegungen bleiben ein Tippen, kein Wischen.
      if (Math.hypot(deltaX, deltaY) > 8) touchMoved = true;
      if (!touchMoved) return;
      clearTimeout(snapTimer);
      event.preventDefault();
      target = touchStartPosition + deltaX / (window.innerWidth <= 700 ? 160 : spacing());
      startAnimation();
    }, { passive: false });

    on(carousel, "touchend", () => {
      if (touchMoved) snap();
    });

    on(carousel, "touchcancel", () => {
      touchMoved = false;
      pressedPointer = null;
      snap();
    });

    // Ein Wisch darf keinen Produktlink öffnen. Echte Klicks starten den Übergang.
    on(carousel, "keydown", (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      target = Math.round(target) + (event.key === 'ArrowRight' ? 1 : -1);
      startAnimation();
    });
    on(carousel, "click", (event) => {
      const link = event.target.closest(".image-link");
      if (touchMoved && event.detail !== 0 && link) {
        event.preventDefault();
        touchMoved = false;
        return;
      }
      touchMoved = false;
      if (!link || !link.href || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      clearTimeout(navigationTimer);
      document.body.classList.add("leaving-to-subsite");
      navigationTimer = setTimeout(() => { window.location.href = link.href; }, 900);
    });
  }

  render();
  on(window, "resize", render);
  return () => {
    lifecycle.abort();
    cancelAnimationFrame(animationFrame);
    clearTimeout(snapTimer);
    clearTimeout(navigationTimer);
  };
}
