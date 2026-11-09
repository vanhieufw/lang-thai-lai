const header = document.querySelector(".header");
const navigation = document.querySelector("#main-nav");
const menu = document.querySelector(".menu-toggle");
const navLinks = [...navigation.querySelectorAll("a")];
const sections = navLinks.map((link) => document.querySelector(link.hash));

function setMenu(open) {
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
}

menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") === "false"));
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("click", (event) => {
  if (!header.contains(event.target)) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});
matchMedia("(max-width: 760px)").addEventListener("change", () => setMenu(false));

let pendingScroll = false;
function updateScroll() {
  const top = window.scrollY;
  const range = document.documentElement.scrollHeight - window.innerHeight;
  const active = range > 0 && top >= range - 3 ? sections.at(-1) :
    sections.findLast((section) => section.getBoundingClientRect().top < 165) || sections[0];
  header.classList.toggle("solid", top > 34);
  header.style.setProperty("--progress", String(range > 0 ? top / range : 0));
  navLinks.forEach((link) => {
    if (link.hash === "#" + active.id) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  pendingScroll = false;
}
function queueScrollUpdate() {
  if (pendingScroll) return;
  pendingScroll = true;
  requestAnimationFrame(updateScroll);
}
window.addEventListener("scroll", queueScrollUpdate, { passive: true });
window.addEventListener("resize", queueScrollUpdate);
window.addEventListener("load", queueScrollUpdate);
updateScroll();

function openPlaceFromHash() {
  const detail = document.getElementById(location.hash.slice(1));
  if (detail instanceof HTMLDetailsElement) detail.open = true;
}
document.querySelectorAll("[data-place]").forEach((link) => {
  link.addEventListener("click", () => {
    const detail = document.getElementById(link.dataset.place);
    detail.open = true;
  });
});
window.addEventListener("hashchange", openPlaceFromHash);
openPlaceFromHash();

const viewer = document.querySelector("#photo-viewer");
const gallery = [...document.querySelectorAll("[data-photo]")];
const viewerImage = viewer.querySelector("img");
const viewerTitle = viewer.querySelector("#photo-title");
const viewerSource = viewer.querySelector("[data-source]");
const viewerCount = viewer.querySelector("[data-count]");
const photoSources = {
  vinpearl: ["Vinpearl", "https://vinpearl.com/en/tuy-loan-ancient-village-da-nang"],
  vietnamnet: ["VietNamNet", "https://vietnamnet.vn/en/tich-thien-duong-a-200-year-old-house-in-da-nang-570354.html"],
  kinhtexanh: ["Tạp chí Doanh nghiệp và Kinh tế xanh", "https://doanhnghiepkinhtexanh.vn/dac-sac-huong-vi-que-huong-tai-lang-du-lich-sinh-thai-cong-dong-thai-lai-a25334.html"],
  baodanang: ["Diệp Như / Báo Đà Nẵng", "https://baodanang.vn/ve-lang-thai-lai-trai-nghiem-van-hoa-am-thuc-dac-sac-3196547.html"],
};
let photoIndex = 0;
let previousFocus;

function showPhoto(index) {
  photoIndex = (index + gallery.length) % gallery.length;
  const tile = gallery[photoIndex];
  const [sourceName, sourceUrl] = photoSources[tile.dataset.photo];
  const title = tile.querySelector("span").textContent.trim();
  viewerImage.src = tile.href;
  viewerImage.alt = tile.querySelector("img").alt;
  viewerTitle.textContent = title;
  viewerSource.href = sourceUrl;
  viewerSource.textContent = "Ảnh: " + sourceName;
  viewerCount.textContent = (photoIndex + 1) + " / " + gallery.length;
}

gallery.forEach((tile, index) => {
  tile.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !viewer.showModal) return;
    event.preventDefault();
    previousFocus = tile;
    showPhoto(index);
    viewer.showModal();
  });
});
viewer.querySelector("[data-close]").addEventListener("click", () => viewer.close());
viewer.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => showPhoto(photoIndex + Number(button.dataset.step)));
});
viewer.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto(photoIndex + (event.key === "ArrowLeft" ? -1 : 1));
  }
});
viewer.addEventListener("click", (event) => {
  if (event.target === viewer) viewer.close();
});
viewer.addEventListener("close", () => previousFocus?.focus({ preventScroll: true }));

