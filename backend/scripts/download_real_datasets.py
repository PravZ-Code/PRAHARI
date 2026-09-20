"""
Utility script to fetch and cache real-life public datasets from Kaggle / HackerEarth
into backend/ml/data/ for offline model training and reproducible deployment.
"""

import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.data_loader import ensure_real_datasets_available, BURNOUT_CSV_PATH, SLEEP_CSV_PATH

def main():
    print("=================================================================")
    print(" PRAHARI Real-World Dataset Ingestion Utility")
    print("=================================================================")
    print("1. Kaggle / HackerEarth Employee Burnout Dataset (22,750 samples)")
    print("2. Kaggle Sleep Health & Lifestyle Dataset (374 clinical samples)")
    print("-----------------------------------------------------------------")
    burnout_path, sleep_path = ensure_real_datasets_available()
    print(f"[VERIFIED] Burnout Dataset: {burnout_path} ({os.path.getsize(burnout_path):,} bytes)")
    print(f"[VERIFIED] Sleep Dataset:   {sleep_path} ({os.path.getsize(sleep_path):,} bytes)")
    print("=================================================================")
    print("Datasets successfully verified and ready for model training.")

if __name__ == "__main__":
    main()
