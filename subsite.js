const backToHome = document.getElementById("backToHome");

if (document.documentElement.classList.contains("pinkchaos-page")) {
  window.scrollTo(0, 0);
}

backToHome?.addEventListener("click", (event) => {
  event.preventDefault();
  document.body.classList.add("subsite-leaving");

  // Entspricht der 0,9-Sekunden-Animation in subsides.css.
  setTimeout(() => {
    window.location.href = "index.html?back";
  }, 900);
});
