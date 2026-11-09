const panorama = document.querySelector("#vr-viewer");
const canvas = panorama.querySelector("canvas");
const status = panorama.querySelector("[data-vr-status]");
const triggers = document.querySelectorAll("[data-open-vr]");
const scenePicker = panorama.querySelector("#vr-scene");
const scenes = {
  "loi-vao": { asset: "dinh-pano.js", payload: "thaiLaiPanoramaData", label: "Lối vào làng", pitch: 0.31 },
  "san-dinh": { asset: "san-dinh-pano.js", payload: "thaiLaiCourtyardData", label: "Sân đình", pitch: 0.04 },
  "chinh-dien": { asset: "chinh-dien-pano.js", payload: "thaiLaiShrineData", label: "Chính điện", pitch: 0.03 },
};
const minFov = 36;
const maxFov = 100;
let yaw = 0;
let pitch = 0.31;
let fov = 86;
let pointer;
let trigger;
let renderer;
let loadedScene;
let revision = 0;
let frame;

const vertexShader = [
  "attribute vec2 position;",
  "varying vec2 screen;",
  "void main() {",
  "  screen = position;",
  "  gl_Position = vec4(position, 0.0, 1.0);",
  "}",
].join("\n");

const fragmentShader = [
  "precision highp float;",
  "uniform sampler2D photo;",
  "uniform vec2 field;",
  "uniform vec2 angle;",
  "varying vec2 screen;",
  "const float pi = 3.141592653589793;",
  "void main() {",
  "  vec3 ray = normalize(vec3(screen * field, 1.0));",
  "  float cp = cos(angle.y), sp = sin(angle.y);",
  "  ray.yz = vec2(cp * ray.y + sp * ray.z, -sp * ray.y + cp * ray.z);",
  "  float longitude = atan(ray.x, ray.z) + angle.x;",
  "  float latitude = asin(clamp(ray.y, -1.0, 1.0));",
  "  vec2 uv = vec2(fract(0.5 + longitude / (2.0 * pi)), 0.5 - latitude / pi);",
  "  gl_FragColor = texture2D(photo, uv);",
  "}",
].join("\n");

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error("Cannot compile panorama shader");
  }
  return shader;
}

function loadPanoramaImage(scene) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./assets/" + scene.asset;
    script.onload = () => {
      const url = window[scene.payload];
      delete window[scene.payload];
      script.remove();
      if (url) resolve(url);
      else reject(new Error("Missing panorama image"));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("Cannot load panorama image"));
    };
    document.head.append(script);
  });
}
function createRenderer() {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
  if (!gl) throw new Error("WebGL unavailable");

  const program = gl.createProgram();
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Cannot link panorama");
  gl.useProgram(program);

  const points = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, points);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  const textureLimit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  function setImage(image) {
    let source = image;
    if (image.width > textureLimit) {
      source = document.createElement("canvas");
      source.width = textureLimit;
      source.height = Math.round(textureLimit * image.height / image.width);
      source.getContext("2d").drawImage(image, 0, 0, source.width, source.height);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (gl.getError() !== gl.NO_ERROR) throw new Error("Cannot load panorama texture");
  }

  const field = gl.getUniformLocation(program, "field");
  const angle = gl.getUniformLocation(program, "angle");
  function render() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    const span = Math.tan(fov * Math.PI / 360);
    const aspect = width / height;
    gl.uniform2f(field, span * Math.min(aspect, 1.65), span * Math.min(1, 1.65 / aspect));
    gl.uniform2f(angle, yaw, pitch);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  return { setImage, render };
}

function draw() {
  if (!panorama.open || !renderer || frame !== undefined) return;
  frame = requestAnimationFrame(() => {
    frame = undefined;
    if (panorama.open) renderer?.render();
  });
}

function turn(horizontal, vertical) {
  yaw = (yaw + horizontal) % (Math.PI * 2);
  pitch = Math.max(-1.42, Math.min(1.42, pitch + vertical));
  draw();
}

function zoom(delta) {
  fov = Math.max(minFov, Math.min(maxFov, fov + delta));
  draw();
}

function setStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function showUnavailable() {
  setStatus("Trình xem 360° chưa tải được. Bạn có thể dùng liên kết Mở tour chính thức bên dưới.");
}

async function selectScene(key) {
  const scene = scenes[key];
  const attempt = ++revision;
  if (key === loadedScene) {
    setStatus("");
    draw();
    return;
  }
  setStatus("Đang tải cảnh " + scene.label + "…");
  try {
    const image = new Image();
    image.src = await loadPanoramaImage(scene);
    await image.decode();
    if (attempt !== revision || !panorama.open) return;
    renderer ??= createRenderer();
    renderer.setImage(image);
    loadedScene = key;
    yaw = 0;
    pitch = scene.pitch;
    fov = 86;
    canvas.setAttribute("aria-label", "Ảnh 360° " + scene.label + ". Dùng các phím mũi tên để xoay.");
    setStatus("");
    draw();
  } catch {
    if (attempt !== revision || !panorama.open) return;
    if (loadedScene) scenePicker.value = loadedScene;
    showUnavailable();
  }
}

triggers.forEach((link) => link.addEventListener("click", (event) => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !panorama.showModal) return;
  event.preventDefault();
  trigger = link;
  panorama.showModal();
  selectScene(scenePicker.value);
}));
scenePicker.addEventListener("change", () => selectScene(scenePicker.value));

canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  revision += 1;
  renderer = undefined;
  loadedScene = undefined;
  showUnavailable();
});
canvas.addEventListener("webglcontextrestored", () => {
  if (panorama.open) selectScene(scenePicker.value);
});
canvas.addEventListener("pointerdown", (event) => {
  if (!renderer || pointer || event.button !== 0) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (pointer?.id !== event.pointerId) return;
  const speed = fov / 70 * .005;
  turn((pointer.x - event.clientX) * speed, (event.clientY - pointer.y) * speed);
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
canvas.addEventListener("lostpointercapture", () => { pointer = undefined; });
canvas.addEventListener("wheel", (event) => {
  if (!renderer || event.ctrlKey) return;
  event.preventDefault();
  zoom(Math.sign(event.deltaY) * 4);
}, { passive: false });
canvas.addEventListener("keydown", (event) => {
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  const direction = directions[event.key];
  if (!direction || !renderer) return;
  event.preventDefault();
  turn(direction[0] * .16, direction[1] * .16);
});

panorama.querySelector("[data-vr-close]").addEventListener("click", () => panorama.close());
panorama.querySelectorAll("[data-vr-move]").forEach((button) => {
  button.addEventListener("click", () => {
    const [x, y] = button.dataset.vrMove.split(",").map(Number);
    turn(x * .25, y * .25);
  });
});
panorama.querySelectorAll("[data-vr-zoom]").forEach((button) => {
  button.addEventListener("click", () => zoom(Number(button.dataset.vrZoom) * -9));
});
panorama.addEventListener("click", (event) => {
  if (event.target === panorama) panorama.close();
});
panorama.addEventListener("close", () => {
  revision += 1;
  trigger?.focus({ preventScroll: true });
});
new ResizeObserver(draw).observe(canvas);



