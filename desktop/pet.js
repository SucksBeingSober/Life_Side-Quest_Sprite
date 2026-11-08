const api = window.petAPI || {
  setIgnore() {},
  dragStart() {},
  dragEnd: async () => ({ distance: 0 }),
  menu() {},
  open() {},
  talk: async () => null,
  log: () => {},
  onState() {},
  onWalk() {},
  onFollow() {},
  onIdle() {},
  onBubble() {},
};

const pet = document.getElementById("pet");
const bubble = document.getElementById("bubble");
const bubbleText = document.getElementById("bubbleText");

let dragging = false;
let bubbleTimer = 0;
let lastLine = "";

const LINES = {
  opening: ["又无聊了？行，双击我。", "来了。今天想走哪条？"],
  idle: ["戳我干嘛，双击开面板。", "拖我走也行，别摔。", "这条街我熟。", "别急，灵感会回来的。"],
  empty: ["没灵感了？歇会儿，明天再来。"],
};

function pick(list) {
  const options = list.filter((line) => line !== lastLine);
  const line = options[Math.floor(Math.random() * options.length)] || list[0];
  lastLine = line;
  return line;
}

function showBubble(text, duration = 5200) {
  if (!text) return;
  bubbleText.textContent = text;
  bubble.classList.add("show");
  window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(() => bubble.classList.remove("show"), duration);
}

async function say(scene = "idle") {
  const local = pick(LINES[scene] || LINES.idle);
  showBubble(local);
  try {
    const text = await api.talk(scene);
    if (text) showBubble(text);
  } catch {
    /* 本地台词已经显示 */
  }
}

function handleClick() {
  api.log("open-panel");
  api.open("input");
  showBubble("去了，挑一条。", 1800);
}

pet.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  api.log(`pointerdown ${Math.round(event.clientX)},${Math.round(event.clientY)}`);
  event.preventDefault();
  dragging = true;
  pet.classList.add("dragging");
  try {
    pet.setPointerCapture(event.pointerId);
  } catch {}
  api.dragStart();
});

pet.addEventListener("click", () => {
  api.log("click");
});

async function finishDrag() {
  if (!dragging) return;
  dragging = false;
  pet.classList.remove("dragging");
  let distance = 0;
  try {
    const result = await api.dragEnd();
    distance = result?.distance ?? 0;
  } catch {}
  if (distance < 10) {
    handleClick();
  }
}

pet.addEventListener("pointerup", () => {
  finishDrag();
});

pet.addEventListener("pointercancel", () => {
  finishDrag();
});

window.addEventListener("blur", () => {
  if (dragging) finishDrag();
});

window.addEventListener("contextmenu", (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest(".pet")) return;
  event.preventDefault();
  api.menu();
});

document.addEventListener("dragstart", (event) => event.preventDefault());

api.onWalk(({ direction }) => {
  pet.classList.add("walking");
  pet.classList.remove("following");
  pet.classList.toggle("flip-left", direction < 0);
});

api.onIdle(() => {
  pet.classList.remove("walking");
});

api.onFollow(({ on }) => {
  pet.classList.toggle("following", Boolean(on));
  if (on) pet.classList.remove("walking");
});

api.onState(({ dragging: isDragging }) => {
  pet.classList.toggle("dragging", Boolean(isDragging));
});

api.onBubble(({ text }) => {
  showBubble(text);
});

window.setTimeout(() => {
  const rect = pet.getBoundingClientRect();
  api.log(
    `rect ${JSON.stringify({
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
      iw: window.innerWidth,
      ih: window.innerHeight,
      dpr: window.devicePixelRatio,
    })}`,
  );
  showBubble("点我，派条支线。", 8000);
}, 700);
