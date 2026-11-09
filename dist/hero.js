(() => {
  const hero = document.querySelector(".hero");
  const slides = [...hero.querySelectorAll(".hero-photo")];
  const controls = hero.querySelector(".hero-controls");
  const rotate = hero.querySelector("[data-rotate]");
  const source = hero.querySelector("[data-hero-source]");
  const caption = hero.querySelector("[data-hero-caption]");
  const credit = hero.querySelector("[data-hero-credit]");
  const count = hero.querySelector("[data-hero-count]");
  const status = hero.querySelector("[data-hero-status]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const pauseIcon = rotate.querySelector("use");
  const ready = new WeakMap();
  const interval = 8000;
  const pad = (number) => String(number).padStart(2, "0");
  let current = 0;
  let requested = 0;
  let revision = 0;
  let playing = !reduced.matches;
  let visible = false;
  let hovering = false;
  let timer;
  let touch;
  let playingAtPointerDown;

  function prepare(index) {
    const image = slides[index];
    if (!ready.has(image)) {
      if (image.dataset.src) {
        image.srcset = image.dataset.srcset;
        image.src = image.dataset.src;
      }
      const decoded = image.decode().then(() => true, () => {
        ready.delete(image);
        return false;
      });
      ready.set(image, decoded);
    }
    return ready.get(image);
  }

  function schedule() {
    clearTimeout(timer);
    if (!playing || !visible || hovering || document.hidden || reduced.matches) return;
    timer = setTimeout(() => changeSlide(1, false), interval);
  }

  function setPlaying(value) {
    playing = value && !reduced.matches;
    rotate.hidden = reduced.matches;
    rotate.setAttribute("aria-label", playing ? "Tạm dừng tự chuyển ảnh" : "Phát tự động");
    pauseIcon.setAttribute("href", playing ? "#i-pause" : "#i-play");
    schedule();
  }

  async function changeSlide(step, userInitiated) {
    clearTimeout(timer);
    if (userInitiated) setPlaying(false);
    const target = (requested + step + slides.length) % slides.length;
    requested = target;
    const attempt = ++revision;
    const loaded = await prepare(target);
    if (attempt !== revision) return;
    if (!userInitiated && (!playing || !visible || hovering || document.hidden)) {
      requested = current;
      schedule();
      return;
    }
    if (!loaded) {
      requested = current;
      if (userInitiated) status.textContent = "Ảnh chưa tải được. Bạn có thể thử lại.";
      setPlaying(false);
      return;
    }
    if (target !== current) {
      slides.forEach((slide, index) => {
        slide.classList.toggle("is-current", index === target);
        slide.classList.toggle("was-current", index === current);
      });
      current = target;
    }
    const slide = slides[current];
    source.href = slide.dataset.sourceUrl;
    caption.textContent = slide.dataset.caption;
    credit.textContent = "Ảnh: " + slide.dataset.credit;
    count.textContent = pad(current + 1) + " / " + pad(slides.length);
    if (userInitiated) status.textContent = "Cảnh " + (current + 1) + " trên " + slides.length + ": " + slide.dataset.caption;
    if (playing) prepare((current + 1) % slides.length);
    schedule();
  }

  controls.hidden = false;
  controls.querySelectorAll("[data-hero-step]").forEach((button) => {
    button.addEventListener("click", () => changeSlide(Number(button.dataset.heroStep), true));
  });
  controls.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    changeSlide(event.key === "ArrowLeft" ? -1 : 1, true);
  });
  rotate.addEventListener("pointerdown", () => { playingAtPointerDown = playing; });
  rotate.addEventListener("click", (event) => {
    const wasPlaying = event.detail > 0 ? (playingAtPointerDown ?? playing) : playing;
    playingAtPointerDown = undefined;
    setPlaying(!wasPlaying);
    if (playing) prepare((current + 1) % slides.length);
  });
  hero.addEventListener("focusin", () => setPlaying(false));
  hero.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hovering = true;
    schedule();
  });
  hero.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    hovering = false;
    schedule();
  });
  hero.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || !event.isPrimary || event.target.closest("a, button")) return;
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  hero.addEventListener("pointerup", (event) => {
    if (event.pointerId !== touch?.id) return;
    const x = event.clientX - touch.x;
    const y = event.clientY - touch.y;
    touch = undefined;
    if (Math.abs(x) > 48 && Math.abs(x) > Math.abs(y) * 1.3) changeSlide(x < 0 ? 1 : -1, true);
  });
  hero.addEventListener("pointercancel", () => { touch = undefined; });
  reduced.addEventListener("change", () => setPlaying(false));
  document.addEventListener("visibilitychange", schedule);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.45;
    if (visible && playing) prepare((current + 1) % slides.length);
    schedule();
  }, { threshold: [0, 0.45] }).observe(hero);
  setPlaying(playing);
})();

