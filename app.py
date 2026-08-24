"""
Minutes — Meeting Decision & Action Tracker
A tiny Flask website. Beginner-friendly, one file for the backend.

WHAT THIS FILE DOES:
1. Starts a small web server (Flask)
2. Shows the homepage (templates/index.html)
3. Has one "brain" route (/analyze) that reads meeting text
   and finds decisions + action items using simple rules
"""

from flask import Flask, render_template, request, jsonify
import re

app = Flask(__name__)

# ---------- STEP 1: words that hint a sentence is a DECISION ----------
DECISION_WORDS = re.compile(
    r"\b(decided|agreed|approved|finalized|confirmed|will go with)\b",
    re.IGNORECASE
)

# ---------- STEP 2: pattern that hints a sentence is an ACTION ITEM ----------
# Looks for: "Name will/to/should do something"
ACTION_PATTERN = re.compile(
    r"\b([A-Z][a-z]+)\s+(will|to|should)\s+([a-zA-Z ,]+)"
)

# ---------- STEP 3: pattern that finds a due date like "by Monday" ----------
DUE_PATTERN = re.compile(
    r"\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
    r"next week|tomorrow)\b",
    re.IGNORECASE
)


def split_into_sentences(text):
    """Break the pasted meeting text into small sentence pieces."""
    lines = text.split("\n")
    sentences = []
    for line in lines:
        # split each line further on '. ', '! ', '? '
        pieces = re.split(r"(?<=[.!?])\s+", line.strip())
        for piece in pieces:
            if piece:
                sentences.append(piece)
    return sentences


def clean_speaker_label(sentence):
    """Remove a leading 'Name:' speaker tag, e.g. 'Priya: We decided...' """
    return re.sub(r"^[A-Z][a-z]+:\s*", "", sentence)


def extract_decisions_and_actions(text):
    """This is the 'intelligent' part (simple rule-based version)."""
    decisions = []
    actions = []

    for sentence in split_into_sentences(text):
        clean = clean_speaker_label(sentence)

        if DECISION_WORDS.search(sentence):
            decisions.append(clean)
        else:
            match = ACTION_PATTERN.search(sentence)
            if match:
                who = match.group(1)
                due_match = DUE_PATTERN.search(sentence)
                due = due_match.group(1) if due_match else None
                actions.append({"text": clean, "who": who, "due": due})

    return decisions, actions


@app.route("/")
def home():
    """Show the homepage."""
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Receives meeting notes from the browser (as JSON),
    runs the extraction logic, and sends back decisions + actions.
    """
    data = request.get_json()
    text = data.get("text", "")
    dept = data.get("dept", "General")
    meeting_date = data.get("date", "")

    decisions, actions = extract_decisions_and_actions(text)

    return jsonify({
        "decisions": decisions,
        "actions": actions,
        "dept": dept,
        "date": meeting_date
    })


import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)