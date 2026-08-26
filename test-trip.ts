import { computeRoute } from "./src/lib/maps.server";
import { lookupSouthAfricanWeather } from "./src/lib/weather.server";

async function test() {
  console.log("Testing computeRoute...");
  try {
    const route = await computeRoute("Johannesburg", "Durban");
    console.log("Route success:", route.distance_km, "km");
  } catch (e) {
    console.error("Route failed:", e);
  }

  console.log("\nTesting lookupSouthAfricanWeather (Johannesburg)...");
  try {
    const wx = await lookupSouthAfricanWeather("Johannesburg");
    console.log("Weather success:", wx.current.temperature_c, "C");
  } catch (e) {
    console.error("Weather failed (JHB):", e);
  }

  console.log("\nTesting lookupSouthAfricanWeather (Durban)...");
  try {
    const wx = await lookupSouthAfricanWeather("Durban");
    console.log("Weather success:", wx.current.temperature_c, "C");
  } catch (e) {
    console.error("Weather failed (DUR):", e);
  }
}

test();
