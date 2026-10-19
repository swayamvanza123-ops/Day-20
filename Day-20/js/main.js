
import { initializeStorage, getRecords } from "./storage.js";
import { initializeProducts } from "./products.js";
import { initializeSuppliers } from "./suppliers.js";
import { initializeSales } from "./sales.js";
import { initializeExpenses } from "./expenses.js";

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR"
}).format(n);

export function getProducts() {
  return getRecords("products");
}

export function getSales() {
  return getRecords("sales");
}

function renderDashboard() {
  const products = getRecords("products");
  const suppliers = getRecords("suppliers");
  const sales = getRecords("sales");
  const expenses = getRecords("expenses");

  $("statProducts").textContent = products.length;
  $("statStock").textContent = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  $("statLow").textContent = products.filter(p => Number(p.stock) <= 5).length;
  $("statSuppliers").textContent = suppliers.length;
  $("statExpenses").textContent = money(expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0));

  // Sales revenue before discounts = subtotal.
  $("statSales").textContent = money(sales.reduce((sum, s) => sum + Number(s.subtotal || 0), 0));

  const container = $("dashboardProducts");
  if (!products.length) {
    container.innerHTML = '<p class="empty">No products yet. Add your first product in Products.</p>';
  }

  renderProfitReport();
}

function renderProfitReport() {
  const products = getRecords("products");
  const sales = getRecords("sales");
  const expenses = getRecords("expenses");

  const revenue = sales.reduce((sum, s) => sum + Number(s.subtotal || 0), 0);
  const discounts = sales.reduce((sum, s) => sum + Number(s.discount || 0), 0);
  const otherExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  let accurate = true;
  let cogs = 0;

  for (const sale of sales) {
    const product = products.find(p => p.id === sale.productId);
    const recordedCost = Number.isFinite(Number(sale.purchaseCostAtSale))
      ? Number(sale.purchaseCostAtSale)
      : product && Number.isFinite(Number(product.purchaseCost))
        ? Number(product.purchaseCost)
        : null;

    if (recordedCost === null || recordedCost < 0 ||
        !Number.isFinite(Number(sale.quantity)) || Number(sale.quantity) <= 0) {
      accurate = false;
      break;
    }
    cogs += recordedCost * Number(sale.quantity);
  }

  $("reportRevenue").textContent = money(revenue);
  $("reportDiscounts").textContent = money(discounts);
  $("reportExpenses").textContent = money(otherExpenses);

  if (accurate) {
    $("reportCogs").textContent = money(cogs);
    $("reportProfit").textContent = money(revenue - discounts - cogs - otherExpenses);
    $("profitNote").textContent = sales.length
      ? "Estimated profit uses recorded product purchase costs and saved expenses."
      : "No sales have been recorded yet. Profit will update when sales are added.";
  } else {
    $("reportCogs").textContent = "Unavailable";
    $("reportProfit").textContent = "Cannot calculate accurately";
    $("profitNote").textContent = "At least one sale is missing a valid purchase cost or quantity. Add the correct product purchase cost and record valid sale quantities before relying on the profit estimate.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeStorage();

  $("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  initializeSuppliers();
  initializeProducts();
  initializeSales();
  initializeExpenses();

  renderDashboard();

  window.addEventListener("inventory-data-changed", renderDashboard);

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
      link.classList.add("active");
      $("pageTitle").textContent = link.textContent.trim().replace(/^[▦▣♙↗₹▤]+\s*/, "");
    });
  });
});
