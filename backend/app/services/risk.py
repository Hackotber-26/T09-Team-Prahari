from dataclasses import dataclass
from typing import Sequence

from app.core.config import Settings, settings
from app.models.report import Report


@dataclass(frozen=True)
class RiskScore:
    average_severity: float
    evidence_ratio: float
    score: float
    classification: str


def calculate_risk_score(
    reports: Sequence[Report],
    config: Settings = settings,
) -> RiskScore:
    if not reports:
        return RiskScore(
            average_severity=0.0,
            evidence_ratio=0.0,
            score=0.0,
            classification="Low",
        )

    for report in reports:
        if (
            isinstance(report.severity, bool)
            or not isinstance(report.severity, int)
            or not 1 <= report.severity <= 5
        ):
            raise ValueError(f"Report {report.id} has invalid severity")

    report_count = len(reports)
    average_severity = sum(report.severity for report in reports) / report_count
    severity_component = average_severity / 5.0
    frequency_component = min(report_count / config.RISK_FREQUENCY_REPORTS, 1.0)
    evidence_ratio = sum(bool(report.evidence_available) for report in reports) / report_count
    score = 100.0 * (
        config.RISK_SEVERITY_WEIGHT * severity_component
        + config.RISK_FREQUENCY_WEIGHT * frequency_component
        + config.RISK_EVIDENCE_WEIGHT * evidence_ratio
    )
    if score >= config.RISK_HIGH_THRESHOLD:
        classification = "High"
    elif score >= config.RISK_MEDIUM_THRESHOLD:
        classification = "Medium"
    else:
        classification = "Low"

    return RiskScore(
        average_severity=average_severity,
        evidence_ratio=evidence_ratio,
        score=round(score, 2),
        classification=classification,
    )
