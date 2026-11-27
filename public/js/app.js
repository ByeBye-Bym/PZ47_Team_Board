const form = document.querySelector("#task-form");
const list = document.querySelector("#task-list");
const status = document.querySelector("#status");
const summary = document.querySelector("#summary");
const filter = document.querySelector("#filter");
const search = document.querySelector("#search");
const submitButton = document.querySelector("#submit-button");
let tasks = [];
function setStatus(message, kind = "info") {
  status.textContent = message;
  status.dataset.kind = kind;
}
async function apiRequest(path, options = {}) {
  // TODO 1: выполните fetch, проверьте response.ok.
  // Для ответа 204 верните null, иначе прочитайте JSON.
  // При HTTP-ошибке по возможности возьмите сообщение из поля error.
  const response = await fetch(path, options);

  if (!response.ok) {
    let message = "HTTP " + response.status;

    try {
      const data = await response.json();
      if (data && data.error) {
        message = data.error;
      }
    } catch {
      // тело ответа может быть не JSON
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
function renderTasks() {
  // TODO 2: примените фильтр статуса + поиск по названию,
  // затем сформируйте карточки через createElement/textContent.
  // На каждой карточке разместите кнопки data-action=toggle/delete и data-id.
  // Выведите количество всех, активных и выполненных задач.
  const query = search.value.trim().toLowerCase();
  const state = filter.value;

  const visible = tasks.filter((task) => {
    const byStatus =
      state === "all" || (state === "done" && task.done) || (state === "active" && !task.done);
    const byTitle = task.title.toLowerCase().includes(query);
    return byStatus && byTitle;
  });

  list.replaceChildren();

  if (visible.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = tasks.length === 0 ? "Задач пока нет" : "Подходящих задач нет";
    list.append(empty);
  }

  visible.forEach((task) => {
    const card = document.createElement("article");
    card.className = task.done ? "item done" : "item";

    const title = document.createElement("h3");
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "meta";

    const category = document.createElement("span");
    category.className = "chip";
    category.textContent = task.category;

    const priority = document.createElement("span");
    priority.className = "chip";
    priority.textContent = task.priority;

    const taskStatus = document.createElement("span");
    taskStatus.className = "chip";
    taskStatus.textContent = task.done ? "Выполнена" : "Активна";

    meta.append(category, priority, taskStatus);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "secondary";
    toggleButton.textContent = task.done ? "Вернуть" : "Выполнено";
    toggleButton.dataset.action = "toggle";
    toggleButton.dataset.id = task.id;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "Удалить";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = task.id;

    actions.append(toggleButton, deleteButton);
    card.append(title, meta, actions);
    list.append(card);
  });

  const doneCount = tasks.filter((task) => task.done).length;
  summary.textContent =
    "Всего: " + tasks.length + " Активных: " + (tasks.length - doneCount) + " Выполненных: " + doneCount;
}
async function loadTasks() {
  // TODO 3: GET /api/tasks, заполните tasks и вызовите renderTasks().
  setStatus("Загружаем задачи...", "loading");

  try {
    const data = await apiRequest("/api/tasks");

    if (!data || !Array.isArray(data.items)) {
      throw new Error("Сервер вернул неверный список задач");
    }

    tasks = data.items;
    renderTasks();
    setStatus("Список задач загружен.", "success");
    return true;
  } catch (error) {
    setStatus("Не удалось загрузить задачи: " + error.message, "error");
    return false;
  }
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  // TODO 4: POST /api/tasks, body=JSON.stringify({title,category,priority}).
  // Блокируйте submitButton, обрабатывайте ошибку, после успеха вызовите loadTasks().
  const title = document.querySelector("#title").value.trim();
  const category = document.querySelector("#category").value;
  const priority = document.querySelector("#priority").value;

  if (title.length < 4) {
    setStatus("Название должно быть не короче 4 символов.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus("Создаём задачу...", "loading");

  try {
    await apiRequest("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, priority }),
    });

    form.reset();
    const loaded = await loadTasks();

    if (loaded) {
      setStatus("Задача создана.", "success");
    }
  } catch (error) {
    setStatus("Не удалось создать задачу: " + error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});
list.addEventListener("click", async (event) => {
  // TODO 5: делегирование: closest('button[data-action]'), data-id.
  // toggle → PATCH /api/tasks/:id с {done: !task.done}.
  // delete → DELETE /api/tasks/:id. После выполнения обновите список.
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  button.disabled = true;

  try {
    if (action === "toggle") {
      setStatus("Меняем статус задачи...", "loading");
      await apiRequest("/api/tasks/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      });
    } else if (action === "delete") {
      setStatus("Удаляем задачу...", "loading");
      await apiRequest("/api/tasks/" + id, { method: "DELETE" });
    }

    const loaded = await loadTasks();
    if (loaded) {
      setStatus(action === "delete" ? "Задача удалена." : "Статус задачи изменён.", "success");
    }
  } catch (error) {
    setStatus("Не удалось выполнить действие: " + error.message, "error");
  } finally {
    button.disabled = false;
  }
});
filter.addEventListener("change", renderTasks);
search.addEventListener("input", renderTasks);
document.querySelector("#refresh-button").addEventListener("click", loadTasks);
// TODO 6: начальная загрузка.
// доска переживает DELETE но не перезапуск сервера
loadTasks();
