(() => {
  const planner = document.querySelector("[data-trip]");
  const inputs = [...planner.querySelectorAll("[data-trip-choice]")];
  const toggles = [...document.querySelectorAll("[data-pick]")];
  const count = planner.querySelector("[data-trip-count]");
  const empty = planner.querySelector("[data-trip-empty]");
  const stops = planner.querySelector("[data-trip-stops]");
  const actions = planner.querySelector("[data-trip-actions]");
  const route = planner.querySelector("[data-trip-route]");
  const note = planner.querySelector("[data-trip-note]");
  const storageKey = "thai-lai-trip";
  const places = inputs.map((input) => ({
    key: input.value,
    name: input.nextElementSibling.textContent.trim(),
    pin: input.dataset.pin,
    anchor: input.dataset.anchor,
  }));
  const byKey = new Map(places.map((place) => [place.key, place]));

  function readSelection(value) {
    try {
      const saved = JSON.parse(value);
      if (Array.isArray(saved)) return new Set(saved.filter((key) => byKey.has(key)));
    } catch {
      // A broken or missing saved selection starts a fresh plan.
    }
    return new Set();
  }

  let selected = new Set();
  try { selected = readSelection(localStorage.getItem(storageKey)); } catch {
    note.textContent = "Bạn có thể tải lịch để giữ lại lựa chọn.";
  }

  function getStops() {
    return places.filter((place) => selected.has(place.key));
  }

  function mapsRoute(chosen) {
    const pins = [...new Set(chosen.map((place) => place.pin))];
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", pins.at(-1));
    if (pins.length > 1) {
      url.searchParams.set("origin", pins[0]);
      url.searchParams.set("travelmode", "walking");
      if (pins.length > 2) url.searchParams.set("waypoints", pins.slice(1, -1).join("|"));
    }
    return url.href;
  }

  function render() {
    const chosen = getStops();
    inputs.forEach((input) => { input.checked = selected.has(input.value); });
    toggles.forEach((button) => {
      const active = selected.has(button.dataset.pick);
      button.setAttribute("aria-pressed", String(active));
      button.querySelector("[data-pick-label]").textContent = active ? "Đã lưu vào lịch" : "Thêm vào lịch";
    });
    count.textContent = chosen.length + " điểm đã chọn";
    empty.hidden = Boolean(chosen.length);
    stops.hidden = actions.hidden = !chosen.length;
    stops.replaceChildren(...chosen.map((place) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#" + place.anchor;
      link.textContent = place.name;
      item.append(link);
      return item;
    }));
    if (chosen.length) route.href = mapsRoute(chosen);
    else route.removeAttribute("href");
  }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify([...selected])); } catch {
      note.textContent = "Bạn có thể tải lịch để giữ lại lựa chọn.";
    }
    render();
  }

  function toggle(key, checked) {
    if (checked) selected.add(key);
    else selected.delete(key);
    save();
  }

  toggles.forEach((button) => {
    const key = button.dataset.pick;
    button.setAttribute("aria-label", "Lưu " + byKey.get(key).name + " vào lịch");
    button.hidden = false;
    button.addEventListener("click", () => toggle(key, !selected.has(key)));
  });
  inputs.forEach((input) => input.addEventListener("change", () => toggle(input.value, input.checked)));
  planner.querySelector("[data-trip-preset]").addEventListener("click", () => {
    ["dinh", "nha", "vuon"].forEach((key) => selected.add(key));
    save();
  });
  planner.querySelector("[data-trip-reset]").addEventListener("click", () => {
    selected.clear();
    save();
    inputs[0].focus();
  });
  planner.querySelector("[data-trip-download]").addEventListener("click", () => {
    const chosen = getStops();
    if (!chosen.length) return;
    const lines = [
      "LỊCH GHÉ LÀNG THÁI LAI",
      "Thôn Thái Lai, xã Bà Nà, Đà Nẵng",
      "",
      ...chosen.map((place, index) => (index + 1) + ". " + place.name),
      "",
      "Google Maps: " + mapsRoute(chosen),
      "Hỗ trợ du khách Đà Nẵng: (0236) 3550 111",
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Lich-ghe-lang-Thai-Lai.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey) return;
    selected = readSelection(event.newValue);
    render();
  });
  planner.hidden = false;
  render();
})();

