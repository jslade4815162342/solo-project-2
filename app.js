const API_BASE = "https://solo-project-2-j3k5.onrender.com"; // <-- your Render backend
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  // Grab elements safely
  const form = document.getElementById("movie-form");
  form.addEventListener("submit", handleAdd);

  loadMovies(1);
  loadStats();
});

async function loadMovies(page = 1) {
  currentPage = page;

  try {
    const res = await fetch(`${API_BASE}/movies?page=${page}`);
    if (!res.ok) throw new Error(`Movies request failed: ${res.status}`);
    const data = await res.json();

    renderMovies(data.movies || []);
    renderPaging(data.page || 1, data.totalPages || 1);
  } catch (err) {
    console.error(err);
    document.getElementById("movie-table-body").innerHTML =
      `<tr><td colspan="5">Failed to load movies. Check API_BASE or backend.</td></tr>`;
  }
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
      <td>
        <button onclick="deleteMovie(${movie.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (movies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No movies found.</td></tr>`;
  }
}

function renderPaging(page, totalPages) {
  const div = document.getElementById("paging");
  div.innerHTML = "";

  const prev = document.createElement("button");
  prev.textContent = "Previous";
  prev.disabled = page <= 1;
  prev.onclick = () => loadMovies(page - 1);

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = page >= totalPages;
  next.onclick = () => loadMovies(page + 1);

  const indicator = document.createElement("span");
  indicator.textContent = ` Page ${page} of ${totalPages} `;

  div.append(prev, indicator, next);
}

async function handleAdd(e) {
  e.preventDefault();
  clearErrors();

  const titleEl = document.getElementById("title");
  const directorEl = document.getElementById("director");
  const yearEl = document.getElementById("year");
  const ratingEl = document.getElementById("rating");

  const movie = {
    title: titleEl.value.trim(),
    director: directorEl.value.trim(),
    year: Number(yearEl.value),
    rating: Number(ratingEl.value),
  };

  try {
    const res = await fetch(`${API_BASE}/movies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(movie),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.errors) showErrors(data.errors);
      else showErrors({ general: "Failed to add movie." });
      return;
    }

    e.target.reset();
    await loadMovies(currentPage);
    await loadStats();
  } catch (err) {
    console.error(err);
    showErrors({ general: "Network error while adding movie." });
  }
}

async function deleteMovie(id) {
  if (!confirm("Delete this movie?")) return;

  try {
    const res = await fetch(`${API_BASE}/movies/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);

    await loadMovies(currentPage);
    await loadStats();
  } catch (err) {
    console.error(err);
    alert("Delete failed. Check backend logs.");
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(`Stats request failed: ${res.status}`);
    const data = await res.json();

    document.getElementById("stats").innerText =
      `Total Movies: ${data.total}, Avg Rating: ${data.averageRating}` +
      (data.topDirector ? `, Top Director: ${data.topDirector} (${data.topDirectorCount})` : "");
  } catch (err) {
    console.error(err);
    document.getElementById("stats").innerText = "Failed to load stats.";
  }
}

function clearErrors() {
  document.getElementById("form-errors").innerText = "";
}

function showErrors(errors) {
  const box = document.getElementById("form-errors");
  box.innerText = Object.values(errors).join("\n");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
