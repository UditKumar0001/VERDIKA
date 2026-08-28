"""
Synthetic Loan Application Data Generator
Generates benchmark distributions of applicant demographics, financial ratios, credit scores,
and default outcomes for model calibration and offline testing.
"""

import json
import random
import os

def generate_sample_application(index: int) -> dict:
    """Generate a single realistic or synthetic edge-case loan application."""
    credit_score = random.randint(580, 820)
    annual_revenue = random.randint(100_000, 5_000_000)
    requested_amount = random.randint(25_000, min(500_000, int(annual_revenue * 0.4)))
    
    return {
        "id": f"synth-app-{index:04d}",
        "applicant_name": f"Synthetic Enterprise {index}",
        "business_type": random.choice(["LLC", "Corporation", "Sole Proprietorship", "Partnership"]),
        "requested_amount": requested_amount,
        "credit_score": credit_score,
        "annual_revenue": annual_revenue,
        "debt_to_income": round(random.uniform(0.15, 0.65), 2),
        "years_in_business": random.randint(1, 20),
        "target_default": credit_score < 620 or requested_amount > annual_revenue * 0.35
    }

def main(count: int = 100, output_path: str = "synthetic_applications.json"):
    print(f"[Synthetic Data] Generating {count} benchmark applications...")
    data = [generate_sample_application(i) for i in range(1, count + 1)]
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    print(f"[Synthetic Data] Saved dataset to {output_path}")

if __name__ == "__main__":
    main()
