(() => {
  const quiz = document.querySelector("#do-vui");
  const get = (selector) => quiz.querySelector(selector);
  const start = get("[data-quiz-start]");
  const play = get("[data-quiz-play]");
  const result = get("[data-quiz-result]");
  const prizes = get("[data-quiz-rewards]");
  const startButton = get("[data-start-quiz]");
  const progress = get("[data-quiz-progress]");
  const meter = get("[data-quiz-meter]");
  const questionText = get("[data-quiz-question]");
  const options = get("[data-quiz-options]");
  const feedback = get("[data-quiz-feedback]");
  const next = get("[data-quiz-next]");
  const resultTitle = get("[data-quiz-result-title]");
  const resultCopy = get("[data-quiz-result-copy]");
  const storageKey = "thai-lai-quiz-best";
  const questions = [
    {
      text: "Làng Thái Lai nằm bên dòng sông nào?",
      answers: ["Sông Hàn", "Sông Túy Loan", "Sông Cu Đê"],
      correct: 1,
      detail: "Thái Lai nằm bên bờ bắc sông Túy Loan.",
    },
    {
      text: "Ngôi nhà rường nổi bật ở Thái Lai tên gì?",
      answers: ["Tích Thiện Đường", "Đình Thái Lai", "Chùa Hưng Quang"],
      correct: 0,
      detail: "Tích Thiện Đường là ngôi nhà rường ba gian hai chái với mái ngói âm dương.",
    },
    {
      text: "Bạn có thể xoay xem cảnh nào trong tour 360° trên web?",
      answers: ["Gian bếp nhà cổ", "Chợ Túy Loan", "Lối vào Đình Thái Lai"],
      correct: 2,
      detail: "Ảnh toàn cảnh được chụp trước lối vào Đình Thái Lai.",
    },
    {
      text: "Bạn nên làm gì trước khi vào thăm nhà cổ?",
      answers: ["Tự vào vì đây là điểm tham quan", "Hỏi gia chủ trước", "Chỉ cần đi theo người khác"],
      correct: 1,
      detail: "Nhà cổ là nhà của một gia đình địa phương. Hỏi trước giúp bạn ghé thăm đúng lúc và tôn trọng không gian riêng.",
    },
  ];

  let index = 0;
  let score = 0;
  let answered = false;
  let best = 0;

  try {
    const saved = Number(localStorage.getItem(storageKey));
    if (Number.isInteger(saved) && saved >= 0 && saved <= questions.length) best = saved;
  } catch {
    // The current round still works with storage disabled.
  }

  function showPrizes() {
    prizes.hidden = best < 3;
    prizes.querySelectorAll("[data-prize-score]").forEach((link) => {
      link.hidden = best < Number(link.dataset.prizeScore);
    });
  }

  function showQuestion() {
    const question = questions[index];
    answered = false;
    progress.textContent = "Câu " + (index + 1) + " / " + questions.length;
    meter.value = index + 1;
    questionText.textContent = question.text;
    feedback.textContent = "";
    next.hidden = true;
    next.firstChild.textContent = index === questions.length - 1 ? "Xem kết quả " : "Tiếp theo ";
    options.replaceChildren(...question.answers.map((answer, optionIndex) => {
      const button = document.createElement("button");
      button.className = "quiz-option";
      button.type = "button";
      button.textContent = answer;
      button.addEventListener("click", () => checkAnswer(optionIndex));
      return button;
    }));
    questionText.focus({ preventScroll: true });
    keepFocusVisible(questionText);
  }

  function keepFocusVisible(element) {
    const rect = element.getBoundingClientRect();
    const headerHeight = document.querySelector(".header").offsetHeight;
    if (rect.top < headerHeight + 8 || rect.bottom > innerHeight - 8) {
      element.scrollIntoView({ block: "center" });
    }
  }

  function checkAnswer(choice) {
    if (answered) return;
    answered = true;
    const question = questions[index];
    const correct = choice === question.correct;
    if (correct) score += 1;
    [...options.children].forEach((button, option) => {
      button.setAttribute("aria-disabled", "true");
      button.tabIndex = -1;
      if (option === question.correct || option === choice) {
        const badge = document.createElement("small");
        badge.textContent = option === question.correct ? "Đáp án đúng" : "Bạn đã chọn";
        button.dataset.state = option === question.correct ? "correct" : "incorrect";
        button.append(badge);
      }
    });
    feedback.textContent = (correct ? "Đúng rồi. " : "Chưa đúng. ") + question.detail;
    next.hidden = false;
  }

  function begin() {
    index = 0;
    score = 0;
    start.hidden = true;
    result.hidden = true;
    play.hidden = false;
    showQuestion();
  }

  function finish() {
    if (score > best) {
      best = score;
      try { localStorage.setItem(storageKey, String(best)); } catch { /* Keep prizes for this visit. */ }
    }
    play.hidden = true;
    result.hidden = false;
    get("[data-quiz-score]").textContent = score + " / " + questions.length + " câu đúng";
    resultTitle.textContent = score >= 3 ? "Bạn đã mở quà!" : "Thử thêm một vòng nhé";
    if (score === questions.length) resultCopy.textContent = "Cả hai bưu thiếp đã sẵn sàng để tải.";
    else if (score >= 3) resultCopy.textContent = "Bưu thiếp Về làng đã sẵn sàng. Trả lời đúng cả bốn câu để mở thêm Mái đình.";
    else resultCopy.textContent = "Bạn có thể chơi lại bất cứ lúc nào. Đúng ba câu để mở bưu thiếp đầu tiên.";
    showPrizes();
    resultTitle.focus({ preventScroll: true });
    keepFocusVisible(resultTitle);
  }

  meter.max = questions.length;
  startButton.hidden = false;
  startButton.addEventListener("click", begin);
  get("[data-quiz-retry]").addEventListener("click", begin);
  next.addEventListener("click", () => {
    if (!answered) return;
    if (index === questions.length - 1) finish();
    else {
      index += 1;
      showQuestion();
    }
  });
  showPrizes();
})();

