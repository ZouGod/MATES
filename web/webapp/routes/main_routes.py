from flask import Blueprint, render_template

main_bp = Blueprint("main", __name__)

@main_bp.route("/")
def index():
    return render_template("index.html", title="Home")
@main_bp.route("/explore")
def explore():
    return render_template(
        "explore.html",
        title="Explore"
    )