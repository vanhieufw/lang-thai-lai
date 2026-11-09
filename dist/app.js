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

const viewer = document.querySelector("#photo-viewer");
const gallery = [...document.querySelectorAll("[data-photo]")];
const viewerImage = viewer.querySelector("img");
const viewerTitle = viewer.querySelector("#photo-title");
const viewerLabel = viewer.querySelector("[data-viewer-label]");
const viewerSource = viewer.querySelector("[data-source]");
const viewerDescription = viewer.querySelector("[data-photo-description]");
const viewerCount = viewer.querySelector("[data-count]");
const viewerButtons = viewer.querySelectorAll("[data-step]");
const photoSources = {
  vinpearl: ["Vinpearl", "https://vinpearl.com/en/tuy-loan-ancient-village-da-nang"],
  vietnamnet: ["VietNamNet", "https://vietnamnet.vn/en/tich-thien-duong-a-200-year-old-house-in-da-nang-570354.html"],
  kinhtexanh: ["Tạp chí Doanh nghiệp và Kinh tế xanh", "https://doanhnghiepkinhtexanh.vn/dac-sac-huong-vi-que-huong-tai-lang-du-lich-sinh-thai-cong-dong-thai-lai-a25334.html"],
  baodanang: ["Diệp Như / Báo Đà Nẵng", "https://baodanang.vn/ve-lang-thai-lai-trai-nghiem-van-hoa-am-thuc-dac-sac-3196547.html"],
  huongsac: ["Tạp chí Việt Nam Hương Sắc", "https://tapchivietnamhuongsac.vn/nha-co-tich-thien-duong-trong-quan-the-khong-gian-xanh-5418.html"],
  ttxvn: ["Quốc Dũng / TTXVN (2023)", "https://vnanet.vn/vi/anh/anh-thoi-su-trong-nuoc-1014/nhieu-ben-du-lich-duong-thuy-noi-dia-tai-da-nang-bi-bo-hoang-6895094.html"],
};
let photos = gallery;
let photoIndex = 0;
let previousFocus;
let photoTouch;

function showPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  const tile = photos[photoIndex];
  const [sourceName, sourceUrl] = photoSources[tile.dataset.photo];
  viewerImage.src = tile.href;
  viewerImage.alt = tile.querySelector("img").alt;
  viewerTitle.textContent = tile.querySelector("span").textContent.trim();
  viewerDescription.textContent = tile.dataset.note ?? "";
  viewerDescription.hidden = !tile.dataset.note;
  viewerSource.href = sourceUrl;
  viewerSource.textContent = "Ảnh: " + sourceName;
  viewerCount.textContent = (photoIndex + 1) + " / " + photos.length;
}

function openAlbum(event, slides, index, label) {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !viewer.showModal || !slides.length) return;
  event.preventDefault();
  previousFocus = event.currentTarget;
  photos = slides;
  viewerLabel.textContent = label;
  viewerButtons.forEach((button) => { button.hidden = slides.length < 2; });
  showPhoto(index);
  viewer.showModal();
}

gallery.forEach((tile, index) => {
  tile.addEventListener("click", (event) => openAlbum(event, gallery, index, "Album Thái Lai"));
});
document.querySelectorAll("[data-photo-group]").forEach((link) => {
  const slides = gallery.filter((tile) => tile.dataset.tour?.split(" ").includes(link.dataset.photoGroup));
  link.addEventListener("click", (event) => openAlbum(event, slides, 0, "Tour ảnh · " + link.dataset.viewerLabel));
});

viewer.querySelector("[data-close]").addEventListener("click", () => viewer.close());
viewerButtons.forEach((button) => {
  button.addEventListener("click", () => showPhoto(photoIndex + Number(button.dataset.step)));
});
viewer.addEventListener("keydown", (event) => {
  if (photos.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    showPhoto(photoIndex + (event.key === "ArrowLeft" ? -1 : 1));
  }
});
viewerImage.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch" && event.isPrimary) {
    photoTouch = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }
});
viewerImage.addEventListener("pointerup", (event) => {
  if (event.pointerId !== photoTouch?.id) return;
  const dx = event.clientX - photoTouch.x;
  const dy = event.clientY - photoTouch.y;
  photoTouch = undefined;
  if (photos.length > 1 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
    showPhoto(photoIndex + (dx < 0 ? 1 : -1));
  }
});
viewerImage.addEventListener("pointercancel", () => { photoTouch = undefined; });
viewer.addEventListener("click", (event) => {
  if (event.target === viewer) viewer.close();
});
viewer.addEventListener("close", () => {
  photoTouch = undefined;
  previousFocus?.focus({ preventScroll: true });
});
