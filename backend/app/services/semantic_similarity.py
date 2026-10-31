import logging
import math
from dataclasses import dataclass
from threading import Lock
from typing import Any, Callable, List, Optional, Sequence

from app.core.config import settings
from app.models.report import Report

logger = logging.getLogger(__name__)


class EmptyDescriptionError(ValueError):
    """Raised when a report has no text to analyze."""


class SemanticAnalysisError(RuntimeError):
    """Raised when the model cannot load or generate embeddings."""


@dataclass(frozen=True)
class SimilarityMatch:
    report_id: int
    description: str
    similarity_score: float


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if len(left) != len(right):
        raise ValueError("Embedding vectors must have the same dimensions")
    if len(left) == 0:
        raise ValueError("Embedding vectors must not be empty")

    dot_product = sum(float(a) * float(b) for a, b in zip(left, right))
    left_norm = math.sqrt(sum(float(value) ** 2 for value in left))
    right_norm = math.sqrt(sum(float(value) ** 2 for value in right))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return max(-1.0, min(1.0, dot_product / (left_norm * right_norm)))


def _load_sentence_transformer() -> Any:
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.SEMANTIC_MODEL_NAME, device="cpu")


class SemanticSimilarityService:
    def __init__(self, model_loader: Callable[[], Any] = _load_sentence_transformer):
        self._model_loader = model_loader
        self._model: Optional[Any] = None
        self._model_lock = Lock()

    def _get_model(self) -> Any:
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    try:
                        self._model = self._model_loader()
                    except Exception as error:
                        logger.exception("Could not load the semantic similarity model")
                        raise SemanticAnalysisError("Could not load semantic similarity model") from error
        return self._model

    def find_similar_reports(
        self,
        report: Report,
        reports: Sequence[Report],
        threshold: float = settings.SEMANTIC_SIMILARITY_THRESHOLD,
    ) -> List[SimilarityMatch]:
        if not report.description or not report.description.strip():
            raise EmptyDescriptionError("Report description must not be empty")

        candidates = [
            candidate
            for candidate in reports
            if candidate.id != report.id and candidate.description and candidate.description.strip()
        ]
        if not candidates:
            return []

        descriptions = [report.description, *(candidate.description for candidate in candidates)]
        try:
            embeddings = self._get_model().encode(
                descriptions,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            matches = [
                SimilarityMatch(
                    report_id=candidate.id,
                    description=candidate.description,
                    similarity_score=cosine_similarity(embeddings[0], embeddings[index]),
                )
                for index, candidate in enumerate(candidates, start=1)
            ]
        except SemanticAnalysisError:
            raise
        except Exception as error:
            logger.exception("Could not generate semantic similarity embeddings")
            raise SemanticAnalysisError("Could not generate semantic similarity embeddings") from error

        return sorted(
            (match for match in matches if match.similarity_score >= threshold),
            key=lambda match: (-match.similarity_score, match.report_id),
        )


semantic_similarity_service = SemanticSimilarityService()
