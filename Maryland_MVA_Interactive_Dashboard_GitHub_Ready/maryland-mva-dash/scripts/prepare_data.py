from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "source_data"
OUTPUT = ROOT / "data" / "dashboard_data.json"


def numeric(series: pd.Series, currency: bool = False) -> pd.Series:
    values = series.astype(str).str.replace(",", "", regex=False)
    if currency:
        values = values.str.replace("$", "", regex=False)
    return pd.to_numeric(values, errors="coerce")


def main() -> None:
    sales_file = SOURCE_DIR / "MVA Vehicle Sales Counts by Month for Calendar Year 2002 through June 2026.csv"
    registrations_file = SOURCE_DIR / "MVA Vehicle Registrations by County as of Each Month End from January 2023 to August 2026.csv"

    sales = pd.read_csv(sales_file)
    sales.columns = sales.columns.str.strip()
    sales["month_number"] = pd.to_datetime(
        sales["Month"].str.strip().str.title(), format="%b"
    ).dt.month
    sales["date"] = pd.to_datetime(
        {"year": sales["Year"], "month": sales["month_number"], "day": 1}
    )
    for column in ["New", "Used"]:
        sales[column] = numeric(sales[column])
    for column in ["Total Sales New", "Total Sales Used"]:
        sales[column] = numeric(sales[column], currency=True)
    sales["total_units"] = sales["New"] + sales["Used"]
    sales["total_value"] = sales["Total Sales New"] + sales["Total Sales Used"]

    registrations = pd.read_csv(registrations_file)
    registrations.columns = registrations.columns.str.strip()
    registrations["date"] = pd.to_datetime(registrations["Year_Month"], format="%Y/%m")
    registrations["Vehicle_Count"] = numeric(registrations["Vehicle_Count"])
    # The blank category begins exactly when the source stops naming "NOT MD";
    # retain those administrative records under one explicit category.
    registrations["County"] = registrations["County"].fillna("NOT MD / UNSPECIFIED")
    registrations["County"] = registrations["County"].replace(
        {"NOT MD": "NOT MD / UNSPECIFIED"}
    )

    statewide = (
        registrations.groupby("date", as_index=False)["Vehicle_Count"]
        .sum()
        .rename(columns={"Vehicle_Count": "statewide_registrations"})
    )

    sales_out = sales[
        ["date", "Year", "month_number", "New", "Used", "total_units",
         "Total Sales New", "Total Sales Used", "total_value"]
    ].copy()
    sales_out.columns = [
        "date", "year", "month", "new_units", "used_units", "total_units",
        "new_value", "used_value", "total_value"
    ]
    registrations_out = registrations[["date", "County", "Vehicle_Count"]].copy()
    registrations_out.columns = ["date", "county", "vehicle_count"]
    statewide_out = statewide.copy()
    statewide_out.columns = ["date", "vehicle_count"]

    for frame in [sales_out, registrations_out, statewide_out]:
        frame["date"] = frame["date"].dt.strftime("%Y-%m-%d")

    payload = {
        "metadata": {
            "sales_updated_through": sales_out["date"].max(),
            "registrations_updated_through": registrations_out["date"].max(),
            "sales_rows": int(len(sales_out)),
            "registration_rows": int(len(registrations_out)),
            "counties": int(registrations_out["county"].nunique()),
        },
        "sales": sales_out.to_dict(orient="records"),
        "registrations": registrations_out.to_dict(orient="records"),
        "statewide": statewide_out.to_dict(orient="records"),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
