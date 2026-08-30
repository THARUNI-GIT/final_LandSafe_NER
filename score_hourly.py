"""
score_hourly.py — LandSafe NER consolidated scoring pipeline

Runs the full landslide risk scoring pipeline in one pass:
  1. Load static artifacts (susceptibility, Model 2, district lookup) — no retraining
  2. Fetch live daily + hourly rainfall from Open-Meteo for all grid cells
  3. Score every slope unit at horizon_hours = 0 (now), 3, 6, 12, 24
  4. Attach SHAP-based top-3 contributing factors per prediction
  5. Attach state/district tags
  6. Write one combined output file (parquet + JSON) with a timestamp

This is meant to be the artifact a scheduled job runs (e.g. hourly via cron /
GitHub Actions), not something invoked per user request. A FastAPI service
reads its output; it does not call this script live.

NOTE ON PATHS: written assuming Google Drive is mounted at /content/drive
(i.e. pasted into a Colab cell) OR run in an environment where the same
folder structure is available locally. If deploying outside Colab, replace
DATA_DIR below with wherever these files actually live (e.g. a mounted disk,
S3-synced folder, etc.) and remove the drive.mount() call.
"""

import time
import json
import os
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
import requests
import shap

# ============================================================
# CONFIG
# ============================================================

DATA_DIR = os.environ.get('DATA_DIR', './data')  # Colab: set to /content/drive/MyDrive/landslides ; GitHub Actions: leave as ./data (repo-relative)
IS_CI = os.environ.get('GITHUB_ACTIONS') == 'true'  # true when running inside a GitHub Actions workflow
SUSCEPTIBILITY_PATH = f'{DATA_DIR}/stage1_susceptibility_scores.parquet'
SU_TO_GRID_PATH = f'{DATA_DIR}/su_to_grid.parquet'  # static — built once, never rebuilt here
MODEL2_PATH = f'{DATA_DIR}/model2_lightgbm.pkl'
FEATURE_COLS_PATH = f'{DATA_DIR}/model2_feature_cols.json'
ADMIN_LOOKUP_PATH = f'{DATA_DIR}/su_state_district.parquet'

CHOSEN_THRESHOLD = 0.101888
GRID_STEP = 0.25          # matches training resolution — do not use a finer grid, causes API rate-limiting
HORIZONS = [0, 3, 6, 12, 24]   # 0 = "right now", using only the daily 30-day window
BATCH_SIZE = 50
SHAP_TOP_N = 3

# Set as a GitHub Actions secret, never hardcoded here. Use the POOLED connection string
# (port 6543) from Supabase Settings > Database — the pooler suits short-lived clients like
# a scheduled Actions runner that connects once, writes, and disconnects.
# Example: postgresql://postgres.xxxx:PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
SUPABASE_DB_URL = os.environ.get('SUPABASE_DB_URL')

FEATURE_LABELS = {
    'rain_7d': 'Rainfall in the last 7 days',
    'rain_14d': 'Rainfall in the last 14 days',
    'rain_30d': 'Rainfall in the last 30 days',
    'max_daily_30d': 'Heaviest single-day rainfall (30d)',
    'consecutive_rainy_days': 'Consecutive rainy days',
    'susceptibility_score': 'Terrain susceptibility',
}


# ============================================================
# STEP 1 — Load static artifacts (no retraining, ever)
# ============================================================

def load_artifacts():
    print("Loading static artifacts...")

    su_to_grid = pd.read_parquet(SU_TO_GRID_PATH)  # already has su, lat, lon — built once, reused forever

    susceptibility = pd.read_parquet(SUSCEPTIBILITY_PATH)
    # dedup fix: keep the MAX score per su (worst-case, appropriate for early-warning)
    susceptibility_dedup = (
        susceptibility.sort_values('susceptibility_score', ascending=False)
        .drop_duplicates(subset='su', keep='first')
    )

    lgb_model2 = joblib.load(MODEL2_PATH)
    with open(FEATURE_COLS_PATH) as f:
        feature_cols_m2 = json.load(f)

    admin_lookup = pd.read_parquet(ADMIN_LOOKUP_PATH)  # su, state, district

    explainer = shap.TreeExplainer(lgb_model2)

    print(f"  su_to_grid: {len(su_to_grid)} su's mapped to {su_to_grid[['lat','lon']].drop_duplicates().shape[0]} cells")
    print(f"  susceptibility: {len(susceptibility_dedup)} unique su's")
    print(f"  admin lookup: {len(admin_lookup)} su's tagged")

    return su_to_grid, susceptibility_dedup, lgb_model2, feature_cols_m2, admin_lookup, explainer


