from typing import List
from app.models.report import Report


class HotspotService:
    @staticmethod
    def get_hotspots(reports: List[Report]) -> List[dict]:
        # Placeholder for future ML-based hotspot detection
        # Will integrate Sentence Transformers and DBSCAN later
        return []
