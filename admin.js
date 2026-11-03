
"use strict";

const STORAGE_NEWS = "jkplay_noticias";
const STORAGE_DRAFTS = "jkplay_rascunhos";

const $ = (id) => document.getElementById(id);

let selectedImage = "";
let messageTimeout = null;

/* ---------- UTILITÁRIOS ---------- */

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`Erro ao ler ${key}:`, error);
    return [];
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getNews() {
  return readStorage(STORAGE_NEWS);
}

function getDrafts() {
  return readStorage(STORAGE_DRAFTS);
}

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character];
  });
}

function formatDate(dateString) {
  if (!dateString) return "Data não informada";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("pt-BR");
}

function todayISO() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
}

function showMessage(message, type = "success") {
  const element = $("admin-message");
  if (!element) return;

  element.textContent = message;
  element.className = `admin-message visible ${type}`;

  clearTimeout(messageTimeout);

  messageTimeout = setTimeout(() => {
    element.className = "admin-message";
    element.textContent = "";
  }, 5000);
}

/* ---------- ABAS ---------- */

function openTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  }));

  document.querySelectorAll(".admin-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabName);
  });

  if (tabName === "list") {
    renderNewsList();
  }

  if (tabName === "stories") {
    const selector = $("story-news-select");
    const previousSelection = selector.value;

    fillStorySelector();

    if ([...selector.options].some(
      (option) => option.value === previousSelection
    )) {
      selector.value = previousSelection;
    }
  }
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => openTab(button.dataset.tab));
});

/* ---------- FORMULÁRIO ---------- */

function getFormData() {
  return {
    title: $("news-title").value.trim(),
    summary: $("news-summary").value.trim(),
    category: $("news-category").value,
    author: $("news-author").value.trim() || "JK Play News",
    date: $("news-date").value,
    image: selectedImage,
    content: $("news-content").value.trim()
  };
}

function validateNews(news) {
  if (
    !news.title ||
    !news.summary ||
    !news.category ||
    !news.date ||
    !news.content
  ) {
    showMessage("Preencha todos os campos obrigatórios.", "error");
    return false;
  }

  return true;
}

function resetForm() {
  $("news-form").reset();
  $("news-id").value = "";
  $("news-date").value = todayISO();

  selectedImage = "";
  updateImagePreview("");

  $("editor-heading").textContent = "Cadastrar notícia";
  $("cancel-edit").classList.add("hidden");

  $("news-form").querySelector(
    'button[type="submit"]'
  ).textContent = "Publicar notícia";
}

function editNews(id) {
  const news = getNews().find((item) => item.id === id);

  if (!news) {
    showMessage("Não foi possível encontrar essa notícia.", "error");
    return;
  }

  $("news-id").value = news.id;
  $("news-title").value = news.title || "";
  $("news-summary").value = news.summary || "";
  $("news-category").value = news.category || "";
  $("news-author").value = news.author || "";
  $("news-date").value = news.date || todayISO();
  $("news-content").value = news.content || "";

  selectedImage = news.image || "";
  updateImagePreview(selectedImage);

  $("editor-heading").textContent = "Editar notícia";
  $("cancel-edit").classList.remove("hidden");

  $("news-form").querySelector(
    'button[type="submit"]'
  ).textContent = "Salvar alterações";

  openTab("editor");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("news-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = getFormData();
  if (!validateNews(formData)) return;

  const news = getNews();
  const editingId = $("news-id").value;

  if (editingId) {
    const index = news.findIndex((item) => item.id === editingId);

    if (index === -1) {
      showMessage("Notícia não encontrada.", "error");
      return;
    }

    news[index] = {
      ...news[index],
      ...formData,
      updatedAt: new Date().toISOString()
    };

    saveStorage(STORAGE_NEWS, news);
    showMessage("Notícia atualizada com sucesso!");
  } else {
    news.unshift({
      id: createId(),
      ...formData,
      createdAt: new Date().toISOString()
    });

    saveStorage(STORAGE_NEWS, news);
    showMessage("Notícia publicada com sucesso!");
  }

  resetForm();
  renderNewsList();
  fillStorySelector();
  openTab("list");
});

$("cancel-edit").addEventListener("click", () => {
  resetForm();
  openTab("list");
});

$("new-news-button").addEventListener("click", () => {
  resetForm();
  openTab("editor");
});

/* ---------- IMAGEM DA NOTÍCIA ---------- */

