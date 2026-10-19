
import { getRecords, saveRecords, createId } from "./storage.js";
import { validateSupplier } from "./validation.js";

const $ = id => document.getElementById(id);
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

function resetSupplierForm() {
  $("supplierForm").reset();
  $("supplierId").value = "";
  $("supplierFormTitle").textContent = "Add Supplier";
  $("saveSupplierBtn").textContent = "＋ Add Supplier";
  $("cancelSupplierEdit").hidden = true;
}

function renderSuppliers() {
  const query = $("supplierSearch").value.trim().toLowerCase();
  const suppliers = getRecords("suppliers").filter(s =>
    [s.name, s.company, s.phone, s.email].join(" ").toLowerCase().includes(query)
  );

  $("supplierTableBody").innerHTML = suppliers.map(s => `
    <tr>
      <td><strong>${safe(s.name)}</strong></td>
      <td>${safe(s.company)}</td>
      <td>${safe(s.phone)}</td>
      <td>${safe(s.email || "—")}</td>
      <td>${safe(s.address)}</td>
      <td><div class="card-actions">
        <button class="btn light" data-edit-supplier="${safe(s.id)}">Edit</button>
        <button class="btn danger" data-delete-supplier="${safe(s.id)}">Delete</button>
      </div></td>
    </tr>`).join("");

  $("supplierEmpty").hidden = suppliers.length > 0;
}

export function initializeSuppliers() {
  renderSuppliers();

  $("supplierForm").addEventListener("submit", event => {
    event.preventDefault();
    const id = $("supplierId").value;
    const supplier = {
      id: id || createId("SUP"),
      name: $("supplierName").value.trim(),
      company: $("supplierCompany").value.trim(),
      phone: $("supplierPhone").value.trim(),
      email: $("supplierEmail").value.trim(),
      address: $("supplierAddress").value.trim()
    };

    const error = validateSupplier(supplier);
    if (error) {
      $("supplierMessage").textContent = error;
      $("supplierMessage").className = "message error";
      return;
    }

    const suppliers = getRecords("suppliers");
    const updated = id
      ? suppliers.map(s => s.id === id ? supplier : s)
      : [...suppliers, supplier];

    if (saveRecords("suppliers", updated)) {
      resetSupplierForm();
      renderSuppliers();
      $("supplierMessage").textContent = "Supplier saved successfully.";
      $("supplierMessage").className = "message success";
    }
  });

  $("cancelSupplierEdit").addEventListener("click", resetSupplierForm);
  $("supplierSearch").addEventListener("input", renderSuppliers);

  $("supplierTableBody").addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-supplier]");
    const del = event.target.closest("[data-delete-supplier]");
    const suppliers = getRecords("suppliers");

    if (edit) {
      const s = suppliers.find(item => item.id === edit.dataset.editSupplier);
      if (!s) return;
      $("supplierId").value = s.id;
      $("supplierName").value = s.name;
      $("supplierCompany").value = s.company;
      $("supplierPhone").value = s.phone;
      $("supplierEmail").value = s.email || "";
      $("supplierAddress").value = s.address;
      $("supplierFormTitle").textContent = "Edit Supplier";
      $("saveSupplierBtn").textContent = "Save Changes";
      $("cancelSupplierEdit").hidden = false;
      $("supplierForm").scrollIntoView({ behavior: "smooth" });
    }

    if (del) {
      const s = suppliers.find(item => item.id === del.dataset.deleteSupplier);
      if (!s || !confirm(`Delete supplier ${s.name}?`)) return;

      const linked = getRecords("products").some(p => p.supplierId === s.id);
      if (linked) {
        alert("This supplier is linked to a product. Assign another supplier to that product before deleting this supplier.");
        return;
      }

      if (saveRecords("suppliers", suppliers.filter(item => item.id !== s.id))) {
        renderSuppliers();
      }
    }
  });

  window.addEventListener("inventory-data-changed", event => {
    if (event.detail?.type === "suppliers") renderSuppliers();
  });
}
