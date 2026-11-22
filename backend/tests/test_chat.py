from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.gemini_client import (
    GeminiConfigError,
    GeminiRateLimitError,
    GeminiResult,
    GeminiTimeoutError,
    LLMTokenUsage,
)

client = TestClient(app)


def _mock_gemini_result(text="Mocked Gemini response", prompt_tokens=18, output_tokens=42):
    return GeminiResult(
        text=text,
        model="gemini-2.5-flash",
        latency_ms=320.5,
        usage=LLMTokenUsage(
            prompt_tokens=prompt_tokens,
            output_tokens=output_tokens,
            thinking_tokens=0,
            total_tokens=prompt_tokens + output_tokens,
        ),
        finish_reason="STOP",
    )


def _setup_mock_gemini(mock_gemini, token_map=None, default_tokens=12):
    """Configures mock_gemini to properly emulate GeminiService and its SDK client."""
    mock_gemini.is_configured.return_value = True
    mock_gemini.model = "gemini-2.5-flash"

    token_dict = token_map or {}

    def mock_count_tokens(model, contents):
        tokens = token_dict.get(contents, default_tokens)
        resp = MagicMock()
        resp.total_tokens = tokens
        return resp

    mock_client = MagicMock()
    mock_client.models.count_tokens.side_effect = mock_count_tokens
    mock_gemini.client = mock_client
    mock_gemini.count_tokens.side_effect = lambda text: token_dict.get(text, default_tokens)
    mock_gemini.generate.return_value = _mock_gemini_result()


@patch("app.api.chat.gemini_service")
def test_chat_success(mock_gemini):
    _setup_mock_gemini(mock_gemini, default_tokens=12)
    mock_gemini.generate.return_value = _mock_gemini_result(text="ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ವಿವರಣೆ")

    payload = {
        "prompt": "ಕ್ವಾಂಟಮ್ ಎಂದರೇನು?",
        "optimize": True,
        "include_candidates": True,
    }

    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["original_prompt"] == "ಕ್ವಾಂಟಮ್ ಎಂದರೇನು?"
    assert data["optimized_prompt"] == "ಕ್ವಾಂಟಮ್ ಎಂದರೇನು?"
    assert data["chosen_candidate"] == "original"
    assert len(data["candidates"]) == 1
    assert data["candidates"][0]["name"] == "original"
    assert data["candidates"][0]["tokens"] == 12

    # Tokens verification
    tokens = data["tokens"]
    assert tokens["tokenizer"] == "gemini-countTokens"
    assert tokens["original_input"] == 12
    assert tokens["optimized_input"] == 12
    assert tokens["saved"] == 0
    assert tokens["saved_percent"] == 0.0
    assert tokens["llm_prompt_tokens"] == 18
    assert tokens["llm_output_tokens"] == 42
    assert tokens["llm_total_tokens"] == 60

    # Response and latency
    assert data["response"] == "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್ ವಿವರಣೆ"
    assert data["latency_ms"]["llm"] == 320.5
    assert data["latency_ms"]["optimizer"] >= 0.0
    assert data["latency_ms"]["total"] == round(data["latency_ms"]["optimizer"] + 320.5, 2)
    assert data["model"] == "gemini-2.5-flash"
    assert data["error"] is None


@patch("app.api.chat.gemini_service")
def test_chat_optimization_success_concise(mock_gemini):
    # Prompt with excessive horizontal spacing: concise candidate wins and saves tokens
    orig_prompt = "ನನಗೆ    ಬೆಂಗಳೂರಿನ    ಮಾಹಿತಿ    ಬೇಕು"
    opt_prompt = "ನನಗೆ ಬೆಂಗಳೂರಿನ ಮಾಹಿತಿ ಬೇಕು"
    token_map = {
        orig_prompt: 18,
        opt_prompt: 12,
    }
    _setup_mock_gemini(mock_gemini, token_map=token_map)
    mock_gemini.generate.return_value = _mock_gemini_result(text="ಬೆಂಗಳೂರು ಕರ್ನಾಟಕದ ರಾಜಧಾನಿ")

    payload = {
        "prompt": orig_prompt,
        "optimize": True,
        "include_candidates": True,
    }

    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["original_prompt"] == orig_prompt
    assert data["optimized_prompt"] == opt_prompt
    assert data["chosen_candidate"] == "concise"

    # Verify candidates list contains baseline original and winning concise
    assert len(data["candidates"]) == 2
    assert data["candidates"][0]["name"] == "original"
    assert data["candidates"][0]["tokens"] == 18
    assert data["candidates"][1]["name"] == "concise"
    assert data["candidates"][1]["tokens"] == 12

    # Token savings
    tokens = data["tokens"]
    assert tokens["original_input"] == 18
    assert tokens["optimized_input"] == 12
    assert tokens["saved"] == 6
    assert tokens["saved_percent"] == 33.33

    # Verification: EXACT optimized prompt was sent to Gemini
    mock_gemini.generate.assert_called_once_with(prompt=opt_prompt, temperature=0.0)