function updateImagePreview(imageData) {
  const preview = $("image-preview");
  const message = $("image-preview-message");

  if (imageData) {
    preview.src = imageData;
    preview.classList.add("visible");
    message.textContent = "Imagem selecionada";
  } else {
    preview.removeAttribute("src");
    preview.classList.remove("visible");
    message.textContent = "Nenhuma imagem selecionada";
  }
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem válido."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxWidth = 1400;
        const maxHeight = 1400;

        const scale = Math.min(
          1,
          maxWidth / image.width,
          maxHeight / image.height
        );

        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = () => {
        reject(new Error("Não foi possível carregar a imagem."));
      };

      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

$("news-image").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    selectedImage = await compressImage(file);
    updateImagePreview(selectedImage);
    showMessage("Imagem carregada.");
  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
    event.target.value = "";
  }
});

$("remove-image").addEventListener("click", () => {
  selectedImage = "";
  $("news-image").value = "";
  updateImagePreview("");
});

/* ---------- RASCUNHOS ---------- */

$("save-draft").addEventListener("click", () => {
  const draftData = getFormData();

  if (!draftData.title) {
    showMessage(
      "Digite pelo menos o título para salvar o rascunho.",
      "error"
    );
    return;
  }

  const drafts = getDrafts();
  const draftId = $("news-id").value || createId();

  const draft = {
    id: draftId,
    ...draftData,
    savedAt: new Date().toISOString()
  };

  const index = drafts.findIndex((item) => item.id === draftId);

  if (index >= 0) {
    drafts[index] = draft;
  } else {
    drafts.unshift(draft);
  }

  saveStorage(STORAGE_DRAFTS, drafts);
  showMessage("Rascunho salvo no navegador.");
});

/* ---------- LISTA DE NOTÍCIAS ---------- */

