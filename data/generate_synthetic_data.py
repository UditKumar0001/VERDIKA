"""
Synthetic Merchant Data Generator
Generates realistic benchmark merchant profiles with weekly transaction histories,
covering normal cases (good standing / defaulted), genuinely ambiguous borderline cases,
and gamed adversarial cases for stress-testing and calibration.
"""

import os
import sys
import json
import uuid
import random
import argparse
from datetime import datetime, timedelta
import numpy as np
from faker import Faker

fake = Faker('en_IN')

# Seed Faker for reproducibility
Faker.seed(42)
random.seed(42)
np.random.seed(42)

BUSINESS_CATEGORIES = ["electronics", "apparel", "food", "services", "grocery"]

CATEGORY_PROFILES = {
    "grocery": {
        "aov_range": (350.0, 1400.0),
        "weekly_tx_range": (150, 650),
        "base_refund_rate": 0.012,
        "base_chargeback_rate": 0.0005,
        "upi_ratio": 0.65,
        "card_ratio": 0.25,
        "netbanking_ratio": 0.10,
        "base_settlement_delay": 1.2
    },
    "food": {
        "aov_range": (300.0, 1100.0),
        "weekly_tx_range": (120, 500),
        "base_refund_rate": 0.020,
        "base_chargeback_rate": 0.0008,
        "upi_ratio": 0.70,
        "card_ratio": 0.22,
        "netbanking_ratio": 0.08,
        "base_settlement_delay": 1.3
    },
    "apparel": {
        "aov_range": (1200.0, 4200.0),
        "weekly_tx_range": (40, 220),
        "base_refund_rate": 0.085,
        "base_chargeback_rate": 0.0030,
        "upi_ratio": 0.40,
        "card_ratio": 0.45,
        "netbanking_ratio": 0.15,
        "base_settlement_delay": 2.1
    },
    "electronics": {
        "aov_range": (3500.0, 22000.0),
        "weekly_tx_range": (15, 110),
        "base_refund_rate": 0.045,
        "base_chargeback_rate": 0.0040,
        "upi_ratio": 0.30,
        "card_ratio": 0.50,
        "netbanking_ratio": 0.20,
        "base_settlement_delay": 2.5
    },
    "services": {
        "aov_range": (1800.0, 14000.0),
        "weekly_tx_range": (12, 80),
        "base_refund_rate": 0.018,
        "base_chargeback_rate": 0.0015,
        "upi_ratio": 0.45,
        "card_ratio": 0.35,
        "netbanking_ratio": 0.20,
        "base_settlement_delay": 1.8
    }
}

STATE_CODES = ["27", "29", "07", "33", "06", "19", "24", "10", "08", "36", "32", "09"]

CATEGORY_NAME_SUFFIXES = {
    "electronics": ["Electronics", "Digital Solutions", "Tech Hub", "Gadgets & More", "Infotech", "Electro World"],
    "apparel": ["Apparels", "Fashions", "Textiles", "Couture", "Garments", "Clothing Co.", "Style Studio"],
    "food": ["Bistro", "Kitchen", "Foods", "Cafe & Dine", "Delights", "Eatery", "Spices", "Hospitality"],
    "services": ["Enterprises", "Consultancy", "Solutions", "Services", "Logistics", "Ventures", "Agency"],
    "grocery": ["Supermart", "Kirana & Provision", "Retail Mart", "Fresh Foods", "Hypermarket", "Grocers", "Organics"]
}


def generate_fake_gstin() -> str:
    """Generate a syntactically valid 15-character Indian GSTIN."""
    state = random.choice(STATE_CODES)
    # PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
    pan_chars = "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ", k=5))
    pan_digits = "".join(random.choices("0123456789", k=4))
    pan_last = random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
    pan = f"{pan_chars}{pan_digits}{pan_last}"
    entity_code = str(random.randint(1, 9))
    default_z = "Z"
    check_char = random.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    return f"{state}{pan}{entity_code}{default_z}{check_char}"


