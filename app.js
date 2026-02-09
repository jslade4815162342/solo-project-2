const API_BASE = "https://solo-project-2-j3k5.onrender.com";
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  loadMovies(1);
  loadStats();
  document.getElementById("movie-form").addEventListener("submit", handleAdd);
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
      <td>${movie.title}</td>
      <td>${movie.year}</td>
      <td>${movie.rating}</td>
      <td>
        <button onclick="deleteMovie(${movie.id})">Delete</button>
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

  div.append(prev, ` Page ${page} of ${totalPages} `, next);
}

async function handleAdd(e) {
  e.preventDefault();

  const movie = {
    title: title.value,
    year: Number(year.value),
    rating: Number(rating.value)
  };

  await fetch(`${API_BASE}/movies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(movie)
  });

  e.target.reset();
  loadMovies(currentPage);
  loadStats();
}

async function deleteMovie(id) {
  if (!confirm("Delete this movie?")) return;
  await fetch(`${API_BASE}/movies/${id}`, { method: "DELETE" });
  loadMovies(currentPage);
  loadStats();
}

async function loadStats() {
  const res = await fetch(`${API_BASE}/stats`);
  const data = await res.json();
  stats.innerText = `Total Movies: ${data.total}, Avg Rating: ${data.averageRating}`;

}

