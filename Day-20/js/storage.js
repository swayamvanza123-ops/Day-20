
const KEYS = {
  products: "inventoryPro_products",
  suppliers: "inventoryPro_suppliers",
  sales: "inventoryPro_sales",
  expenses: "inventoryPro_expenses"
};

export function readRecords(type) {
  try {
    const raw = localStorage.getItem(KEYS[type]);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to read ${type}:`, error);
    return [];
  }
}

export function getRecords(type) {
  return readRecords(type) ?? [];
}

export function saveRecords(type, records) {
  try {
    localStorage.setItem(KEYS[type], JSON.stringify(records));
    window.dispatchEvent(new CustomEvent("inventory-data-changed", {
      detail: { type }
    }));
    return true;
  } catch (error) {
    console.error(`Failed to save ${type}:`, error);
    alert("Could not save data. Your browser storage may be full.");
    return false;
  }
}

export function initializeStorage() {
  if (readRecords("products") === null) {
    saveRecords("products", [
      { id: "P001", name: "Dell Laptop", category: "Electronics", price: 55000, purchaseCost: 42000, stock: 12, supplierId: "", image: "" },
      { id: "P002", name: "Wireless Mouse", category: "Accessories", price: 800, purchaseCost: 450, stock: 40, supplierId: "", image: "" },
      { id: "P003", name: "Mechanical Keyboard", category: "Accessories", price: 1800, purchaseCost: 1100, stock: 25, supplierId: "", image: "" },
      { id: "P004", name: "LED Monitor", category: "Electronics", price: 12500, purchaseCost: 9500, stock: 10, supplierId: "", image: "" },
      { id: "P005", name: "Laser Printer", category: "Electronics", price: 15500, purchaseCost: 12000, stock: 8, supplierId: "", image: "" }
    ]);
  }

  if (readRecords("suppliers") === null) {
    saveRecords("suppliers", [
      { id: "SUP001", name: "Amit Shah", company: "Tech World", phone: "9876543210", email: "amit@example.com", address: "Ahmedabad, Gujarat" },
      { id: "SUP002", name: "Priya Patel", company: "Digital Supplies", phone: "9876501234", email: "priya@example.com", address: "Vadodara, Gujarat" },
      { id: "SUP003", name: "Raj Mehta", company: "Office Essentials", phone: "9876512340", email: "raj@example.com", address: "Surat, Gujarat" }
    ]);
  }

  for (const type of ["sales", "expenses"]) {
    if (readRecords(type) === null) saveRecords(type, []);
  }
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