(() => {
  const dialog = document.querySelector("#share-dialog");
  if (!dialog.showModal) return;

  const input = dialog.querySelector("input");
  const notice = dialog.querySelector("[data-share-access]");
  const description = dialog.querySelector("[data-share-description]");
  const status = dialog.querySelector(".share-status");
  const native = dialog.querySelector("[data-native-share]");
  const canonical = document.querySelector('link[rel="canonical"]').href;
  const triggers = document.querySelectorAll("[data-open-share]");
  let opener;
  let sharingQuiz = false;
  let shareRevision = 0;
  native.hidden = typeof navigator.share !== "function";
  notice.hidden = document.documentElement.dataset.siteAccess !== "private";

  triggers.forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => {
      opener = button;
      sharingQuiz = Boolean(button.closest("#do-vui"));
      const url = new URL(canonical);
      if (sharingQuiz) url.hash = "do-vui";
      input.value = url.href;
      description.textContent = sharingQuiz ? "Gửi đường dẫn đến đố vui cho một người bạn." : "Gửi cẩm nang Thái Lai cho bạn bè.";
      status.textContent = "";
      shareRevision += 1;
      dialog.showModal();
    });
  });

  dialog.querySelector("[data-copy-link]").addEventListener("click", async () => {
    const attempt = shareRevision;
    try {
      await navigator.clipboard.writeText(input.value);
      if (attempt === shareRevision) status.textContent = "Đã sao chép liên kết.";
    } catch {
      if (!dialog.open || attempt !== shareRevision) return;
      input.focus();
      input.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch { /* The link remains selected. */ }
      status.textContent = copied ? "Đã sao chép liên kết." : "Liên kết đã được chọn. Bạn có thể sao chép bằng bàn phím hoặc trình đơn.";
    }
  });

  native.addEventListener("click", async () => {
    const attempt = shareRevision;
    status.textContent = "";
    try {
      await navigator.share({
        title: sharingQuiz ? "Đố vui về làng Thái Lai" : "Làng Thái Lai, Đà Nẵng",
        text: sharingQuiz ? "Thử sức với bốn câu hỏi về làng Thái Lai." : "Cùng khám phá làng Thái Lai bên dòng Túy Loan.",
        url: input.value,
      });
    } catch (error) {
      if (error.name !== "AbortError" && attempt === shareRevision) status.textContent = "Tùy chọn chia sẻ chưa mở được. Bạn có thể sao chép liên kết.";
    }
  });

  dialog.querySelector("[data-close-share]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    shareRevision += 1;
    opener?.focus({ preventScroll: true });
  });
})();

