async function test() {
  const candidates = ["Durban", "Johannesburg"];
  try {
    for (const candidate of candidates) {
      console.log("Checking candidate:", candidate);
      // Simulate fetch failure
      throw new Error("Network error during fetch");
    }
  } catch (e) {
    console.log("Caught error:", e.message);
  }
}
test();
