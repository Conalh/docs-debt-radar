from flask import Blueprint, Flask

app = Flask(__name__)
api = Blueprint("api", __name__)

@app.route("/health")
def health():
    return {"ok": True}

@api.route("/api/users", methods=["POST"])
def create_user():
    return {"created": True}

app.register_blueprint(api)