def generate_business_name(category: str) -> str:
    """Generate a realistic merchant business name tailored by category."""
    suffix = random.choice(CATEGORY_NAME_SUFFIXES[category])
    structure = random.choice(["Pvt Ltd", "LLP", "Enterprises", "Retail", "Trading Co", ""])
    first_name = random.choice([
        fake.first_name(),
        fake.last_name(),
        fake.city().split()[0],
        random.choice(["Apex", "Zenith", "Prime", "Royal", "Omega", "Sunrise", "BlueSky", "Bharat", "Metro", "Urban", "Swastik"])
    ])
    
    if structure:
        return f"{first_name} {suffix} {structure}".strip()
    return f"{first_name} {suffix}".strip()


def generate_payment_mix(profile: dict) -> tuple:
    """Generate realistic UPI, Card, Netbanking percentages that sum to 1.0."""
    alpha = [profile["upi_ratio"] * 20, profile["card_ratio"] * 20, profile["netbanking_ratio"] * 20]
    mix = np.random.dirichlet(alpha)
    upi_pct = round(float(mix[0]), 4)
    card_pct = round(float(mix[1]), 4)
    netbanking_pct = round(1.0 - upi_pct - card_pct, 4)
    if netbanking_pct < 0:
        netbanking_pct = 0.0
        upi_pct = round(1.0 - card_pct, 4)
    return upi_pct, card_pct, netbanking_pct