@patch("app.api.chat.gemini_service")
def test_chat_optimize_false_bypasses_optimizer(mock_gemini):
    orig_prompt = "ನನಗೆ    ಬೆಂಗಳೂರಿನ    ಮಾಹಿತಿ    ಬೇಕು"
    _setup_mock_gemini(mock_gemini, default_tokens=15)
    mock_gemini.generate.return_value = _mock_gemini_result()

    payload = {
        "prompt": orig_prompt,
        "optimize": False,
        "include_candidates": True,
    }

    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200

    data = response.json()
    # When optimize=False, original prompt is used directly
    assert data["original_prompt"] == orig_prompt
    assert data["optimized_prompt"] == orig_prompt
    assert data["chosen_candidate"] == "original"
    assert data["latency_ms"]["optimizer"] == 0.0

    # Verification: original prompt sent to Gemini generate
    mock_gemini.generate.assert_called_once_with(prompt=orig_prompt, temperature=0.0)


@patch("app.api.chat.gemini_service")
def test_chat_optimizer_failure_falls_back_to_original(mock_gemini):
    orig_prompt = "ನನಗೆ ೫ ಪುಸ್ತಕಗಳು ಬೇಕು"
    mock_gemini.is_configured.return_value = True
    mock_gemini.model = "gemini-2.5-flash"

    # Make optimizer count_tokens call raise an unexpected runtime error
    mock_client = MagicMock()
    mock_client.models.count_tokens.side_effect = RuntimeError("Token counting service crash")
    mock_gemini.client = mock_client
    mock_gemini.count_tokens.return_value = 10
    mock_gemini.generate.return_value = _mock_gemini_result(text="೫ ಪುಸ್ತಕಗಳು")

    payload = {
        "prompt": orig_prompt,
        "optimize": True,
    }

    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200

    data = response.json()
    # Safe fallback to original prompt
    assert data["original_prompt"] == orig_prompt
    assert data["optimized_prompt"] == orig_prompt
    assert data["chosen_candidate"] == "original"
    # Gemini still receives the original prompt and answers successfully
    mock_gemini.generate.assert_called_once_with(prompt=orig_prompt, temperature=0.0)


@patch("app.api.chat.gemini_service")
def test_chat_optimizer_passes_configured_model(mock_gemini):
    orig_prompt = "ಕನ್ನಡ ಪಠ್ಯ"
    mock_gemini.is_configured.return_value = True
    mock_gemini.model = "custom-gemini-model-test"

    call_history = []

    def capture_count(model, contents):
        call_history.append((model, contents))
        resp = MagicMock()
        resp.total_tokens = 8
        return resp

    mock_client = MagicMock()
    mock_client.models.count_tokens.side_effect = capture_count
    mock_gemini.client = mock_client
    mock_gemini.generate.return_value = _mock_gemini_result()

    response = client.post("/api/v1/chat", json={"prompt": orig_prompt, "optimize": True})
    assert response.status_code == 200

    # Ensure model passed to count_tokens matches gemini_service.model
    assert len(call_history) > 0
    for model_arg, _ in call_history:
        assert model_arg == "custom-gemini-model-test"


@patch("app.api.chat.gemini_service")
def test_chat_optimizer_failure_does_not_hide_gemini_error(mock_gemini):
    # If optimizer falls back to original prompt, but Gemini generate fails,
    # the genuine Gemini error is surfaced (not suppressed by fallback)
    orig_prompt = "ಟೆಸ್ಟ್ ಪ್ರಾಂಪ್ಟ್"
    mock_gemini.is_configured.return_value = True
    mock_gemini.model = "gemini-2.5-flash"

    mock_client = MagicMock()
    mock_client.models.count_tokens.side_effect = RuntimeError("Optimizer error")
    mock_gemini.client = mock_client
    mock_gemini.count_tokens.return_value = 10
    mock_gemini.generate.side_effect = GeminiRateLimitError("Quota exhausted", retry_after_s=20.0)

    response = client.post("/api/v1/chat", json={"prompt": orig_prompt, "optimize": True})
    assert response.status_code == 429
    data = response.json()
    assert data["error"]["code"] == "rate_limited"
    assert data["error"]["retry_after_s"] == 20.0


