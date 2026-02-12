"""
This code shows the EDA step for the dataset under /scrapped_data/thousand_records 
which is the result of 2 websites scraping and api data fetching.
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path

# Load the dataset
df = pd.read_csv("backend/data/scrapped/scrapped_data/thousand_records/weather_1000plus_20260204_230100.csv")
# Display basic information about the dataset
print(df.info())

# Display summary statistics
print(df.describe())