def generate_transaction_history(
    category: str,
    num_weeks: int,
    end_date: datetime,
    scenario_type: str,
    outcome: str,
    adversarial_pattern: str = None
) -> list:
    """
    Generate weekly transaction history points over 6-12 months with realistic noise,
    trend shifts, payment method distributions, refunds, chargebacks, and settlement delays.
    """
    profile = CATEGORY_PROFILES[category]
    base_aov = random.uniform(*profile["aov_range"])
    base_tx = random.randint(*profile["weekly_tx_range"])

    # Determine trend slope based on outcome and scenario
    if scenario_type == "normal":
        if outcome == "good_standing":
            trend_drift = np.random.uniform(0.003, 0.015)  # Healthy weekly growth 0.3% - 1.5%
            volatility = 0.08
            refund_mult = 1.0
            chargeback_prob = profile["base_chargeback_rate"]
        else:  # defaulted
            trend_drift = np.random.uniform(-0.025, -0.008)  # Gradual decline
            volatility = 0.15
            refund_mult = 2.5
            chargeback_prob = profile["base_chargeback_rate"] * 6.0
    elif scenario_type == "ambiguous":
        if outcome == "good_standing":
            trend_drift = np.random.uniform(-0.004, 0.005)  # Flat or mild growth
            volatility = 0.18  # High volatility causes ambiguity
            refund_mult = 1.6
            chargeback_prob = profile["base_chargeback_rate"] * 2.2
        else:  # defaulted
            trend_drift = np.random.uniform(-0.008, 0.002)  # Borderline mild decline
            volatility = 0.20
            refund_mult = 1.9
            chargeback_prob = profile["base_chargeback_rate"] * 3.0
    else:  # adversarial
        trend_drift = np.random.uniform(0.002, 0.010)
        volatility = 0.08
        refund_mult = 1.0
        chargeback_prob = profile["base_chargeback_rate"]

    # Start date calculation
    start_date = end_date - timedelta(weeks=num_weeks - 1)
    
    # Generate baseline weekly series using random walk with drift
    tx_counts = []
    aovs = []
    current_tx = float(base_tx)
    current_aov = float(base_aov)

    for w in range(num_weeks):
        # Noise
        tx_noise = np.random.normal(trend_drift, volatility)
        current_tx = max(5.0, current_tx * (1.0 + tx_noise))
        
        aov_noise = np.random.normal(0.0, 0.03)
        current_aov = max(100.0, current_aov * (1.0 + aov_noise))
        
        tx_counts.append(int(round(current_tx)))
        aovs.append(round(current_aov, 2))

    # Apply adversarial modifications if applicable
    settlement_delays = []
    refund_counts = []
    refund_amounts = []
    chargebacks = []
    payment_mixes = []

    for w in range(num_weeks):
        # Payment mix
        u_pct, c_pct, nb_pct = generate_payment_mix(profile)
        payment_mixes.append((u_pct, c_pct, nb_pct))
        
        # Base settlement delay depends on payment mix
        expected_delay = (u_pct * 1.0) + (c_pct * 2.8) + (nb_pct * 2.0)
        actual_delay = max(0.5, round(float(np.random.normal(expected_delay, 0.25)), 2))
        settlement_delays.append(actual_delay)

        # Standard natural refund clustering (higher variance with periodic return surges)
        tx_cnt = tx_counts[w]
        avg_v = aovs[w]
        expected_refunds = max(0, tx_cnt * profile["base_refund_rate"] * refund_mult)
        
        # Natural refunds cluster via negative binomial / poisson
        is_spike_week = (w % 4 == 0) and random.random() < 0.4
        spike_factor = 2.2 if is_spike_week else 0.75
        r_cnt = int(np.random.poisson(max(0.1, expected_refunds * spike_factor)))
        r_cnt = min(r_cnt, tx_cnt)
        
        refund_counts.append(r_cnt)
        r_amt = round(r_cnt * avg_v * random.uniform(0.75, 1.05), 2)
        refund_amounts.append(r_amt)

        # Chargebacks
        cb_count = int(np.random.poisson(max(0.01, tx_cnt * chargeback_prob)))
        if outcome == "defaulted" and w > num_weeks - 6:
            cb_count += random.choice([0, 1, 2])
        chargebacks.append(cb_count)

    # Specific Adversarial Pattern Overwrites
    if adversarial_pattern == "spike_before_apply":
        # Final 2 weeks spike 3x to 5x in tx_count and gross revenue
        spike_multiplier = float(np.random.uniform(3.2, 4.8))
        for w in [num_weeks - 2, num_weeks - 1]:
            tx_counts[w] = int(round(tx_counts[w] * spike_multiplier))
            
    elif adversarial_pattern == "refund_smoothing":
        # Unnaturally constant / low week-to-week refund variance
        avg_r_count = max(1, int(round(np.mean(refund_counts))))
        for w in range(num_weeks):
            # Flat refund count with virtually 0 variance
            refund_counts[w] = avg_r_count
            refund_amounts[w] = round(avg_r_count * aovs[w] * 0.95, 2)
            
    elif adversarial_pattern == "order_value_inflation":
        # Last 4 weeks AOV jumps 2x - 3x with no transaction count change
        aov_inflation = float(np.random.uniform(2.2, 2.9))
        for w in range(num_weeks - 4, num_weeks):
            aovs[w] = round(aovs[w] * aov_inflation, 2)
            
    elif adversarial_pattern == "settlement_gaming":
        # Final 4 to 6 weeks settlement delay drops to near-zero (0.0 to 0.1 days)
        # despite high card/netbanking mix
        for w in range(num_weeks - 5, num_weeks):
            settlement_delays[w] = round(float(np.random.uniform(0.0, 0.12)), 2)

    # Assemble weekly data objects
    history = []
    for w in range(num_weeks):
        week_date = start_date + timedelta(weeks=w)
        tx_cnt = tx_counts[w]
        a_val = aovs[w]
        gross_rev = round(float(tx_cnt * a_val), 2)
        u_pct, c_pct, nb_pct = payment_mixes[w]
        
        history.append({
            "date": week_date.strftime("%Y-%m-%d"),
            "transaction_count": tx_cnt,
            "gross_revenue": gross_rev,
            "avg_order_value": a_val,
            "refund_count": refund_counts[w],
            "refund_amount": refund_amounts[w],
            "chargeback_count": chargebacks[w],
            "upi_pct": u_pct,
            "card_pct": c_pct,
            "netbanking_pct": nb_pct,
            "settlement_delay_days": settlement_delays[w]
        })

    return history


