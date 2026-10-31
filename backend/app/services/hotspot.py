import math
from dataclasses import dataclass
from typing import List, Sequence

from app.core.config import Settings, settings
from app.models.report import Report


@dataclass(frozen=True)
class ReportCluster:
    cluster_id: int
    is_noise: bool
    latitude: float
    longitude: float
    reports: List[Report]


def _validate_coordinate(value: object, minimum: float, maximum: float) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and minimum <= value <= maximum
    )


def cluster_reports(
    reports: Sequence[Report],
    config: Settings = settings,
) -> List[ReportCluster]:
    if not reports:
        return []

    for report in reports:
        if (
            not _validate_coordinate(report.latitude, -90.0, 90.0)
            or not _validate_coordinate(report.longitude, -180.0, 180.0)
        ):
            raise ValueError(f"Report {report.id} has invalid latitude or longitude")

    try:
        import numpy as np
        from sklearn.cluster import DBSCAN
    except ImportError as error:
        raise RuntimeError("Scikit-learn is required to calculate geographical hotspots") from error

    coordinates = np.radians(
        np.asarray([[report.latitude, report.longitude] for report in reports], dtype=float)
    )
    earth_radius_meters = config.EARTH_RADIUS_KM * 1000
    labels = DBSCAN(
        eps=config.HOTSPOT_RADIUS_METERS / earth_radius_meters,
        min_samples=config.HOTSPOT_MIN_SAMPLES,
        metric="haversine",
    ).fit_predict(coordinates)

    grouped: dict[int, List[Report]] = {}
    for report, label in zip(reports, labels):
        grouped.setdefault(int(label), []).append(report)

    clusters: List[ReportCluster] = []
    for label, grouped_reports in sorted(grouped.items()):
        if label == -1:
            for report in sorted(grouped_reports, key=lambda item: item.id):
                clusters.append(
                    ReportCluster(
                        cluster_id=-1,
                        is_noise=True,
                        latitude=float(report.latitude),
                        longitude=float(report.longitude),
                        reports=[report],
                    )
                )
            continue

        latitude, longitude = _spherical_centroid(grouped_reports)
        clusters.append(
            ReportCluster(
                cluster_id=label,
                is_noise=False,
                latitude=latitude,
                longitude=longitude,
                reports=sorted(grouped_reports, key=lambda item: item.id),
            )
        )
    return clusters


def _spherical_centroid(reports: Sequence[Report]) -> tuple[float, float]:
    vectors = []
    for report in reports:
        latitude = math.radians(float(report.latitude))
        longitude = math.radians(float(report.longitude))
        vectors.append(
            (
                math.cos(latitude) * math.cos(longitude),
                math.cos(latitude) * math.sin(longitude),
                math.sin(latitude),
            )
        )
    x = sum(vector[0] for vector in vectors)
    y = sum(vector[1] for vector in vectors)
    z = sum(vector[2] for vector in vectors)
    length = math.sqrt(x * x + y * y + z * z)
    if length < 1e-12:
        raise ValueError("Could not calculate a stable centre for the report cluster")
    return (
        math.degrees(math.atan2(z, math.sqrt(x * x + y * y))),
        math.degrees(math.atan2(y, x)),
    )


class HotspotService:
    @staticmethod
    def get_hotspots(
        reports: List[Report],
        config: Settings = settings,
    ) -> List[dict]:
        from app.services.risk import calculate_risk_score

        results = []
        for cluster in cluster_reports(reports, config):
            risk = calculate_risk_score(cluster.reports, config)
            results.append(
                {
                    "cluster_id": cluster.cluster_id,
                    "is_noise": cluster.is_noise,
                    "latitude": cluster.latitude,
                    "longitude": cluster.longitude,
                    "report_count": len(cluster.reports),
                    "report_ids": [report.id for report in cluster.reports],
                    "average_severity": risk.average_severity,
                    "evidence_ratio": risk.evidence_ratio,
                    "risk_score": risk.score,
                    "risk_classification": risk.classification,
                }
            )
        return results
