
import { getRecords, saveRecords, createId } from "./storage.js";
import { validateProduct } from "./validation.js";

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

function supplierOptions(selected = "") {
  const suppliers = getRecords("suppliers");
  $("productSupplier").innerHTML =
    '<option value="">No supplier selected</option>' +
    suppliers.map(s => `<option value="${safe(s.id)}" ${s.id === selected ? "selected" : ""}>${safe(s.name)} — ${safe(s.company)}</option>`).join("");
}

function resetForm() {
  $("productForm").reset();
  $("productId").value = "";
  $("productFormTitle").textContent = "Add Product";
  $("saveProductBtn").textContent = "＋ Add Product";
  $("cancelProductEdit").hidden = true;
  $("productMessage").textContent = "";
}

function renderProducts() {
  const search = $("productSearch").value.toLowerCase().trim();
  const category = $("productCategoryFilter").value;
  const products = getRecords("products").filter(p =>
    (p.name + " " + p.category).toLowerCase().includes(search) &&
    (!category || p.category === category)
  );

  $("productGrid").innerHTML = products.map(p => {
    const supplier = getRecords("suppliers").find(s => s.id === p.supplierId);
    const image = p.image
      ? `<img src="${safe(p.image)}" alt="${safe(p.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="product-placeholder" style="display:none">📦</div>`
      : `<div class="product-placeholder">📦</div>`;
    return `<article class="product-card">
      <div class="product-image">${image}</div>
      <div class="product-card-body">
        <span class="category-badge">${safe(p.category)}</span>
        <h3>${safe(p.name)}</h3>
        <p class="muted">Supplier: ${safe(supplier?.name || "Not assigned")}</p>
        <div class="price-row"><strong>${money(p.price)}</strong><span class="${p.stock <= 5 ? "low-stock" : "stock-pill"}">${p.stock} in stock</span></div>
        <p class="muted">Purchase cost: ${money(p.purchaseCost)}</p>
        <div class="card-actions"><button class="btn light" data-edit-product="${safe(p.id)}">Edit</button><button class="btn danger" data-delete-product="${safe(p.id)}">Delete</button></div>
      </div>
    </article>`;
  }).join("");

  $("productEmpty").hidden = products.length > 0;
  $("dashboardProducts").innerHTML = getRecords("products").slice(0, 5).map(p =>
    `<div class="mini-product"><span class="mini-icon">📦</span><div><strong>${safe(p.name)}</strong><small>${p.stock} units available</small></div><b>${money(p.price)}</b></div>`
  ).join("");
  refreshProductSelectors();
}

function refreshProductSelectors() {
  const products = getRecords("products");
  const current = $("saleProduct").value;
  $("saleProduct").innerHTML = '<option value="">Select product</option>' +
    products.map(p => `<option value="${safe(p.id)}" ${p.id === current ? "selected" : ""} ${p.stock <= 0 ? "disabled" : ""}>${safe(p.name)} — ${money(p.price)} (${p.stock} in stock)</option>`).join("");
  supplierOptions($("productSupplier").value);
  document.dispatchEvent(new Event("product-selectors-updated"));
}

export function initializeProducts() {
  supplierOptions();
  renderProducts();

  $("productForm").addEventListener("submit", event => {
    event.preventDefault();
    const id = $("productId").value;
    const product = {
      id: id || createId("P"),
      name: $("productName").value.trim(),
      category: $("productCategory").value,
      price: Number($("productPrice").value),
      purchaseCost: Number($("purchaseCost").value),
      stock: Number($("productStock").value),
      supplierId: $("productSupplier").value,
      image: $("productImage").value.trim()
    };
    const error = validateProduct(product);
    if (error) {
      $("productMessage").textContent = error;
      $("productMessage").className = "message error";
      return;
    }

    const products = getRecords("products");
    const updated = id
      ? products.map(p => p.id === id ? product : p)
      : [...products, product];

    if (saveRecords("products", updated)) {
      resetForm();
      renderProducts();
      $("productMessage").textContent = "Product saved successfully.";
      $("productMessage").className = "message success";
    }
  });

  $("cancelProductEdit").addEventListener("click", resetForm);
  $("productSearch").addEventListener("input", renderProducts);
  $("productCategoryFilter").addEventListener("change", renderProducts);

  $("productGrid").addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-product]");
    const del = event.target.closest("[data-delete-product]");
    const products = getRecords("products");

    if (edit) {
      const p = products.find(item => item.id === edit.dataset.editProduct);
      if (!p) return;
      $("productId").value = p.id;
      $("productName").value = p.name;
      $("productCategory").value = p.category;
      $("productPrice").value = p.price;
      $("purchaseCost").value = p.purchaseCost;
      $("productStock").value = p.stock;
      $("productImage").value = p.image || "";
      supplierOptions(p.supplierId);
      $("productFormTitle").textContent = "Edit Product";
      $("saveProductBtn").textContent = "Save Changes";
      $("cancelProductEdit").hidden = false;
      $("productForm").scrollIntoView({ behavior: "smooth" });
    }

    if (del) {
      const p = products.find(item => item.id === del.dataset.deleteProduct);
      if (!p || !confirm(`Delete ${p.name}? Sales history will be kept.`)) return;
      if (getRecords("sales").some(s => s.productId === p.id)) {
        alert("This product has sales history. Keep it to preserve profit calculations; you can set its stock to zero instead.");
        return;
      }
      if (saveRecords("products", products.filter(item => item.id !== p.id))) renderProducts();
    }
  });

  window.addEventListener("inventory-data-changed", event => {
    if (["products", "suppliers"].includes(event.detail?.type)) {
      supplierOptions();
      renderProducts();
    }
  });
}
