#!/usr/bin/env python3
"""Example Overpass query (public). Not run in CI here — sample CSVs are committed.
Respect OSM ToS / ODbL. Do NOT enrich with personal emails.
"""
# Example query string for documentation:
QUERY = """
[out:json][timeout:25];
area["name"="Lyon"]["admin_level"="8"]->.a;
(
  node["amenity"="restaurant"](area.a);
  node["amenity"="cafe"](area.a);
);
out center 50;
"""
print("This script is a template. Demo uses data/ committed samples.")
print(QUERY)