@patch("app.api.chat.gemini_service")
def test_chat_missing_api_key_surfaces_502(mock_gemini):
    mock_gemini.is_configured.return_value = False
    mock_gemini.generate.side_effect = GeminiConfigError("API key not configured")

    response = client.post("/api/v1/chat", json={"prompt": "Test"})
    assert response.status_code == 502
    data = response.json()
    assert data["error"]["code"] == "llm_unavailable"


def test_chat_empty_prompt_validation():
    # Whitespace only
    response = client.post("/api/v1/chat", json={"prompt": "    "})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "invalid_request"

    # Empty string
    response = client.post("/api/v1/chat", json={"prompt": ""})
    assert response.status_code == 422


@patch("app.api.chat.gemini_service")
def test_chat_rate_limited(mock_gemini):
    _setup_mock_gemini(mock_gemini)
    mock_gemini.generate.side_effect = GeminiRateLimitError(
        "Rate limit exceeded",
        retry_after_s=15.0,
    )

    response = client.post("/api/v1/chat", json={"prompt": "Test"})
    assert response.status_code == 429
    data = response.json()
    assert data["error"]["code"] == "rate_limited"
    assert data["error"]["retry_after_s"] == 15.0


@patch("app.api.chat.gemini_service")
def test_chat_timeout(mock_gemini):
    _setup_mock_gemini(mock_gemini)
    mock_gemini.generate.side_effect = GeminiTimeoutError("Request timed out")

    response = client.post("/api/v1/chat", json={"prompt": "Test"})
    assert response.status_code == 504
    data = response.json()
    assert data["error"]["code"] == "llm_timeout"


@patch("app.api.chat.gemini_service")
def test_chat_gemini_unconfigured(mock_gemini):
    mock_gemini.is_configured.return_value = False
    mock_gemini.generate.side_effect = GeminiConfigError("API key not configured")

    response = client.post("/api/v1/chat", json={"prompt": "Test"})
    assert response.status_code == 502
    data = response.json()
    assert data["error"]["code"] == "llm_unavailable"


@patch("app.api.chat.gemini_service")
def test_chat_token_counting_failure_falls_back_to_null(mock_gemini):
    # When token counting fails inside the optimizer or fallback,
    # return null for counts and do NOT fabricate metrics
    mock_gemini.is_configured.return_value = True
    mock_gemini.model = "gemini-2.5-flash"
    mock_client = MagicMock()
    mock_client.models.count_tokens.side_effect = Exception("Token counting network error")
    mock_gemini.client = mock_client
    mock_gemini.count_tokens.side_effect = Exception("Token counting network error")
    mock_gemini.generate.return_value = _mock_gemini_result(text="Successful answer")

    response = client.post("/api/v1/chat", json={"prompt": "Hello", "optimize": True})
    assert response.status_code == 200

    data = response.json()
    assert data["response"] == "Successful answer"
    tokens = data["tokens"]
    assert tokens["original_input"] is None
    assert tokens["optimized_input"] is None
    assert tokens["saved"] is None
    assert tokens["saved_percent"] is None
    assert tokens["llm_prompt_tokens"] == 18
    assert tokens["llm_output_tokens"] == 42


@patch("app.api.chat.gemini_service")
def test_chat_candidates_omitted_when_include_candidates_false(mock_gemini):
    _setup_mock_gemini(mock_gemini, default_tokens=5)

    payload = {
        "prompt": "Test",
        "include_candidates": False,
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["candidates"] == []


@patch("app.api.chat.gemini_service")
def test_frontend_compatibility(mock_gemini):
    _setup_mock_gemini(mock_gemini, default_tokens=8)
    mock_gemini.generate.return_value = _mock_gemini_result(text="Frontend answer")

    payload = {"prompt": "Legacy prompt from frontend"}
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["prompt"] == "Legacy prompt from frontend"
    assert data["response"] == "Frontend answer"


@patch("app.api.chat.gemini_service")
def test_no_secret_leakage_in_error(mock_gemini):
    leaky_secret = "AIzaSySecretApiKey12345"
    _setup_mock_gemini(mock_gemini)
    mock_gemini.generate.side_effect = Exception(f"Internal crash with {leaky_secret}")

    response = client.post("/api/v1/chat", json={"prompt": "Test"})
    assert response.status_code == 500
    assert leaky_secret not in response.text
    for val in response.headers.values():
        assert leaky_secret not in val
