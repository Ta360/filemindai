"""
Matplotlib chart microservice for the Google Drive LLM dashboard.

Renders real, per-agent "what did I search for today" bar and pie charts as
PNG images. The Node backend aggregates real agent_activity rows (topic ->
count) and posts that data here; this service does no data collection of its
own and holds no API keys.

Run:
    pip install -r requirements.txt
    python app.py            # listens on :5001
"""

import io
import os

import matplotlib

matplotlib.use("Agg")  # headless, no GUI backend needed
import matplotlib.pyplot as plt
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PIE_PALETTE = ["#3865ff", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#0ea5e9", "#64748b", "#14b8a6", "#eab308"]


def _empty_chart(title: str):
    fig, ax = plt.subplots(figsize=(7, 4), dpi=140)
    ax.text(0.5, 0.5, "No search activity yet", ha="center", va="center", fontsize=13, color="#94a3b8")
    ax.set_title(title, fontsize=13, fontweight="bold")
    ax.axis("off")
    return fig


def _png_response(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", transparent=True)
    plt.close(fig)
    buf.seek(0)
    return send_file(buf, mimetype="image/png")


@app.route("/health")
def health():
    return jsonify({"ok": True})


@app.route("/chart/bar", methods=["POST"])
def bar_chart():
    body = request.get_json(force=True) or {}
    title = body.get("title", "Daily Search Activity")
    labels = body.get("labels", [])
    values = body.get("values", [])

    if not labels or not values:
        return _png_response(_empty_chart(title))

    # Truncate long topic names so bars/labels never collide with each other.
    short_labels = [lbl if len(lbl) <= 18 else lbl[:16].rstrip() + "…" for lbl in labels]

    colors = [PIE_PALETTE[i % len(PIE_PALETTE)] for i in range(len(labels))]
    fig, ax = plt.subplots(figsize=(max(9, len(labels) * 1.8), 6.5), dpi=160)
    bars = ax.bar(short_labels, values, color=colors, edgecolor="none", width=0.6)
    ax.bar_label(bars, padding=4, fontsize=13, fontweight="bold")
    ax.set_title(title, fontsize=17, fontweight="bold", pad=16)
    ax.set_xlabel("Topic / Channel / Person searched", fontsize=13, labelpad=12)
    ax.set_ylabel("Videos / results viewed", fontsize=13)
    ax.tick_params(axis="y", labelsize=11)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.xticks(rotation=45, ha="right", fontsize=12)
    fig.tight_layout()
    return _png_response(fig)


@app.route("/chart/pie", methods=["POST"])
def pie_chart():
    body = request.get_json(force=True) or {}
    title = body.get("title", "Search Share by Topic")
    labels = body.get("labels", [])
    values = body.get("values", [])

    if not labels or not values:
        return _png_response(_empty_chart(title))

    short_labels = [lbl if len(lbl) <= 24 else lbl[:22].rstrip() + "…" for lbl in labels]

    # Labels go in a side legend instead of floating text around the circle —
    # radiating labels collide and become unreadable once there are several
    # slices or a few very small ones.
    def pct_label(pct):
        # Hide the percent text on slivers under 4% — at that size the text
        # itself starts overlapping its neighbors; the legend still names them.
        return f"{pct:.0f}%" if pct >= 4 else ""

    fig, ax = plt.subplots(figsize=(9, 5.7), dpi=160)
    colors = [PIE_PALETTE[i % len(PIE_PALETTE)] for i in range(len(labels))]
    wedges, _, autotexts = ax.pie(
        values,
        autopct=pct_label,
        colors=colors,
        startangle=90,
        textprops={"fontsize": 12, "fontweight": "bold", "color": "black"},
        pctdistance=0.75,
        radius=0.9,
    )
    ax.legend(
        wedges,
        short_labels,
        title="Topic / Channel / Person",
        loc="center left",
        bbox_to_anchor=(1.0, 0.5),
        fontsize=11,
        title_fontsize=12,
        frameon=False,
    )
    ax.set_title(title, fontsize=14, fontweight="bold", pad=14)
    ax.axis("equal")
    fig.tight_layout()
    return _png_response(fig)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
