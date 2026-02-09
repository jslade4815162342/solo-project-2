from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

DATA_FILE = "movies.json"

def load_movies():
    with open(DATA_FILE) as f:
        return json.load(f)

def save_movies(movies):
    with open(DATA_FILE, "w") as f:
        json.dump(movies, f, indent=2)

@app.route("/movies")
def list_movies():
    movies = load_movies()
    page = int(request.args.get("page", 1))
    size = 10
    start = (page - 1) * size
    end = start + size

    return jsonify({
        "movies": movies[start:end],
        "page": page,
        "totalPages": (len(movies) + size - 1) // size
    })

@app.route("/movies", methods=["POST"])
def add_movie():
    movies = load_movies()
    data = request.json
    data["id"] = max(m["id"] for m in movies) + 1
    movies.append(data)
    save_movies(movies)
    return jsonify(data), 201

@app.route("/movies/<int:id>", methods=["DELETE"])
def delete_movie(id):
    movies = load_movies()
    movies = [m for m in movies if m["id"] != id]
    save_movies(movies)
    return "", 204

@app.route("/stats")
def stats():
    movies = load_movies()
    avg = sum(m["rating"] for m in movies) / len(movies)
    return jsonify({
        "total": len(movies),
        "averageRating": round(avg, 2)
    })

if __name__ == "__main__":
    app.run()
