import axios from "axios";
import { config } from "../config.js";

type NbrbRateResponse = {
  Cur_OfficialRate?: number;
  Cur_Scale?: number;
};

const RATE_TTL_MS = 60 * 60 * 1000;
const NBRB_USD_URL = "https://api.nbrb.by/exrates/rates/USD?parammode=2";

let cachedRate = config.USD_RATE;
let cachedAt = 0;

export async function getUsdToBynRate(): Promise<number> {
  if (Date.now() - cachedAt < RATE_TTL_MS && cachedRate > 0) {
    return cachedRate;
  }

  try {
    const response = await axios.get<NbrbRateResponse>(NBRB_USD_URL, {
      timeout: 15_000,
      headers: {
        Accept: "application/json",
        "User-Agent": "realty-minibus/1.0"
      }
    });

    const officialRate = Number(response.data?.Cur_OfficialRate);
    const scale = Number(response.data?.Cur_Scale ?? 1);
    const normalized = officialRate / (Number.isFinite(scale) && scale > 0 ? scale : 1);

    if (Number.isFinite(normalized) && normalized > 0) {
      cachedRate = normalized;
      cachedAt = Date.now();
      return cachedRate;
    }
  } catch (error) {
    console.warn("[rate] failed to fetch NBRB USD rate, fallback to cached/config value");
  }

  return cachedRate;
}
