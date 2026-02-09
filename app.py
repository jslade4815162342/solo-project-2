from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
import json
import os
import tempfile

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

PAGE_SIZE = 10

# Use a persistent disk path on Render if you attach one (recommended)
# Example Render disk mount: /data
DATA_DIR = Path(os.environ.get("DATA_DIR", "."))  # "." works locally
MOVIES_PATH = DATA_DIR / "movies.json"


# -------------------------
# JSON helpers
# -------------------------
def _ensure_seed_data():
    """If movies.json doesn't exist, create it with a seeded dataset (30+ records expected)."""
    if MOVIES_PATH.exists():
        return

    # If you keep a seed file in repo, you can copy it here. For simplicity, create an empty list.
    # But your rubric requires 30+ on start, so you should commit movies.json with 30+ records.
    MOVIES_PATH.write_text("[]", encoding="utf-8")


def _read_movies():
    _ensure_seed_data()
    try:
        raw = MOVIES_PATH.read_text(encoding="utf-8").strip()
        if not raw:
            return []
        data = json.loads(raw)
        if not isinstance(data, list):
            return []
        return data
    except Exception:
        # If file is corrupted, don't crash the app
        return []


def _atomic_write_json(path: Path, data):
    """Write JSON safely (minimize risk of corruption)."""
    path.parent.mkdir(parents=True, exist_ok=True)

    fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), prefix="tmp_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def _write_movies(movies):
    _atomic_write_json(MOVIES_PATH, movies)


# -------------------------
# Validation
# -------------------------
def _validate_movie(payload, is_update=False):
    errors = {}

    def required_str(field, min_len=1, max_len=120):
        val = payload.get(field)
        if val is None or not str(val).strip():
            errors[field] = f"{field.capitalize()} is required."
            return None
        s = str(val).strip()
        if len(s) < min_len:
            errors[field] = f"{field.capitalize()} must be at least {min_len} characters."
        if len(s) > max_len:
            errors[field] = f"{field.capitalize()} must be {max_len} characters or less."
        return s

    title = required_str("title", 1, 120)
    director = required_str("director", 1, 120)

    # year
    year = payload.get("year")
    try:
        year = int(year)
        if year < 1888 or year > 2100:
            errors["year"] = "Year must be between 1888 and 2100."
    except Exception:
        errors["year"] = "Year must be a whole number."

    # rating
    rating = payload.get("rating")
    try:
        rating = float(rating)
        if rating < 0 or rating > 10:
            errors["rating"] = "Rating must be between 0 and 10."
        rating = round(rating, 1)
    except Exception:
        errors["rating"] = "Rating must be a number."

    if errors:
        return None, errors

    return {
        "title": title,
        "director": director,
        "year": year,
        "rating": rating
    }, None


# -------------------------
# Routes
# -------------------------

@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.get("/movies")
def list_movies():
    movies = _read_movies()
    page = request.args.get("page", "1")
    try:
        page = int(page)
    except Exception:
        page = 1
    if page < 1:
        page = 1

    total = len(movies)
    total_pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
    if page > total_pages:
        page = total_pages

    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE

    return jsonify({
        "movies": movies[start:end],
        "page": page,
        "pageSize": PAGE_SIZE,
        "total": total,
        "totalPages": total_pages
    })


@app.post("/movies")
def add_movie():
    payload = request.get_json(silent=True) or {}
    movie, errors = _validate_movie(payload)
    if errors:
        return jsonify({"errors": errors}), 400

    movies = _read_movies()
    next_id = (max((m.get("id", 0) for m in movies), default=0) + 1)
    movie["id"] = next_id
    movies.append(movie)
    _write_movies(movies)
    return jsonify(movie), 201


@app.put("/movies/<int:movie_id>")
def update_movie(movie_id):
    payload = request.get_json(silent=True) or {}
    movie, errors = _validate_movie(payload, is_update=True)
    if errors:
        return jsonify({"errors": errors}), 400

    movies = _read_movies()
    found = False
    for m in movies:
        if int(m.get("id", -1)) == movie_id:
            m.update(movie)
            found = True
            break

    if not found:
        return jsonify({"message": "Movie not found."}), 404

    _write_movies(movies)
    return jsonify({"id": movie_id, **movie})


@app.delete("/movies/<int:movie_id>")
def delete_movie(movie_id):
    movies = _read_movies()
    new_movies = [m for m in movies if int(m.get("id", -1)) != movie_id]

    if len(new_movies) == len(movies):
        return jsonify({"message": "Movie not found."}), 404

    _write_movies(new_movies)
    return "", 204


@app.get("/stats")
def stats():
    movies = _read_movies()
    total = len(movies)

    if total == 0:
        return jsonify({
            "total": 0,
            "averageRating": 0,
            "topDirector": None,
            "topDirectorCount": 0
        })

    avg = sum(float(m.get("rating", 0)) for m in movies) / total
    avg = round(avg, 2)

    # Domain stat: top director by count
    counts = {}
    for m in movies:
        d = (m.get("director") or "").strip()
        if d:
            counts[d] = counts.get(d, 0) + 1

    top_director = max(counts, key=counts.get) if counts else None
    top_count = counts.get(top_director, 0) if top_director else 0

    return jsonify({
        "total": total,
        "averageRating": avg,
        "topDirector": top_director,
        "topDirectorCount": top_count
    })