def generate_merchant_record(
    index: int,
    scenario_type: str,
    outcome: str,
    adversarial_pattern: str = None,
    ref_end_date: datetime = None
) -> dict:
    """Generate a complete merchant record meeting all schema and distribution requirements."""
    if ref_end_date is None:
        ref_end_date = datetime(2026, 8, 20)
    
    category = random.choice(BUSINESS_CATEGORIES)
    business_name = generate_business_name(category)
    gstin = generate_fake_gstin()
    
    # Business age in months: 6 to 120 months
    if scenario_type == "normal" and outcome == "good_standing":
        business_age_months = random.randint(18, 120)
    elif scenario_type == "ambiguous":
        business_age_months = random.randint(6, 36)
    else:  # defaulted or adversarial
        business_age_months = random.randint(6, 60)
        
    registration_days_ago = int(business_age_months * 30.4 + random.randint(0, 20))
    registration_date = (ref_end_date - timedelta(days=registration_days_ago)).strftime("%Y-%m-%d")
    
    # Weekly transaction history points over 6-12 months (26 to 52 weeks)
    num_weeks = random.choice([26, 32, 38, 44, 52])
    
    history = generate_transaction_history(
        category=category,
        num_weeks=num_weeks,
        end_date=ref_end_date,
        scenario_type=scenario_type,
        outcome=outcome,
        adversarial_pattern=adversarial_pattern
    )
    
    is_adversarial = (scenario_type == "adversarial")
    
    if scenario_type == "normal":
        label_confidence = "easy_case"
    elif scenario_type == "ambiguous":
        label_confidence = "genuinely_ambiguous"
    else:  # adversarial
        label_confidence = "easy_case"

    return {
        "merchant_id": str(uuid.uuid4()),
        "business_name": business_name,
        "business_category": category,
        "gstin": gstin,
        "registration_date": registration_date,
        "business_age_months": business_age_months,
        "transaction_history": history,
        "actual_outcome": outcome,
        "is_adversarial": is_adversarial,
        "adversarial_pattern": adversarial_pattern if is_adversarial else None,
        "label_confidence_expected": label_confidence
    }


def generate_dataset(total_records: int = 200) -> list:
    """
    Generate dataset with exact required mix:
    - 70% normal cases (140 records, mix of good_standing & defaulted)
    - 20% genuinely ambiguous cases (40 records, borderline metrics)
    - 10% adversarial cases (20 records, gamed patterns)
    """
    normal_count = int(total_records * 0.70)      # 140
    ambiguous_count = int(total_records * 0.20)   # 40
    adversarial_count = total_records - normal_count - ambiguous_count  # 20

    records = []
    ref_end_date = datetime(2026, 8, 21)

    print(f"[Generator] Generating {normal_count} Normal Cases (70%)...")
    # 75% good standing, 25% defaulted in normal cases
    good_normal = int(normal_count * 0.75)
    default_normal = normal_count - good_normal
    for i in range(good_normal):
        records.append(generate_merchant_record(len(records) + 1, "normal", "good_standing", None, ref_end_date))
    for i in range(default_normal):
        records.append(generate_merchant_record(len(records) + 1, "normal", "defaulted", None, ref_end_date))

    print(f"[Generator] Generating {ambiguous_count} Ambiguous Cases (20%)...")
    # 50% good standing, 50% defaulted borderline cases
    good_ambiguous = ambiguous_count // 2
    default_ambiguous = ambiguous_count - good_ambiguous
    for i in range(good_ambiguous):
        records.append(generate_merchant_record(len(records) + 1, "ambiguous", "good_standing", None, ref_end_date))
    for i in range(default_ambiguous):
        records.append(generate_merchant_record(len(records) + 1, "ambiguous", "defaulted", None, ref_end_date))

    print(f"[Generator] Generating {adversarial_count} Adversarial Cases (10%)...")
    adversarial_patterns = [
        "spike_before_apply",
        "refund_smoothing",
        "order_value_inflation",
        "settlement_gaming"
    ]
    # Distribute patterns evenly across adversarial count (5 each for 20 records)
    for i in range(adversarial_count):
        pattern = adversarial_patterns[i % len(adversarial_patterns)]
        # Adversarial cases often default or are flagged
        outcome = "defaulted" if (i % 4 != 0) else "good_standing"
        records.append(generate_merchant_record(len(records) + 1, "adversarial", outcome, pattern, ref_end_date))

    # Shuffle records so cases are mixed naturally throughout the dataset
    random.shuffle(records)
    return records