# ============================================================
# STEP 3 — Fetch live rainfall (daily history + hourly actual/forecast)
# ============================================================

def _batched_fetch(coords_list, fetch_fn, label):
    result = {}
    for i in range(0, len(coords_list), BATCH_SIZE):
        batch = coords_list[i:i + BATCH_SIZE]
        for attempt in range(3):
            try:
                result.update(fetch_fn(batch))
                break
            except requests.exceptions.HTTPError as e:
                if e.response is not None and e.response.status_code == 429:
                    wait = 5 * (attempt + 1)
                    print(f"  [{label}] rate limited, waiting {wait}s...")
                    time.sleep(wait)
                else:
                    print(f"  [{label}] batch {i} failed: {e}")
                    break
        time.sleep(1)
    print(f"  [{label}] {len(result)}/{len(coords_list)} cells fetched")
    return result


def fetch_daily_batch(coords, days_back=30):
    lats = ",".join(str(lat) for lat, lon in coords)
    lons = ",".join(str(lon) for lat, lon in coords)
    r = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lats, "longitude": lons,
            "daily": "precipitation_sum",
            "past_days": days_back, "forecast_days": 1,
            "timezone": "Asia/Kolkata",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    return {
        (lat, lon): pd.Series(entry['daily']['precipitation_sum'], index=pd.to_datetime(entry['daily']['time']))
        for (lat, lon), entry in zip(coords, data)
    }


def fetch_hourly_batch(coords, past_days=3, forecast_hours=24):
    lats = ",".join(str(lat) for lat, lon in coords)
    lons = ",".join(str(lon) for lat, lon in coords)
    r = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lats, "longitude": lons,
            "hourly": "precipitation",
            "past_days": past_days, "forecast_hours": forecast_hours,
            "timezone": "Asia/Kolkata",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    return {
        (lat, lon): pd.Series(entry['hourly']['precipitation'], index=pd.to_datetime(entry['hourly']['time']))
        for (lat, lon), entry in zip(coords, data)
    }


def fetch_all_rainfall(unique_cells):
    coords_list = list(unique_cells.itertuples(index=False, name=None))
    print("Fetching daily rainfall (30-day history)...")
    cell_daily = _batched_fetch(coords_list, fetch_daily_batch, "daily")
    print("Fetching hourly rainfall (past + forecast)...")
    cell_hourly = _batched_fetch(coords_list, fetch_hourly_batch, "hourly")
    return cell_daily, cell_hourly


# ============================================================
# STEP 4 — Feature construction
# ============================================================

def features_current(daily_series):
    """horizon_hours = 0: plain 30-day daily history, no forecast involved."""
    if daily_series is None or len(daily_series) < 30 or daily_series.iloc[-30:].isna().all():
        return None
    s = daily_series.iloc[-30:].fillna(0)
    return {
        'rain_7d': s.iloc[-7:].sum(),
        'rain_14d': s.iloc[-14:].sum(),
        'rain_30d': s.sum(),
        'max_daily_30d': s.max(),
        'consecutive_rainy_days': int((s.iloc[-7:] > 2.5).sum()),
    }


def features_at_horizon(hourly_series, daily_series, horizon_hours, now):
    """horizon_hours in {3, 6, 12, 24}: project forecasted rain onto 'today' inside the 30-day window.

    IMPORTANT: 'today' (s.iloc[-1]) is REPLACED, not added to, and consecutive_rainy_days
    is computed AFTER that replacement — this avoids the double-count bug found earlier,
    where today's rain got counted once inside the rolling sum and again via a separate +1.
    """
    if hourly_series is None or daily_series is None:
        return None
    if len(daily_series) < 30 or daily_series.iloc[-30:].isna().all():
        return None

    today_start = now.normalize()
    rain_so_far_today = hourly_series[(hourly_series.index >= today_start) & (hourly_series.index <= now)].sum()
    horizon_end = now + pd.Timedelta(hours=horizon_hours)
    rain_forecast = hourly_series[(hourly_series.index > now) & (hourly_series.index <= horizon_end)].sum()

    s = daily_series.iloc[-30:].fillna(0).copy()
    projected_today = rain_so_far_today + rain_forecast
    s.iloc[-1] = projected_today  # today is now correctly INSIDE the window, counted exactly once

    return {
        'rain_7d': s.iloc[-7:].sum(),
        'rain_14d': s.iloc[-14:].sum(),
        'rain_30d': s.sum(),
        'max_daily_30d': s.max(),
        'consecutive_rainy_days': int((s.iloc[-7:] > 2.5).sum()),
    }


