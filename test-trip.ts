import { computeRoute } from "./src/lib/maps.server";
import { getCitiesWeather } from "./src/lib/weather.server";

async function test() {
  console.log("Testing computeRoute...");
  try {
    const route = await computeRoute("Johannesburg", "Durban").catch(e => {
        console.error("Route catch block caught error:", e.message);
        return null;
    });
    console.log("Route result:", route ? route.distance_km + " km" : "null");
  } catch (e) {
    console.error("Route FATAL failed:", e);
  }

  console.log("\nTesting getCitiesWeather(['Johannesburg', 'Durban'])...");
  try {
    const weather = await getCitiesWeather(["Johannesburg", "Durban"]);
    console.log("Weather results:", weather.map(w => w ? w.location + ": " + w.current.temperature_c + "C" : "null"));
  } catch (e) {
    console.error("Weather FATAL failed:", e);
  }
}

test();
