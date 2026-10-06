const backToHome = document.getElementById("backToHome");

for (const item of document.querySelectorAll(".archive-item")) {
  item.addEventListener("click", () => {
    if (!window.matchMedia("(hover: none), (pointer: coarse), (max-width: 700px)").matches) return;
    item.setAttribute("aria-pressed", String(item.getAttribute("aria-pressed") !== "true"));
  });
}

const centeredImpressum = document.querySelector(".centered-impressum");
const logoControls = document.querySelector(".logo-controls");
if (centeredImpressum && logoControls) {
  const updateContentTop = () => {
    centeredImpressum.style.setProperty("--content-top", `${logoControls.getBoundingClientRect().bottom}px`);
  };
  new ResizeObserver(updateContentTop).observe(logoControls);
  window.addEventListener("resize", updateContentTop);
  updateContentTop();
}

document.getElementById("closePage")?.addEventListener("click", () => {
  if (document.referrer && new URL(document.referrer).origin === window.location.origin && window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "index.html?back";
  }
});

if (document.documentElement.classList.contains("pinkchaos-page")) {
  window.scrollTo(0, 0);
  const details = document.querySelector(".pinkchaos .detail-content");
  const updateDetailCenter = () => {
    const title = details.querySelector("h1").getBoundingClientRect();
    const button = details.querySelector(".buy-button").getBoundingClientRect();
    const center = (title.top + button.bottom) / 2 - details.getBoundingClientRect().top;
    details.style.setProperty("--detail-center", `${center}px`);
  };
  new ResizeObserver(updateDetailCenter).observe(details);
  window.addEventListener("resize", updateDetailCenter);
  updateDetailCenter();
}

backToHome?.addEventListener("click", (event) => {
  event.preventDefault();
  document.body.classList.add("subsite-leaving");

  // Entspricht der 0,9-Sekunden-Animation in subsides.css.
  setTimeout(() => {
    window.location.href = "index.html?back";
  }, 900);
});
