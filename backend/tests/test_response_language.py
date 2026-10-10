"""Tests for backend response language localization."""
import pytest


def test_ask_question_response_language_hindi(client):
    res = client.post(
        "/api/v1/ask",
        json={
            "query": "टमाटर के पत्ते पीले क्यों हो रहे हैं?",
            "cropId": "tomato",
            "regionId": "temperate",
            "responseLanguage": "hi",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["responseLanguage"] == "hi"
    assert "साक्ष्य" in data["summary"] or "सत्यापन" in data["summary"] or "कृषि" in data["summary"]
    # Check that assessment is populated and in Hindi
    if "assessment" in data and data["assessment"]:
        assert len(data["assessment"]["visibleObservations"]) > 0
        assert "लक्षण" in data["assessment"]["likelyIssue"] or "जांची" in str(data["assessment"]["visibleObservations"]) or "तस्वीर" in str(data["assessment"]["visibleObservations"])


def test_ask_question_response_language_tamil(client):
    res = client.post(
        "/api/v1/ask",
        json={
            "query": "தக்காளி இலைகள் மஞ்சள் நிறமாக மாறுவது ஏன்?",
            "cropId": "tomato",
            "regionId": "temperate",
            "responseLanguage": "ta",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["responseLanguage"] == "ta"
    assert "சான்று" in data["summary"] or "அறிவியல்" in data["summary"] or "சரிபார்க்கப்பட்ட" in data["summary"]


def test_ask_question_response_language_telugu(client):
    res = client.post(
        "/api/v1/ask",
        json={
            "query": "టమాటా ఆకులు ఎందుకు పసుపు రంగులోకి మారుతున్నాయి?",
            "cropId": "tomato",
            "regionId": "temperate",
            "responseLanguage": "te",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["responseLanguage"] == "te"
    assert "లక్షణ" in data["summary"] or "ఆధార" in data["summary"]
