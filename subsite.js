const backToHome = document.getElementById("backToHome");

if (document.documentElement.classList.contains("pinkchaos-page")) {
  window.scrollTo(0, 0);
  const gallery = document.querySelector(".gallery-secondary");
  if (gallery) {
    const slides = [...gallery.querySelectorAll(".gallery-slide")];
    const dots = [...gallery.querySelectorAll(".gallery-dot")];
    let active = 1;
    const show = (index) => {
      active = index;
      slides.forEach((slide, i) => { slide.hidden = i !== active; });
      dots.forEach((dot, i) => { dot.setAttribute("aria-pressed", String(i === active)); });
    };
    let timer = setInterval(() => show((active + 1) % slides.length), 5000);
    dots.forEach((dot, index) => dot.addEventListener("click", () => {
      show(index);
      clearInterval(timer);
      timer = setInterval(() => show((active + 1) % slides.length), 5000);
    }));
  }
}

backToHome?.addEventListener("click", (event) => {
  event.preventDefault();
  document.body.classList.add("subsite-leaving");

  // Entspricht der 0,9-Sekunden-Animation in subsides.css.
  setTimeout(() => {
    window.location.href = "index.html?back";
  }, 900);
});
