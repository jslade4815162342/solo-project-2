from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# In-memory storage (Render-safe)
movies = [
    { "id": 1, "title": "The Shawshank Redemption", "year": 1994, "rating": 9.3 },
    { "id": 2, "title": "The Godfather", "year": 1972, "rating": 9.2 },
    { "id": 3, "title": "The Dark Knight", "year": 2008, "rating": 9.0 },
    { "id": 4, "title": "Pulp Fiction", "year": 1994, "rating": 8.9 },
    { "id": 5, "title": "Forrest Gump", "year": 1994, "rating": 8.8 }
]

@app.route("/movies")
def list_movies():
    page = int(request.args.get("page", 1))
    size = 10
    start = (page - 1) * size
    end = start + size

    return jsonify({
        "movies": movies[start:end],
        "page": page,
        "totalPages": max(1, (len(movies) + size - 1) // size)
    })

@app.route("/movies", methods=["POST"])
def add_movie():
    data = request.json
    next_id = max(m["id"] for m in movies) + 1 if movies else 1
    data["id"] = next_id
    movies.append(data)
    return jsonify(data), 201

@app.route("/movies/<int:id>", methods=["DELETE"])
def delete_movie(id):
    global movies
    movies = [m for m in movies if m["id"] != id]
    return "", 204

@app.route("/stats")
def stats():
    if not movies:
        return jsonify({"total": 0, "averageRating": 0})

    avg = sum(m["rating"] for m in movies) / len(movies)
    return jsonify({
        "total": len(movies),
        "averageRating": round(avg, 2)
    })
