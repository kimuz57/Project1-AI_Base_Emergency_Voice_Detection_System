#!/usr/bin/env python3
"""
Guardian AI - Dataset Preparation Script
Merge train/dev/test splits and prepare data for model training
"""

import os
import pandas as pd
import numpy as np
from pathlib import Path
import json
from tqdm import tqdm

class DatasetPreparator:
    def __init__(self, root_dir='..'):
        self.root_dir = root_dir
        self.annotations_file = os.path.join(root_dir, 'LOTUSDIS_annotations.csv')
        
    def load_annotations(self):
        """Load annotation CSV file"""
        try:
            # Try reading with errors='ignore' to skip problematic chars
            df = pd.read_csv(
                self.annotations_file, 
                engine='python',
                encoding_errors='ignore',
                on_bad_lines='skip'
            )
            print(f"✓ Loaded annotations: {len(df)} rows")
            print(f"  Columns: {list(df.columns)}")
            return df
        except Exception as e:
            print(f"❌ Error loading annotations: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def explore_dataset(self):
        """Explore dataset structure and statistics"""
        df = self.load_annotations()
        if df is None:
            return
        
        print("\n📊 Dataset Structure:")
        print(f"  - Total samples: {len(df)}")
        print(f"  - Columns: {df.columns.tolist()}")
        print(f"\n  - Shape: {df.shape}")
        
        if 'split' in df.columns:
            print(f"\n  - Splits:")
            print(df['split'].value_counts())
        
        print(f"\n  - Missing values:")
        print(df.isnull().sum())
        
    def get_split_summary(self):
        """Get train/dev/test split summary"""
        df = self.load_annotations()
        if df is None:
            return
        
        print("\n📈 Split Summary:")
        if 'split' in df.columns:
            train_split = df[df['split'] == 'train']
            dev_split = df[df['split'] == 'dev']
            test_split = df[df['split'] == 'test']
            
            print(f"  - Train: {len(train_split)} samples (~88h)")
            print(f"  - Dev: {len(dev_split)} samples (~12.8h)")
            print(f"  - Test: {len(test_split)} samples (~13.3h)")
            print(f"  - Total: {len(df)} samples (~114h)")
        
        return df
    
    def create_train_dev_test_split(self):
        """Create separate train/dev/test CSV files"""
        df = self.load_annotations()
        if df is None:
            return
        
        # Create datasets directory if not exists
        output_dir = os.path.join(self.root_dir, 'backend_ai', 'datasets')
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            if 'split' in df.columns:
                train_df = df[df['split'] == 'train']
                dev_df = df[df['split'] == 'dev']
                test_df = df[df['split'] == 'test']
            else:
                # If no split column, use default splits
                n = len(df)
                train_df = df[:int(0.8*n)]
                dev_df = df[int(0.8*n):int(0.9*n)]
                test_df = df[int(0.9*n):]
            
            # Save splits
            train_df.to_csv(os.path.join(output_dir, 'train.csv'), index=False)
            dev_df.to_csv(os.path.join(output_dir, 'dev.csv'), index=False)
            test_df.to_csv(os.path.join(output_dir, 'test.csv'), index=False)
            
            print(f"\n✓ Created split files:")
            print(f"  - {output_dir}/train.csv ({len(train_df)} rows)")
            print(f"  - {output_dir}/dev.csv ({len(dev_df)} rows)")
            print(f"  - {output_dir}/test.csv ({len(test_df)} rows)")
            
        except Exception as e:
            print(f"❌ Error creating split files: {e}")
    
    def check_data_quality(self):
        """Check data quality and report issues"""
        df = self.load_annotations()
        if df is None:
            return
        
        print("\n🔍 Data Quality Check:")
        
        # Check missing values
        missing = df.isnull().sum()
        if missing.sum() > 0:
            print(f"  ⚠️  Missing values found:")
            print(missing[missing > 0])
        else:
            print(f"  ✓ No missing values")
        
        # Check for duplicates
        duplicates = df.duplicated().sum()
        print(f"  - Duplicate rows: {duplicates}")
        
        # Check for unique speakers (if available)
        if 'speaker_id' in df.columns:
            print(f"  - Unique speakers: {df['speaker_id'].nunique()}")
        
        if 'device' in df.columns:
            print(f"  - Devices used: {df['device'].nunique()}")
            print(f"    {df['device'].unique().tolist()}")

def main():
    print("╔════════════════════════════════════════╗")
    print("║  LOTUSDIS Dataset Preparation Tool    ║")
    print("╚════════════════════════════════════════╝")
    
    preparator = DatasetPreparator(root_dir='.')
    
    # 1. Explore dataset
    preparator.explore_dataset()
    
    # 2. Get split summary
    preparator.get_split_summary()
    
    # 3. Check data quality
    preparator.check_data_quality()
    
    # 4. Create split files
    preparator.create_train_dev_test_split()
    
    print("\n✓ Dataset preparation complete!")

if __name__ == "__main__":
    main()
