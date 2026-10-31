from types import SimpleNamespace

import numpy as np
import pytest

from app.services.semantic_similarity import (
    EmptyDescriptionError,
    SemanticAnalysisError,
    SemanticSimilarityService,
    cosine_similarity,
)


class FakeModel:
    def __init__(self, embeddings):
        self.embeddings = embeddings
        self.encoded_texts = []

    def encode(self, texts, convert_to_numpy, show_progress_bar):
        assert convert_to_numpy is True
        assert show_progress_bar is False
        self.encoded_texts.append(texts)
        return np.asarray(self.embeddings[: len(texts)])


def report(report_id, description):
    return SimpleNamespace(id=report_id, description=description)


def test_cosine_similarity():
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0
    assert cosine_similarity([1.0, 0.0], [2.0, 0.0]) == pytest.approx(1.0)
    assert cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0


def test_find_similar_reports_applies_threshold_and_sorts():
    model = FakeModel([[1, 0], [0.8, 0.6], [0, 1]])
    service = SemanticSimilarityService(model_loader=lambda: model)
    target = report(1, "A car nearly hit a cyclist")
    candidates = [
        report(2, "A driver nearly hit a person on a bicycle"),
        report(3, "A car was parked on the street"),
    ]

    matches = service.find_similar_reports(target, candidates, threshold=0.55)

    assert [(match.report_id, match.similarity_score) for match in matches] == [
        (2, pytest.approx(0.8))
    ]
    assert matches[0].description == candidates[0].description
    assert model.encoded_texts == [[target.description, candidates[0].description, candidates[1].description]]


def test_model_is_loaded_once_for_multiple_comparisons():
    model = FakeModel([[1, 0], [1, 0]])
    load_count = 0

    def load_model():
        nonlocal load_count
        load_count += 1
        return model

    service = SemanticSimilarityService(model_loader=load_model)
    target = report(1, "A vehicle cut me off")
    candidates = [report(2, "A vehicle cut in front of me")]

    service.find_similar_reports(target, candidates)
    service.find_similar_reports(target, candidates)

    assert load_count == 1
    assert len(model.encoded_texts) == 2


def test_empty_target_description_is_rejected_without_loading_model():
    service = SemanticSimilarityService(model_loader=lambda: pytest.fail("model must not load"))

    with pytest.raises(EmptyDescriptionError, match="must not be empty"):
        service.find_similar_reports(report(1, "  "), [report(2, "A car nearly hit me")])


def test_no_candidates_does_not_load_model():
    service = SemanticSimilarityService(model_loader=lambda: pytest.fail("model must not load"))

    assert service.find_similar_reports(report(1, "A car nearly hit me"), []) == []


def test_model_loading_error_is_reported():
    def fail_to_load():
        raise OSError("model files unavailable")

    service = SemanticSimilarityService(model_loader=fail_to_load)

    with pytest.raises(SemanticAnalysisError, match="Could not load"):
        service.find_similar_reports(
            report(1, "A car nearly hit me"),
            [report(2, "A vehicle nearly hit me")],
        )


def test_mismatched_embedding_dimensions_are_rejected():
    with pytest.raises(ValueError, match="same dimensions"):
        cosine_similarity([1.0, 0.0], [1.0])
