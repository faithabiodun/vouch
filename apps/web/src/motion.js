// One orchestrated reveal, reduced-motion aware. The page is complete and
// readable with every animation off (§9 quality floor).

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const items = Array.from(document.querySelectorAll("[data-reveal]"));

if (reduce) {
  items.forEach((el) => el.classList.add("in"));
} else {
  // Stagger the initial above-the-fold reveal, then hand the rest to an observer.
  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          obs.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
  );

  items.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      // In the first viewport — orchestrated stagger.
      setTimeout(() => el.classList.add("in"), 90 * i);
    } else {
      io.observe(el);
    }
  });
}