def build_cell_features(cell_daily, cell_hourly, now):
    """Compute rainfall features ONCE per unique 0.25° grid cell (292 of them), not once per
    su (123,151 of them). Rainfall features depend only on (lat, lon), never on su itself —
    looping per-su was recomputing the identical result ~421 times per cell for nothing."""
    records = []
    for key, daily_series in cell_daily.items():
        hourly_series = cell_hourly.get(key)
        for h in HORIZONS:
            if h == 0:
                feats = features_current(daily_series)
            else:
                feats = features_at_horizon(hourly_series, daily_series, h, now)
            if feats is None:
                continue
            feats['lat'], feats['lon'] = key
            feats['horizon_hours'] = h
            records.append(feats)
    return pd.DataFrame(records)


def build_all_horizon_features(su_to_grid, cell_daily, cell_hourly, now):
    cell_features = build_cell_features(cell_daily, cell_hourly, now)
    # broadcast: every su inherits its cell's precomputed features — one merge, no per-su loop
    df = su_to_grid[['su', 'lat', 'lon']].merge(cell_features, on=['lat', 'lon'], how='inner')
    print(f"Feature rows built: {len(df)} (expect ~{len(su_to_grid) * len(HORIZONS)})")
    return df


# ============================================================
# STEP 5 — Alert tiering
# ============================================================

def tier_alert(row):
    if row['susceptibility_tier'] in ('Very High', 'High'):
        return 'Critical' if row['triggered'] else 'Watch'
    elif row['susceptibility_tier'] == 'Medium':
        return 'Elevated' if row['triggered'] else 'Normal'
    else:
        return 'Monitor' if row['triggered'] else 'Normal'


# ============================================================
# STEP 6 — SHAP factors
# ============================================================

def add_shap_factors(df, X, feature_cols, explainer, top_n=SHAP_TOP_N):
    shap_values = explainer.shap_values(X)
    sv = shap_values[1] if isinstance(shap_values, list) else shap_values

    top_factors = []
    for i in range(len(X)):
        row_shap = sv[i]
        order = np.argsort(-np.abs(row_shap))[:top_n]
        factors = [
            {
                'feature': feature_cols[j],
                'label': FEATURE_LABELS.get(feature_cols[j], feature_cols[j]),
                'impact': round(float(row_shap[j]), 4),
                'direction': 'increased_risk' if row_shap[j] > 0 else 'decreased_risk',
            }
            for j in order
        ]
        top_factors.append(factors)

    df = df.copy()
    df['top_factors'] = top_factors
    return df


# ============================================================
# STEP 7 — Write to Supabase (Postgres) — this is what the FastAPI service reads
# ============================================================

def write_to_supabase(df, connection_string):
    """Full refresh: replace the whole alerts_latest table with this run's results.
    Simple and correct for now — the table is always 'current state', not a growing history.
    If you later want historical trend data, that's a SEPARATE table/decision, not this one."""
    from sqlalchemy import create_engine, types

    df = df.copy()
    df['top_factors'] = df['top_factors'].apply(json.dumps)  # store as JSON text/JSONB

    engine = create_engine(connection_string)
    df.to_sql(
        'alerts_latest',
        engine,
        if_exists='replace',   # drops and recreates the table with this run's rows
        index=False,
        method='multi',
        chunksize=5000,        # batch inserts — 615k+ rows in one shot is too slow/heavy
        dtype={'top_factors': types.JSON},
    )
    engine.dispose()
    print(f"  Wrote {len(df)} rows to Supabase table 'alerts_latest'")


# ============================================================
# MAIN
# ============================================================