function renderNewsList() {
  const container = $("news-list");
  const news = getNews();

  if (!news.length) {
    container.innerHTML = `
      <div class="empty-state">
        Nenhuma notícia cadastrada ainda.
      </div>
    `;
    return;
  }

  container.innerHTML = news.map((item) => {
    const image = item.image
      ? `<img class="news-item-image" src="${item.image}" alt="">`
      : `<div class="news-item-image"></div>`;

    return `
      <article class="news-item">
        ${image}

        <div>
          <h3>${escapeHTML(item.title)}</h3>

          <p class="news-meta">
            ${escapeHTML(item.category || "Sem categoria")}
            · ${escapeHTML(formatDate(item.date))}
            · ${escapeHTML(item.author || "JK Play News")}
          </p>

          <div class="news-item-actions">
            <button class="button button-secondary" type="button"
              data-edit="${escapeHTML(item.id)}">Editar</button>

            <button class="button button-secondary" type="button"
              data-story="${escapeHTML(item.id)}">Gerar Story</button>

            <button class="button button-danger" type="button"
              data-delete="${escapeHTML(item.id)}">Excluir</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  container.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editNews(button.dataset.edit));
  });

  container.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteNews(button.dataset.delete));
  });

  container.querySelectorAll("[data-story]").forEach((button) => {
    button.addEventListener("click", () => {
      openTab("stories");
      $("story-news-select").value = button.dataset.story;
      generateStories();
    });
  });
}

function deleteNews(id) {
  const news = getNews();
  const item = news.find((entry) => entry.id === id);

  if (!item) return;

  if (!confirm(`Deseja excluir a notícia "${item.title}"?`)) return;

  saveStorage(
    STORAGE_NEWS,
    news.filter((entry) => entry.id !== id)
  );

  renderNewsList();
  fillStorySelector();
  showMessage("Notícia excluída.");
}

/* ---------- SELETOR DE STORIES ---------- */

function fillStorySelector() {
  const selector = $("story-news-select");
  const currentValue = selector.value;
  const news = getNews();

  selector.innerHTML = '<option value="">Selecione uma notícia</option>';

  news.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.title;
    selector.appendChild(option);
  });

  if (news.some((item) => item.id === currentValue)) {
    selector.value = currentValue;
  }
}

/* ---------- IMAGEM PARA O CANVAS ---------- */

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCoverImage(context, image, x, y, width, height) {
  if (!image) return;

  const imageRatio = image.width / image.height;
  const targetRatio = width / height;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
}

function wrapText(context, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;

    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);
  return lines;
}

function drawLimitedText(
  context,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines
) {
  const lines = wrapText(context, text, maxWidth);
  const visibleLines = lines.slice(0, maxLines);

  if (lines.length > maxLines && visibleLines.length) {
    let lastLine = visibleLines[visibleLines.length - 1];

    while (
      lastLine.length > 0 &&
      context.measureText(`${lastLine}…`).width > maxWidth
    ) {
      lastLine = lastLine.slice(0, -1);
    }

    visibleLines[visibleLines.length - 1] = `${lastLine.trim()}…`;
  }

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  return y + visibleLines.length * lineHeight;
}

/* ---------- GERADOR DE STORY ---------- */

async function generateStories() {
  const selector = $("story-news-select");
  const canvas = $("story-canvas");

  if (!selector || !canvas) {
    showMessage("Canvas ou seletor de notícia não encontrado.", "error");
    console.error("Verifique os IDs story-news-select e story-canvas.");
    return;
  }

  const id = selector.value;

  if (!id) {
    showMessage("Selecione uma notícia para gerar o Story.", "error");
    return;
  }

  const news = getNews().find((item) => item.id === id);

  if (!news) {
    showMessage("A notícia selecionada não foi encontrada.", "error");
    return;
  }

  try {
    const image = await loadImage(news.image);
    drawProfessionalStory(news, image);

    $("story-output").classList.remove("hidden");
    showMessage("Story gerado! Você já pode baixar a imagem.");
  } catch (error) {
    console.error("Erro ao gerar Story:", error);
    showMessage("Erro ao gerar o Story. Confira o Console.", "error");
  }
}

function drawProfessionalStory(news, image) {
  const canvas = $("story-canvas");
  const context = canvas.getContext("2d");

  const RED = "#b5121b";
  const DARK_RED = "#8e0d15";
  const WHITE = "#ffffff";
  const BLACK = "#171717";
  const GRAY = "#555555";

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  context.clearRect(0, 0, WIDTH, HEIGHT);

  // Fundo
  context.fillStyle = WHITE;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Cabeçalho
  context.fillStyle = RED;
  context.fillRect(0, 0, WIDTH, 170);

  context.fillStyle = WHITE;
  context.font = "bold 52px Arial";
  context.fillText("JK PLAY", 72, 78);

  context.font = "bold 32px Arial";
  context.fillText("NEWS", 72, 128);

  context.fillStyle = DARK_RED;
  context.fillRect(0, 170, WIDTH, 12);

  // Fotografia
  if (image) {
    drawCoverImage(context, image, 0, 182, WIDTH, 650);
  } else {
    context.fillStyle = "#e8e8e8";
    context.fillRect(0, 182, WIDTH, 650);

    context.fillStyle = GRAY;
    context.font = "36px Arial";
    context.textAlign = "center";
    context.fillText("IMAGEM INDISPONÍVEL", WIDTH / 2, 520);
    context.textAlign = "left";
  }

  // Categoria
  const category = String(news.category || "NOTÍCIA").toUpperCase();

  context.font = "bold 28px Arial";
  const categoryWidth = Math.min(
    936,
    Math.max(250, context.measureText(category).width + 44)
  );

  context.fillStyle = RED;
  context.fillRect(72, 875, categoryWidth, 64);

  context.fillStyle = WHITE;
  context.fillText(category, 94, 917);

  // Título
  context.fillStyle = BLACK;
  context.font = "bold 64px Arial";

  const titleEnd = drawLimitedText(
    context,
    news.title,
    72,
    1030,
    936,
    78,
    4
  );

  // Resumo: área fixa para evitar sobreposição
  const dividerY = Math.max(titleEnd + 24, 1320);
  const summaryTop = Math.min(dividerY + 42, 1390);

  context.fillStyle = RED;
  context.fillRect(72, dividerY, 120, 8);

  context.fillStyle = "#f4f4f4";
  context.fillRect(48, summaryTop, 984, 350);

  context.fillStyle = RED;
  context.font = "bold 32px Arial";
  context.fillText("RESUMO", 82, summaryTop + 62);

  context.fillStyle = BLACK;
  context.font = "38px Arial";

  drawLimitedText(
    context,
    news.summary,
    82,
    summaryTop + 125,
    900,
    54,
    4
  );

  // Rodapé
  context.fillStyle = RED;
  context.fillRect(0, 1810, WIDTH, 110);

  context.fillStyle = WHITE;
  context.font = "bold 30px Arial";
  context.fillText("Leia mais no JK Play News", 72, 1875);

  context.textAlign = "right";
  context.font = "26px Arial";
  context.fillText(formatDate(news.date), 1008, 1875);
  context.textAlign = "left";
}

function downloadCanvas(canvas, filename) {
  if (!canvas) {
    showMessage("Canvas do Story não encontrado.", "error");
    return;
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

$("generate-stories").addEventListener("click", generateStories);

$("download-story").addEventListener("click", () => {
  downloadCanvas($("story-canvas"), "jk-play-news-story.png");
});

/* ---------- INICIALIZAÇÃO ---------- */

$("news-date").value = todayISO();

renderNewsList();
fillStorySelector();
