const STORAGE_KEY = "mi-menu-semanal-v1";
const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const MEALS = [
  { key: "lunch", label: "MEDIODÍA", icon: "☀️" },
  { key: "dinner", label: "NOCHE", icon: "🌙" },
];
const $ = (id) => document.getElementById(id);
let selectedWeek = getMonday(new Date());
let editing = null;
let data = loadData();

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}
function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}
function weekId(monday) {
  return dateKey(monday);
}
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    showToast("No se pudo guardar. Revisá el espacio disponible del celular.");
  }
}
function formatRange(monday) {
  const sunday = addDays(monday, 6);
  const opts = { day: "numeric", month: "short" };
  const a = monday.toLocaleDateString("es-AR", opts);
  const b = sunday.toLocaleDateString("es-AR", opts);
  return `${a} – ${b}`;
}
function currentWeekMeals(monday = selectedWeek) {
  const id = weekId(monday);
  if (!data[id]) data[id] = {};
  return data[id];
}
function render() {
  $("weekRange").textContent = formatRange(selectedWeek);
  $("weekNumber").textContent = `Semana del ${selectedWeek.getFullYear()}`;
  const container = $("days");
  container.innerHTML = "";
  const meals = currentWeekMeals();
  const today = dateKey(new Date());

  DAYS.forEach((day, index) => {
    const date = addDays(selectedWeek, index);
    const key = dateKey(date);
    const card = document.createElement("article");
    card.className = "day-card";

    const heading = document.createElement("div");
    heading.className = "day-heading";
    const tile = document.createElement("div");
    tile.className = "date-tile";
    tile.innerHTML = `<strong>${date.getDate()}</strong><span>${date.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}</span>`;
    const title = document.createElement("h2");
    title.textContent = day;
    heading.append(tile, title);
    if (key === today) {
      const badge = document.createElement("span");
      badge.className = "today-label";
      badge.textContent = "HOY";
      heading.append(badge);
    }
    card.append(heading);

    MEALS.forEach((meal) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "meal-row";
      button.setAttribute(
        "aria-label",
        `${day}, ${meal.label.toLowerCase()}: ${meals[key]?.[meal.key] || "agregar comida"}`,
      );
      const icon = document.createElement("span");
      icon.className = `meal-icon ${meal.key}`;
      icon.textContent = meal.icon;
      const info = document.createElement("span");
      info.className = "meal-info";
      const moment = document.createElement("span");
      moment.className = "meal-time";
      moment.textContent = meal.label;
      const name = document.createElement("span");
      const value = meals[key]?.[meal.key] || "";
      name.className = `meal-name ${value ? "" : "empty"}`;
      name.textContent = value || "Tocar para agregar comida";
      const edit = document.createElement("span");
      edit.className = "meal-edit";
      edit.textContent = value ? "✎" : "+";
      edit.setAttribute("aria-hidden", "true");
      info.append(moment, name);
      button.append(icon, info, edit);
      button.addEventListener("click", () => openMeal(key, day, meal, value));
      card.append(button);
    });
    container.append(card);
  });
}
function openMeal(dayKey, day, meal, value) {
  editing = { dayKey, day, meal };
  $("mealMoment").textContent = meal.label;
  $("mealTitle").textContent = `${day}: ¿qué comemos?`;
  $("mealInput").value = value;
  $("deleteMeal").style.visibility = value ? "visible" : "hidden";
  $("mealDialog").showModal();
  setTimeout(() => $("mealInput").focus(), 50);
}
function closeMeal() {
  $("mealDialog").close();
}
$("mealForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!editing) return;
  const value = $("mealInput").value.trim();
  const meals = currentWeekMeals();
  if (!meals[editing.dayKey]) meals[editing.dayKey] = {};
  if (value) meals[editing.dayKey][editing.meal.key] = value;
  else delete meals[editing.dayKey][editing.meal.key];
  saveData();
  closeMeal();
  render();
  showToast(value ? "Comida guardada" : "Comida quitada");
});
$("deleteMeal").addEventListener("click", () => {
  if (!editing) return;
  const meals = currentWeekMeals();
  if (meals[editing.dayKey]) delete meals[editing.dayKey][editing.meal.key];
  saveData();
  closeMeal();
  render();
  showToast("Comida borrada");
});
$("closeDialog").addEventListener("click", closeMeal);
$("prevWeek").addEventListener("click", () => {
  selectedWeek = addDays(selectedWeek, -7);
  render();
});
$("nextWeek").addEventListener("click", () => {
  selectedWeek = addDays(selectedWeek, 7);
  render();
});

function askConfirm(title, message, action, yesLabel = "Sí, continuar") {
  $("confirmTitle").textContent = title;
  $("confirmText").textContent = message;
  $("confirmYes").textContent = yesLabel;
  const dialog = $("confirmDialog");
  const handler = (event) => {
    if (event.submitter?.value === "yes") action();
    dialog.removeEventListener("close", handler);
  };
  dialog.addEventListener("close", handler);
  dialog.showModal();
}
$("clearWeek").addEventListener("click", () => {
  const meals = currentWeekMeals();
  const hasMeals = Object.values(meals).some((day) =>
    Object.values(day).some(Boolean),
  );
  if (!hasMeals) {
    showToast("Esta semana ya está vacía.");
    return;
  }
  askConfirm(
    "¿Vaciar esta semana?",
    "Se borrarán todas las comidas anotadas en esta semana. No se puede deshacer.",
    () => {
      data[weekId(selectedWeek)] = {};
      saveData();
      render();
      showToast("Semana vaciada");
    },
    "Vaciar semana",
  );
});
let toastTimer;
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(() => {}),
  );
}
render();
