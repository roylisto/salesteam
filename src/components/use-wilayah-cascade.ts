"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getCities,
  getDistricts,
  getProvinces,
  getVillages,
  type WilayahOption,
} from "@/lib/actions/regions";

export type WilayahValue = {
  province: string;
  regency: string;
  district: string;
  village: string;
};

export type WilayahTarget = {
  province?: string;
  regency?: string;
  district?: string;
  village?: string;
};

const EMPTY: WilayahValue = { province: "", regency: "", district: "", village: "" };

/** Normalise names so "Kota Administrasi Jakarta Pusat" matches "Jakarta Pusat". */
export function normalizeWilayahName(name: string) {
  if (!name) return "";
  return name
    .toUpperCase()
    .replace(/DAERAH KHUSUS IBUKOTA|DAERAH KHUSUS IBU KOTA|\bDKI\b/g, "DKI")
    .replace(
      /\b(KABUPATEN|KOTA|KAB|ADM|KECAMATAN|KEC|KELURAHAN|KEL|DESA|ADMINISTRASI|PROVINSI)\b\.?/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** Find the option whose name best matches the name coming from the map. */
export function findSimilarWilayah(options: WilayahOption[], targetName: string) {
  if (!targetName) return undefined;

  const normalizedTarget = normalizeWilayahName(targetName);
  if (!normalizedTarget) return undefined;

  // 1. Exact normalised match.
  let found = options.find((opt) => normalizeWilayahName(opt.nama) === normalizedTarget);
  if (found) return found;

  // 2. Jakarta special case (DKI vs city/regency naming differs a lot).
  if (normalizedTarget.includes("JAKARTA")) {
    found = options.find((opt) => {
      const optNorm = normalizeWilayahName(opt.nama);
      return (
        optNorm.includes("JAKARTA") &&
        (optNorm.includes(normalizedTarget) || normalizedTarget.includes(optNorm))
      );
    });
    if (found) return found;
  }

  // 3. Partial match, only for names long enough to be specific.
  if (normalizedTarget.length >= 6) {
    found = options.find((opt) => {
      const optNorm = normalizeWilayahName(opt.nama);
      return optNorm.includes(normalizedTarget) || normalizedTarget.includes(optNorm);
    });
  }

  return found;
}

/**
 * Cascading province → regency → district → village selects backed by the
 * local `wilayah` table, with synchronisation from map (Nominatim) results.
 */
export function useWilayahCascade(initial: WilayahValue = EMPTY) {
  const [province, setProvinceState] = useState(initial.province);
  const [regency, setRegencyState] = useState(initial.regency);
  const [district, setDistrictState] = useState(initial.district);
  const [village, setVillageState] = useState(initial.village);

  const [provinces, setProvinces] = useState<WilayahOption[]>([]);
  const [regencies, setRegencies] = useState<WilayahOption[]>([]);
  const [districts, setDistricts] = useState<WilayahOption[]>([]);
  const [villages, setVillages] = useState<WilayahOption[]>([]);

  const [loadingProvince, setLoadingProvince] = useState(false);
  const [loadingRegency, setLoadingRegency] = useState(false);
  const [loadingDistrict, setLoadingDistrict] = useState(false);
  const [loadingVillage, setLoadingVillage] = useState(false);

  const pendingRef = useRef<WilayahTarget>({});
  const villageRef = useRef(village);
  // Bumped on every map pick so the province effect re-runs even when the
  // province name is unchanged (e.g. picking a second spot in the same city).
  const [syncToken, setSyncToken] = useState(0);

  useEffect(() => {
    villageRef.current = village;
  }, [village]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoadingProvince(true);
      try {
        const data = await getProvinces();
        if (!ignore) setProvinces(data);
      } finally {
        if (!ignore) setLoadingProvince(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  // Province → regencies
  useEffect(() => {
    let ignore = false;

    async function load() {
      const found = findSimilarWilayah(provinces, province);
      if (!found) {
        if (!ignore) {
          setRegencies([]);
          setDistricts([]);
          setVillages([]);
          // Only reset once the list is loaded, otherwise we would wipe the
          // saved value before the options are available.
          if (provinces.length > 0) {
            setProvinceState("");
            setRegencyState("");
            setDistrictState("");
            setVillageState("");
            pendingRef.current = {};
          }
        }
        return;
      }

      setLoadingRegency(true);
      if (province !== found.nama) setProvinceState(found.nama);
      const targetRegency = pendingRef.current.regency;
      if (targetRegency) setRegencyState(targetRegency);

      try {
        const data = await getCities(found.kode);
        if (!ignore) setRegencies(data);
      } finally {
        if (!ignore) setLoadingRegency(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [province, provinces, syncToken]);

  // Regency → districts
  useEffect(() => {
    let ignore = false;

    async function load() {
      const found = findSimilarWilayah(regencies, regency);
      if (!found) {
        if (!ignore) {
          setDistricts([]);
          setVillages([]);
          if (regencies.length > 0) {
            setRegencyState("");
            setDistrictState("");
            setVillageState("");
            pendingRef.current = {};
          }
        }
        return;
      }

      setLoadingDistrict(true);
      if (regency !== found.nama) setRegencyState(found.nama);
      const targetDistrict = pendingRef.current.district;
      if (targetDistrict) setDistrictState(targetDistrict);

      try {
        const data = await getDistricts(found.kode);
        if (!ignore) setDistricts(data);
      } finally {
        if (!ignore) setLoadingDistrict(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [regency, regencies]);

  // District → villages, resolving any village queued by the map pick.
  useEffect(() => {
    let ignore = false;

    async function load() {
      const found = findSimilarWilayah(districts, district);
      if (!found) {
        if (!ignore) {
          setVillages([]);
          if (districts.length > 0) {
            setDistrictState("");
            setVillageState("");
            pendingRef.current = {};
          }
        }
        return;
      }

      setLoadingVillage(true);
      if (district !== found.nama) setDistrictState(found.nama);

      try {
        const data = await getVillages(found.kode);
        if (ignore) return;
        setVillages(data);

        const targetVillage = pendingRef.current.village;
        if (targetVillage) {
          const matched = findSimilarWilayah(data, targetVillage);
          setVillageState(matched ? matched.nama : "");
          pendingRef.current = {};
        } else {
          const currentVillage = villageRef.current;
          if (currentVillage && !findSimilarWilayah(data, currentVillage)) {
            setVillageState("");
          }
        }
      } finally {
        if (!ignore) setLoadingVillage(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [district, districts]);

  const setProvince = useCallback((value: string) => {
    pendingRef.current = {};
    setProvinceState(value);
    setRegencyState("");
    setDistrictState("");
    setVillageState("");
    setRegencies([]);
    setDistricts([]);
    setVillages([]);
  }, []);

  const setRegency = useCallback((value: string) => {
    pendingRef.current = {};
    setRegencyState(value);
    setDistrictState("");
    setVillageState("");
    setDistricts([]);
    setVillages([]);
  }, []);

  const setDistrict = useCallback((value: string) => {
    pendingRef.current = {};
    setDistrictState(value);
    setVillageState("");
    setVillages([]);
  }, []);

  const setVillage = useCallback((value: string) => {
    pendingRef.current = {};
    setVillageState(value);
  }, []);

  /** Queue address components from the map and start the cascade. */
  const syncFromAddress = useCallback((target: WilayahTarget) => {
    pendingRef.current = {
      province: target.province,
      regency: target.regency,
      district: target.district,
      village: target.village,
    };

    // Drop stale values/lists so the cascade resolves against the new region.
    setRegencyState("");
    setDistrictState("");
    setVillageState("");
    setRegencies([]);
    setDistricts([]);
    setVillages([]);

    setSyncToken((token) => token + 1);

    if (target.province) setProvinceState(target.province);
  }, []);

  return {
    province,
    regency,
    district,
    village,
    provinces,
    regencies,
    districts,
    villages,
    loadingProvince,
    loadingRegency,
    loadingDistrict,
    loadingVillage,
    setProvince,
    setRegency,
    setDistrict,
    setVillage,
    syncFromAddress,
  };
}
