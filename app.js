// Make API configurable (nice for grading / switching servers)
const API_BASE = window.API_BASE || "https://solo-project-2-j3k5.onrender.com";

let currentPage = 1;
let editingId = null;

document.addEventListener("DOMContentLoaded", () => {
  loadMovies(1);
  loadStats();

  document.getElementById("movie-form").addEventListener("submit", handleSubmit);
  document.getElementById("cancel-edit").addEventListener("click", cancelEdit);
});

async function loadMovies(page = 1) {
  currentPage = page;

  const res = await fetch(`${API_BASE}/movies?page=${page}`);
  const data = await res.json();

  renderMovies(data.movies);
  renderPaging(data.page, data.totalPages);
}

function renderMovies(movies) {
  const tbody = document.getElementById("movie-table-body");
  tbody.innerHTML = "";

  movies.forEach(movie => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(movie.title)}</td>
      <td>${escapeHtml(movie.director)}</td>
      <td>${movie.year}</td>
      <td>${movie.rating}</td>
      <td class="actions">
        <button class="secondary" onclick="startEdit(${movie.id}, ${encodeJson(movie)})">Edit</button>
        <button class="danger" onclick="deleteMovie(${movie.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPaging(page, totalPages) {
  const div = document.getElementById("paging");
  div.innerHTML = "";

  const prev = document.createElement("button");
  prev.textContent = "Previous";
  prev.disabled = page === 1;
  prev.onclick = () => loadMovies(page - 1);

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = page === totalPages;
  next.onclick = () => loadMovies(page + 1);

  const indicator = document.createElement("span");
  indicator.textContent = ` Page ${page} of ${totalPages} `;

  div.append(prev, indicator, next);
}

async function handleSubmit(e) {
  e.preventDefault();
  clearErrors();

  const movie = {
    title: title.value.trim(),
    director: director.value.trim(),
    year: Number(year.value),
    rating: Number(rating.value)
  };

  // Client-side validation (fast feedback)
  const clientErrors = {};
  if (!movie.title) clientErrors.title = "Title is required.";
  if (!movie.director) clientErrors.director = "Director is required.";
  if (!Number.isInteger(movie.year)) clientErrors.year = "Year must be a whole number.";
  if (Number.isNaN(movie.rating)) clientErrors.rating = "Rating must be a number.";

  if (Object.keys(clientErrors).length) {
    showErrors(clientErrors);
    return;
  }

  const isEdit = editingId !== null;
  const url = isEdit ? `${API_BASE}/movies/${editingId}` : `${API_BASE}/movies`;
  const method = isEdit ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movie)
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.errors) showErrors(data.errors);
    else alert("Something went wrong. Please try again.");
    return;
  }

  // Reset UI
  e.target.reset();
  cancelEdit();

  // Reload current page (and handle paging boundaries after deletions/edits)
  await loadMovies(currentPage);
  await loadStats();
}

function startEdit(id, movie) {
  editingId = id;
  document.getElementById("form-title").innerText = "Edit Movie";
  document.getElementById("submit-btn").innerText = "Save Changes";
  document.getElementById("cancel-edit").style.display = "inline-block";

  title.value = movie.title ?? "";
  director.value = movie.director ?? "";
  year.value = movie.year ?? "";
  rating.value = movie.rating ?? "";
}

function cancelEdit() {
  editingId = null;
  document.getElementById("form-title").innerText = "Add Movie";
  document.getElementById("submit-btn").innerText = "Add";
  document.getElementById("cancel-edit").style.display = "none";
  clearErrors();
}

async function deleteMovie(id) {
  if (!confirm("Delete this movie?")) return;

  const res = await fetch(`${API_BASE}/movies/${id}`, { method: "DELETE" });

  if (!res.ok && res.status !== 204) {
    alert("Delete failed. Try again.");
    return;
  }

  // After delete, the current page might be out of range (ex: deleting last item on last page).
  // Reload current page; backend will clamp page to valid range if needed.
  await loadMovies(currentPage);
  await loadStats();
}

async function loadStats() {
  const res = await fetch(`${API_BASE}/stats`);
  const data = await res.json();

  const top = data.topDirector
    ? `Top Director: ${data.topDirector} (${data.topDirectorCount})`
    : "Top Director: N/A";

  stats.innerText = `Total Movies: ${data.total} | Avg Rating: ${data.averageRating} | ${top}`;
}


// -----------------
// Validation UI
// -----------------
function clearErrors() {
  document.getElementById("form-errors").innerHTML = "";
  ["title", "director", "year", "rating"].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove("invalid");
  });
}

function showErrors(errors) {
  const box = document.getElementById("form-errors");
  box.innerHTML = "";

  Object.entries(errors).forEach(([field, msg]) => {
    const p = document.createElement("p");
    p.textContent = msg;
    box.appendChild(p);

    const el = document.getElementById(field);
    if (el) el.classList.add("invalid");
  });
}


// -----------------
// Small helpers
// -----------------
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodeJson(obj) {
  // Used to pass object into onclick safely
  return JSON.stringify(obj).replaceAll('"', "&quot;");
}
