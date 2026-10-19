
import { getRecords, saveRecords, createId } from "./storage.js";
import { isValidDate } from "./validation.js";

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getSelectedProduct() {
  return getRecords("products").find(p => p.id === $("saleProduct").value);
}

function updateBill() {
  const product = getSelectedProduct();
  const quantity = Number($("saleQuantity").value);
  const subtotal = product && Number.isInteger(quantity) && quantity > 0
    ? product.price * quantity : 0;
  const discount = Math.max(0, Number($("saleDiscount").value) || 0);

  $("salePrice").value = product ? product.price.toFixed(2) : "";
  $("saleStockInfo").value = product ? product.stock : "";
  $("saleSubtotal").textContent = money(subtotal);
  $("saleDiscountDisplay").textContent = money(discount);
  $("saleFinalAmount").textContent = money(Math.max(0, subtotal - discount));

  if (product && quantity > product.stock) {
    $("saleMessage").textContent = `Only ${product.stock} units are available.`;
    $("saleMessage").className = "message error";
  } else {
    $("saleMessage").textContent = "";
  }
}

function renderSales() {
  const query = $("salesSearch").value.trim().toLowerCase();
  const date = $("salesDateFilter").value;
  const sales = getRecords("sales").filter(s =>
    (!date || s.date === date) &&
    `${s.invoice} ${s.customer} ${s.productName}`.toLowerCase().includes(query)
  );

  $("salesTableBody").innerHTML = sales.map(s => `
    <tr>
      <td><strong>${safe(s.invoice)}</strong></td>
      <td>${safe(s.customer)}<small class="description-cell">${safe(s.phone || "")}</small></td>
      <td>${safe(s.productName)}</td>
      <td>${s.quantity}</td>
      <td>${money(s.subtotal)}</td>
      <td>${money(s.discount)}</td>
      <td><strong>${money(s.finalAmount)}</strong></td>
      <td>${safe(s.date)}</td>
      <td><button class="btn light" data-view-invoice="${safe(s.id)}">Invoice</button></td>
    </tr>`).join("");

  $("salesEmpty").hidden = sales.length > 0;
}

function showInvoice(sale) {
  if (!sale) return;
  $("invoicePanel").hidden = false;
  $("invoiceContent").innerHTML = `
    <div class="invoice">
      <div class="invoice-head"><div><h2>INVOICE</h2><p>InventoryPro</p></div><div><strong>${safe(sale.invoice)}</strong><p>${safe(sale.date)}</p></div></div>
      <hr>
      <p><strong>Customer:</strong> ${safe(sale.customer)}</p>
      <p><strong>Phone:</strong> ${safe(sale.phone || "—")}</p>
      <div class="table-wrap"><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
      <tbody><tr><td>${safe(sale.productName)}</td><td>${sale.quantity}</td><td>${money(sale.unitPrice)}</td><td>${money(sale.subtotal)}</td></tr></tbody></table></div>
      <div class="invoice-totals"><p>Subtotal: <strong>${money(sale.subtotal)}</strong></p><p>Discount: <strong>${money(sale.discount)}</strong></p><h3>Total: ${money(sale.finalAmount)}</h3></div>
    </div>`;
  $("invoicePanel").scrollIntoView({ behavior: "smooth" });
}

export function initializeSales() {
  $("saleDate").value = today();
  updateBill();

  ["saleProduct", "saleQuantity", "saleDiscount"].forEach(id => {
    $(id).addEventListener("input", updateBill);
    $(id).addEventListener("change", updateBill);
  });

  $("saleForm").addEventListener("submit", event => {
    event.preventDefault();

    const customer = $("saleCustomer").value.trim();
    const phone = $("salePhone").value.trim();
    const productId = $("saleProduct").value;
    const quantity = Number($("saleQuantity").value);
    const discount = Number($("saleDiscount").value);
    const date = $("saleDate").value;

    // Re-read inventory immediately before committing the sale.
    const products = getRecords("products");
    const product = products.find(p => p.id === productId);

    let error = "";
    if (customer.length < 2) error = "Enter a valid customer name.";
    else if (!product) error = "Select a valid product.";
    else if (!Number.isInteger(quantity) || quantity < 1) error = "Quantity must be a positive whole number.";
    else if (quantity > product.stock) error = `Only ${product.stock} units are available.`;
    else if (!Number.isFinite(discount) || discount < 0 || discount > product.price * quantity) error = "Discount must be between zero and the subtotal.";
    else if (!isValidDate(date)) error = "Please select a valid sale date.";

    if (error) {
      $("saleMessage").textContent = error;
      $("saleMessage").className = "message error";
      return;
    }

    const subtotal = product.price * quantity;
    const sale = {
      id: createId("SALE"),
      invoice: `INV-${Date.now()}`,
      customer,
      phone,
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      subtotal,
      discount,
      finalAmount: subtotal - discount,
      date,
      purchaseCostAtSale: Number(product.purchaseCost)
    };

    const updatedProducts = products.map(p =>
      p.id === product.id ? { ...p, stock: p.stock - quantity } : p
    );

    // Roll back the product write if the sale record cannot be saved.
    const originalProducts = products;
    if (!saveRecords("products", updatedProducts)) return;

    const sales = getRecords("sales");
    if (!saveRecords("sales", [...sales, sale])) {
      saveRecords("products", originalProducts);
      $("saleMessage").textContent = "Sale could not be saved. Stock was restored if browser storage allowed it.";
      $("saleMessage").className = "message error";
      return;
    }

    $("saleMessage").textContent = "Sale confirmed. Stock updated successfully.";
    $("saleMessage").className = "message success";
    $("saleForm").reset();
    $("saleDate").value = today();
    $("saleQuantity").value = "1";
    $("saleDiscount").value = "0";
    $("invoicePanel").hidden = false;
    updateBill();
    renderSales();
    showInvoice(sale);
  });

  $("salesSearch").addEventListener("input", renderSales);
  $("salesDateFilter").addEventListener("change", renderSales);

  $("salesTableBody").addEventListener("click", event => {
    const button = event.target.closest("[data-view-invoice]");
    if (button) showInvoice(getRecords("sales").find(s => s.id === button.dataset.viewInvoice));
  });

  $("printInvoice").addEventListener("click", () => window.print());

  document.addEventListener("product-selectors-updated", updateBill);
  window.addEventListener("inventory-data-changed", event => {
    if (["sales", "products"].includes(event.detail?.type)) {
      renderSales();
      updateBill();
    }
  });

  renderSales();
}