def main():
    run_start = time.time()
    now = pd.Timestamp.now(tz='Asia/Kolkata').tz_localize(None)
    print(f"=== score_hourly.py run at {now} ===\n")

    t0 = time.time()
    su_to_grid, susceptibility_dedup, lgb_model2, feature_cols_m2, admin_lookup, explainer = load_artifacts()
    print(f"  [timing] load_artifacts: {time.time() - t0:.1f}s")

    unique_cells = su_to_grid[['lat', 'lon']].drop_duplicates().reset_index(drop=True)

    t0 = time.time()
    cell_daily, cell_hourly = fetch_all_rainfall(unique_cells)
    print(f"  [timing] fetch_all_rainfall: {time.time() - t0:.1f}s")

    t0 = time.time()
    features_df = build_all_horizon_features(su_to_grid, cell_daily, cell_hourly, now)
    print(f"  [timing] build_all_horizon_features: {time.time() - t0:.1f}s")

    merged = features_df.merge(
        susceptibility_dedup[['su', 'susceptibility_score', 'susceptibility_tier']], on='su', how='inner'
    )

    X = merged[feature_cols_m2]
    merged['trigger_prob'] = lgb_model2.predict_proba(X)[:, 1]
    merged['triggered'] = merged['trigger_prob'] >= CHOSEN_THRESHOLD
    merged['alert_level'] = merged.apply(tier_alert, axis=1)

    # SHAP is expensive per-row. We only need "why is this risky RIGHT NOW" for a user-facing
    # explanation — the horizon_hours==0 rows. Computing it for 3/6/12/24h too was 5x more work
    # for factor breakdowns that mostly restate the same rainfall story with slightly different
    # numbers. Every OTHER horizon gets an empty top_factors list, not a duplicated/stale one —
    # don't be tempted to copy horizon-0's factors onto other horizons; if 24h diverges from
    # horizon-0 (e.g. because of forecasted rain), an unexplained copy would be actively misleading.
    t0 = time.time()
    print("\nAdding SHAP factors (horizon_hours == 0 only)...")
    merged['top_factors'] = [[] for _ in range(len(merged))]
    current_mask = merged['horizon_hours'] == 0
    current_rows = merged.loc[current_mask].copy()
    X_current = current_rows[feature_cols_m2]
    current_with_shap = add_shap_factors(current_rows, X_current, feature_cols_m2, explainer)
    merged.loc[current_mask, 'top_factors'] = pd.Series(
        current_with_shap['top_factors'].values, index=current_rows.index
    )
    print(f"  [timing] add_shap_factors (horizon 0 only, {current_mask.sum()} rows): {time.time() - t0:.1f}s")

    merged = merged.merge(admin_lookup[['su', 'state', 'district']], on='su', how='left')

    print(f"\n=== ALERT COUNTS BY HORIZON ===")
    print(merged.groupby('horizon_hours')['alert_level'].value_counts().unstack(fill_value=0))

    missing_admin = merged['state'].isna().sum()
    if missing_admin:
        print(f"\nWARNING: {missing_admin} rows missing state/district tag")

    timestamp = now.strftime('%Y-%m-%d_%H%M')
    output_cols = ['su', 'state', 'district', 'susceptibility_tier', 'trigger_prob',
                   'triggered', 'alert_level', 'horizon_hours', 'top_factors']

    if SUPABASE_DB_URL:
        print("\nWriting to Supabase...")
        write_to_supabase(merged[output_cols], SUPABASE_DB_URL)
    else:
        print("\nSUPABASE_DB_URL not set — skipping Supabase write (fine for local/manual runs)")

    if IS_CI:
        # GitHub Actions runners are thrown away after each run — writing local snapshot
        # files here would just vanish, and there's no Drive to keep them in. Supabase
        # (written above) is the durable store when running here.
        print("\nRunning in GitHub Actions — skipping local snapshot files (Supabase is the store)")
    else:
        # Local files: kept as a debug/backup artifact for manual/Colab runs.
        parquet_path = f'{DATA_DIR}/scored_output_{timestamp}.parquet'
        json_path = f'{DATA_DIR}/scored_output_latest.json'

        merged[output_cols].to_parquet(parquet_path)
        merged[output_cols].to_json(json_path, orient='records')

        print(f"\nSaved: {parquet_path}")
        print(f"Saved: {json_path}")

        # Retention: keep only the most recent N timestamped snapshots so this doesn't grow forever
        import glob
        KEEP_LAST_N = 48  # ~2 days of hourly runs
        history_files = sorted(glob.glob(f'{DATA_DIR}/scored_output_*.parquet'))
        for old_file in history_files[:-KEEP_LAST_N]:
            os.remove(old_file)
            print(f"  Removed old snapshot: {old_file}")

    print(f"\n[timing] TOTAL RUNTIME: {(time.time() - run_start) / 60:.1f} minutes")


if __name__ == '__main__':
    main()
