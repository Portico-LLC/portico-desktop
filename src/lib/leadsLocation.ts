import { City, Country, State } from 'country-state-city';
import type { ICity } from 'country-state-city';

export interface LeadsLocationSelection {
  countryCode: string;
  stateCode?: string;
  /** City name — `country-state-city` has no stable per-city id, so name (scoped
   *  to the chosen country/state) is what round-trips through the form. */
  cityName?: string;
}

export interface LeadsAnchor {
  lat: string;
  lon: string;
  /** Meters. Wider for a state/country-level anchor (the resolved city is a
   *  stand-in for a whole region) than for a city the user picked directly. */
  radius: number;
  /** The city actually searched around — same as picked when a city was
   *  selected, otherwise the nearest real city to the state/country's centroid,
   *  so the caller can tell the user what location a search actually used. */
  resolvedCityName: string;
}

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** A state or country's own lat/lon is a geometric centroid, not a place —
 *  for a large or unevenly-populated region that can land nowhere near an
 *  actual city (Texas's centroid is 279km from Austin; Tunisia's is ~330km
 *  from Tunis, out in the Sahara), which is exactly the "always zero results"
 *  bug this feature used to hit. Hopping to the real city nearest that
 *  centroid fixes it structurally, for any country/state, without a curated
 *  capitals list. */
function nearestCity(lat: number, lon: number, cities: ICity[]): ICity | null {
  let best: ICity | null = null;
  let bestKm = Infinity;
  for (const city of cities) {
    if (!city.latitude || !city.longitude) continue;
    const km = haversineKm(lat, lon, Number(city.latitude), Number(city.longitude));
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  return best;
}

const CITY_RADIUS_M = 10_000;
const STATE_RADIUS_M = 20_000;
const COUNTRY_RADIUS_M = 30_000;

/** Resolves a country/state/city picker selection to a real, searchable
 *  coordinate — never the raw region centroid on its own (see nearestCity). */
export function resolveLeadsAnchor(selection: LeadsLocationSelection): LeadsAnchor | null {
  const { countryCode, stateCode, cityName } = selection;
  const country = Country.getAllCountries().find((c) => c.isoCode === countryCode);
  if (!country) return null;

  if (stateCode && cityName) {
    const city = City.getCitiesOfState(countryCode, stateCode).find((c) => c.name === cityName);
    if (city?.latitude && city?.longitude) {
      return { lat: city.latitude, lon: city.longitude, radius: CITY_RADIUS_M, resolvedCityName: city.name };
    }
  }

  if (!stateCode && cityName) {
    const city = City.getCitiesOfCountry(countryCode)?.find((c) => c.name === cityName);
    if (city?.latitude && city?.longitude) {
      return { lat: city.latitude, lon: city.longitude, radius: CITY_RADIUS_M, resolvedCityName: city.name };
    }
  }

  if (stateCode) {
    const state = State.getStatesOfCountry(countryCode).find((s) => s.isoCode === stateCode);
    if (state?.latitude && state?.longitude) {
      const cities = City.getCitiesOfState(countryCode, stateCode);
      const nearest = nearestCity(Number(state.latitude), Number(state.longitude), cities);
      if (nearest?.latitude && nearest?.longitude) {
        return { lat: nearest.latitude, lon: nearest.longitude, radius: STATE_RADIUS_M, resolvedCityName: nearest.name };
      }
      return { lat: state.latitude, lon: state.longitude, radius: STATE_RADIUS_M, resolvedCityName: state.name };
    }
  }

  if (country.latitude && country.longitude) {
    const cities = City.getCitiesOfCountry(countryCode) ?? [];
    const nearest = nearestCity(Number(country.latitude), Number(country.longitude), cities);
    if (nearest?.latitude && nearest?.longitude) {
      return { lat: nearest.latitude, lon: nearest.longitude, radius: COUNTRY_RADIUS_M, resolvedCityName: nearest.name };
    }
    return { lat: country.latitude, lon: country.longitude, radius: COUNTRY_RADIUS_M, resolvedCityName: country.name };
  }

  return null;
}

/** A second attempt at a zero-result job — same anchor, a wider net. Covers a
 *  genuinely sparse area (a small town with few of whatever business type was
 *  searched) without giving up after the first, narrower try. */
export function widenLeadsAnchor(anchor: LeadsAnchor): LeadsAnchor {
  return { ...anchor, radius: anchor.radius * 3 };
}
