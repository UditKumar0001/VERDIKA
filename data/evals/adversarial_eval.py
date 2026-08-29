import json
import os
import sys

def evaluate_adversarial(input_path):
    if not os.path.exists(input_path):
        print(f"Error: file '{input_path}' not found.")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    adversarial_records = [r for r in records if r.get("is_adversarial")]
    normal_records = [r for r in records if not r.get("is_adversarial")]

    tp_records = [r for r in adversarial_records if r.get("predictedAdversarialFlag")]
    fn_records = [r for r in adversarial_records if not r.get("predictedAdversarialFlag")]

    fp_records = [r for r in normal_records if r.get("predictedAdversarialFlag")]
    tn_records = [r for r in normal_records if not r.get("predictedAdversarialFlag")]

    tp = len(tp_records)
    fn = len(fn_records)
    fp = len(fp_records)
    tn = len(tn_records)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1_score = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    target_patterns = ["spike_before_apply", "refund_smoothing", "order_value_inflation", "settlement_gaming"]
    pattern_stats = {pat: {"total": 0, "detected": 0} for pat in target_patterns}

    for r in adversarial_records:
        pat = r.get("adversarial_pattern") or "unknown"
        if pat not in pattern_stats:
            pattern_stats[pat] = {"total": 0, "detected": 0}
        pattern_stats[pat]["total"] += 1
        if r.get("predictedAdversarialFlag"):
            pattern_stats[pat]["detected"] += 1

    print("\n" + "=" * 75)
    print("ADVERSARIAL EVALUATION REPORT")
    print("=" * 75)

    print("\n--- 1. CONFUSION MATRIX ---")
    print(f"  {'':<20} | {'Predicted Adversarial':<22} | {'Predicted Normal':<20}")
    print("  " + "-" * 68)
    print(f"  {'Actual Adversarial':<20} | TP = {tp:<17} | FN = {fn:<15}")
    print(f"  {'Actual Normal':<20} | FP = {fp:<17} | TN = {tn:<15}")
    print("  " + "-" * 68)
    print(f"  Total Records: {len(records)} (Actual Adversarial: {len(adversarial_records)}, Actual Normal: {len(normal_records)})")

    print("\n--- 2. METRICS ---")
    print(f"  Precision       : {precision:.4f} ({tp}/{tp + fp})")
    print(f"  Recall (TPR)    : {recall:.4f} ({tp}/{tp + fn})")
    print(f"  F1 Score        : {f1_score:.4f}")
    print(f"  False Alarm Rate: {fp / len(normal_records):.4f} ({fp}/{len(normal_records)})")

    print("\n--- 3. PER-PATTERN RECALL BREAKDOWN ---")
    header = f"  {'Pattern Name':<25} | {'Detected':<10} | {'Total':<8} | {'Recall':<10}"
    print(header)
    print("  " + "-" * 62)
    for pat in target_patterns:
        stats = pattern_stats.get(pat, {"total": 0, "detected": 0})
        tot = stats["total"]
        det = stats["detected"]
        rec = (det / tot) * 100 if tot > 0 else 0.0
        print(f"  {pat:<25} | {det:<10} | {tot:<8} | {rec:<9.1f}%")

    print("\n--- 4. FALSE NEGATIVES LIST (Missed Adversarial Cases) (Count: {}) ---".format(len(fn_records)))
    if fn_records:
        for i, r in enumerate(fn_records, 1):
            pats = r.get("detectedPatterns") or []
            pat_str = ", ".join([p.get("pattern", "") for p in pats]) if pats else "None"
            print(f"  {i}. ID: {r['merchant_id']} | Pattern: {r.get('adversarial_pattern')} | Outcome: {r.get('actual_outcome')} | RiskScore: {r.get('riskScore')} | Decision: {r.get('decision')} | DetectedByAgent: {pat_str}")
    else:
        print("  None (0 missed cases).")

    print("\n--- 5. FALSE POSITIVES LIST (Normal Control Flagged as Adversarial) (Count: {}) ---".format(len(fp_records)))
    if fp_records:
        for i, r in enumerate(fp_records, 1):
            pats = r.get("detectedPatterns") or []
            pat_str = ", ".join([f"{p.get('pattern')}: {p.get('evidence')}" for p in pats]) if pats else "None"
            print(f"  {i}. ID: {r['merchant_id']} | Outcome: {r.get('actual_outcome')} | RiskScore: {r.get('riskScore')} | Decision: {r.get('decision')}")
            print(f"     Evidence: {pat_str}")
    else:
        print("  None (0 false alarms).")

    print("=" * 75 + "\n")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Adversarial evaluation report harness.")
    parser.add_argument("--input", type=str, default=None, help="Path to pipeline_results JSON file")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    if args.input:
        input_path = os.path.abspath(args.input)
    else:
        input_path = os.path.join(script_dir, "pipeline_results.json")

    evaluate_adversarial(input_path)

if __name__ == "__main__":
    main()
