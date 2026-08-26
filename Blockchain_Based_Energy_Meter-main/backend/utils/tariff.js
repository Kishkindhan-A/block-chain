/**
 * ⚡ Enargy Tariff Utility
 * Calculates the electricity bill based on slab system (Indian domestic tariff):
 *   0–100 kWh      → ₹1.5 / kWh
 *   101–300 kWh    → ₹3.0 / kWh
 *   301–500 kWh    → ₹5.0 / kWh
 *   Above 500 kWh  → ₹7.0 / kWh
 */

function calculateBill(totalKwh) {
  let bill = 0;
  let breakdown = [];

  if (totalKwh <= 100) {
    bill = totalKwh * 1.5;
    breakdown = [{ slab: '0–100 kWh', units: totalKwh, rate: 1.5, cost: bill }];
  } else if (totalKwh <= 300) {
    const slab1Cost = 100 * 1.5;
    const slab2Units = totalKwh - 100;
    const slab2Cost = slab2Units * 3.0;
    bill = slab1Cost + slab2Cost;
    breakdown = [
      { slab: '0–100 kWh', units: 100, rate: 1.5, cost: slab1Cost },
      { slab: '101–300 kWh', units: slab2Units, rate: 3.0, cost: slab2Cost },
    ];
  } else if (totalKwh <= 500) {
    const slab1Cost = 100 * 1.5;
    const slab2Cost = 200 * 3.0;
    const slab3Units = totalKwh - 300;
    const slab3Cost = slab3Units * 5.0;
    bill = slab1Cost + slab2Cost + slab3Cost;
    breakdown = [
      { slab: '0–100 kWh', units: 100, rate: 1.5, cost: slab1Cost },
      { slab: '101–300 kWh', units: 200, rate: 3.0, cost: slab2Cost },
      { slab: '301–500 kWh', units: slab3Units, rate: 5.0, cost: slab3Cost },
    ];
  } else {
    const slab1Cost = 100 * 1.5;
    const slab2Cost = 200 * 3.0;
    const slab3Cost = 200 * 5.0;
    const slab4Units = totalKwh - 500;
    const slab4Cost = slab4Units * 7.0;
    bill = slab1Cost + slab2Cost + slab3Cost + slab4Cost;
    breakdown = [
      { slab: '0–100 kWh', units: 100, rate: 1.5, cost: slab1Cost },
      { slab: '101–300 kWh', units: 200, rate: 3.0, cost: slab2Cost },
      { slab: '301–500 kWh', units: 200, rate: 5.0, cost: slab3Cost },
      { slab: 'Above 500 kWh', units: slab4Units, rate: 7.0, cost: slab4Cost },
    ];
  }

  return {
    total_bill: parseFloat(bill.toFixed(2)),
    breakdown,
  };
}

module.exports = { calculateBill };
