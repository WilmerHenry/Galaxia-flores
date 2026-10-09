// Partículas de la bienvenida. Su cantidad se edita en config.js.
export function createIntroParticles(count) {
  const container = document.querySelector("#intro-particles");
  const stars = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    star.className = "intro-star";
    star.style.setProperty("--x", `${Math.random() * 100}%`);
    star.style.setProperty("--y", `${Math.random() * 100}%`);
    star.style.setProperty("--size", `${1 + Math.random() * 2.5}px`);
    star.style.setProperty("--duration", `${3 + Math.random() * 5}s`);
    star.style.setProperty("--delay", `${-Math.random() * 8}s`);
    stars.appendChild(star);
  }

  container.replaceChildren(stars);
}
