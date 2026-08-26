import { verifyMapsKey } from "./src/lib/maps.server";

async function test() {
  console.log("Testing verifyMapsKey...");
  try {
    const result = await verifyMapsKey();
    console.log("Result:", result);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
test();
