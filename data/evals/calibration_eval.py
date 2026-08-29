import json
import os
import sys
import matplotlib.pyplot as plt

def evaluate_subset(records, subset_name):
    """
    Computes calibration bin statistics, ECE, and Brier score for a given subset of records.
    """
    data_points = []
    brier_sum = 0.0

    for r in records:
        outcome = r.get("actual_outcome")
        risk_score = r.get("riskScore", 0.0)
        confidence = r.get("confidence", 0.5)

        # Correctness definition:
        # good_standing -> correct if riskScore < 0.5
        # defaulted -> correct if riskScore >= 0.5
        if outcome == "good_standing":
            correct = 1.0 if risk_score < 0.5 else 0.0
        elif outcome == "defaulted":
            correct = 1.0 if risk_score >= 0.5 else 0.0
        else:
            correct = 0.0

        brier_sum += (confidence - correct) ** 2
        data_points.append({
            "confidence": confidence,
            "correct": correct,
            "riskScore": risk_score,
            "outcome": outcome
        })

    total_records = len(data_points)
    brier_score = brier_sum / total_records if total_records > 0 else 0.0

    # Bin definitions
    bins = [
        {"range": "[0.5, 0.6)", "low": 0.5, "high": 0.6, "records": []},
        {"range": "[0.6, 0.7)", "low": 0.6, "high": 0.7, "records": []},
        {"range": "[0.7, 0.8)", "low": 0.7, "high": 0.8, "records": []},
        {"range": "[0.8, 0.9)", "low": 0.8, "high": 0.9, "records": []},
        {"range": "[0.9, 1.0]", "low": 0.9, "high": 1.01, "records": []},
    ]

    for dp in data_points:
        conf = dp["confidence"]
        for b in bins:
            if b["low"] <= conf < b["high"]:
                b["records"].append(dp)
                break

    ece = 0.0
    bin_stats = []

    for b in bins:
        count = len(b["records"])
        if count > 0:
            avg_conf = sum(r["confidence"] for r in b["records"]) / count
            acc = sum(r["correct"] for r in b["records"]) / count
            diff = abs(avg_conf - acc)
            ece += (count / total_records) * diff
        else:
            avg_conf = 0.0
            acc = 0.0
            diff = 0.0

        bin_stats.append({
            "range": b["range"],
            "count": count,
            "avg_conf": avg_conf,
            "acc": acc,
            "diff": diff
        })

    # Print Table
    print("\n" + "=" * 75)
    print(f"CALIBRATION EVALUATION TABLE: {subset_name.upper()} (n={total_records})")
    print("=" * 75)
    header = f"{'Bin Range':<15} | {'Record Count':<12} | {'Avg Confidence':<16} | {'Actual Accuracy':<16} | {'Difference':<10}"
    print(header)
    print("-" * 75)

    for stat in bin_stats:
        row = (
            f"{stat['range']:<15} | "
            f"{stat['count']:<12} | "
            f"{stat['avg_conf']:<16.4f} | "
            f"{stat['acc']:<16.4f} | "
            f"{stat['diff']:<10.4f}"
        )
        print(row)

    print("-" * 75)
    print(f"Expected Calibration Error (ECE) : {ece:.4f}")
    print(f"Brier Score                      : {brier_score:.4f}")
    print("=" * 75)

    return {
        "name": subset_name,
        "total": total_records,
        "ece": ece,
        "brier": brier_score,
        "bin_stats": bin_stats
    }


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, "pipeline_results.json")
    plot_path = os.path.join(script_dir, "calibration_plot.png")

    if not os.path.exists(input_path):
        print(f"Error: input file '{input_path}' not found.")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    print(f"Loaded {len(records)} total records from {input_path}")

    # Subsets
    easy_cases = [r for r in records if r.get("label_confidence_expected") == "easy_case"]
    ambiguous_cases = [r for r in records if r.get("label_confidence_expected") == "genuinely_ambiguous"]

    # Run evaluations
    res_combined = evaluate_subset(records, "Combined Dataset (All Records)")
    res_easy = evaluate_subset(easy_cases, "Easy Cases Only (label_confidence_expected == 'easy_case')")
    res_ambiguous = evaluate_subset(ambiguous_cases, "Genuinely Ambiguous Only (label_confidence_expected == 'genuinely_ambiguous')")

    # Plot Calibration Curves for all three subsets
    plt.figure(figsize=(9, 6))

    # Reference Diagonal Line
    plt.plot([0.5, 1.0], [0.5, 1.0], "k--", label="Perfect Calibration (y = x)")

    styles = [
        (res_combined, "Combined (All Records)", "#3b82f6", "s-"),
        (res_easy, "Easy Cases Only", "#10b981", "o-"),
        (res_ambiguous, "Genuinely Ambiguous Only", "#f59e0b", "^-")
    ]

    for res, label, color, marker in styles:
        valid_bins = [s for s in res["bin_stats"] if s["count"] > 0]
        x = [s["avg_conf"] for s in valid_bins]
        y = [s["acc"] for s in valid_bins]
        plt.plot(x, y, marker, color=color, linewidth=2, markersize=7, label=f"{label} (ECE: {res['ece']:.3f})")

    plt.xlim(0.48, 1.02)
    plt.ylim(0.0, 1.05)
    plt.xlabel("Predicted Confidence", fontsize=11)
    plt.ylabel("Actual Accuracy Rate", fontsize=11)
    plt.title("RiskAgent Calibration Curve Comparison", fontsize=13)
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend(loc="upper left")
    plt.tight_layout()

    plt.savefig(plot_path, dpi=300)
    plt.close()

    print(f"\nUpdated calibration plot saved to: {plot_path}")


if __name__ == "__main__":
    main()