def print_dataset_statistics(records: list):
    """Print detailed summary statistics of the generated dataset."""
    total = len(records)
    normal = [r for r in records if not r["is_adversarial"] and r["label_confidence_expected"] == "easy_case"]
    ambiguous = [r for r in records if not r["is_adversarial"] and r["label_confidence_expected"] == "genuinely_ambiguous"]
    adversarial = [r for r in records if r["is_adversarial"]]
    
    good_standing = [r for r in records if r["actual_outcome"] == "good_standing"]
    defaulted = [r for r in records if r["actual_outcome"] == "defaulted"]
    
    cat_counts = {}
    for r in records:
        cat = r["business_category"]
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    adv_pattern_counts = {}
    for r in adversarial:
        pat = r["adversarial_pattern"]
        adv_pattern_counts[pat] = adv_pattern_counts.get(pat, 0) + 1

    print("\n" + "=" * 60)
    print(f" DATASET SUMMARY ({total} Merchant Records)")
    print("=" * 60)
    print(f" • Normal Cases:      {len(normal):3d} ({len(normal)/total*100:.1f}%)")
    print(f" • Ambiguous Cases:   {len(ambiguous):3d} ({len(ambiguous)/total*100:.1f}%)")
    print(f" • Adversarial Cases: {len(adversarial):3d} ({len(adversarial)/total*100:.1f}%)")
    print("-" * 60)
    print(f" • Outcome Good Standing: {len(good_standing):3d} ({len(good_standing)/total*100:.1f}%)")
    print(f" • Outcome Defaulted:     {len(defaulted):3d} ({len(defaulted)/total*100:.1f}%)")
    print("-" * 60)
    print(" Categories:")
    for cat, cnt in sorted(cat_counts.items()):
        print(f"   - {cat:<15}: {cnt:3d} ({cnt/total*100:.1f}%)")
    print("-" * 60)
    print(" Adversarial Patterns:")
    for pat, cnt in sorted(adv_pattern_counts.items()):
        print(f"   - {pat:<24}: {cnt:3d}")
    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic merchant data for underwriting & adversarial evaluation.")
    parser.add_argument("--count", type=int, default=200, help="Total number of merchant records to generate (default: 200)")
    parser.add_argument("--output", type=str, default=None, help="Output JSON path (default: data/merchants.json)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)
        np.random.seed(args.seed)
        Faker.seed(args.seed)

    # Determine default path relative to script location
    if args.output is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(script_dir, "merchants.json")
    else:
        output_path = args.output

    print(f"[Synthetic Data] Generating {args.count} merchant profiles...")
    records = generate_dataset(total_records=args.count)
    print_dataset_statistics(records)

    # Ensure output directory exists
    out_dir = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(out_dir, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    print(f"[Synthetic Data] Successfully saved {len(records)} records to {output_path}")


if __name__ == "__main__":
    main()
