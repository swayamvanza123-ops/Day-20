
export function validateProduct(product) {
  if (!product.name || product.name.trim().length < 2) return "Product name must have at least 2 characters.";
  if (!product.category) return "Please select a product category.";
  if (!Number.isFinite(product.price) || product.price <= 0) return "Selling price must be greater than zero.";
  if (!Number.isFinite(product.purchaseCost) || product.purchaseCost < 0) return "Enter a valid purchase cost.";
  if (!Number.isInteger(product.stock) || product.stock < 0) return "Stock must be a non-negative whole number.";
  return "";
}

export function validateSupplier(supplier) {
  if (!supplier.name || supplier.name.trim().length < 2) return "Enter a valid supplier name.";
  if (!supplier.company.trim()) return "Company name is required.";
  if (!/^[0-9+\s()-]{7,20}$/.test(supplier.phone)) return "Enter a valid phone number.";
  if (supplier.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.email)) return "Enter a valid email address.";
  if (!supplier.address.trim()) return "Address is required.";
  return "";
}

export function validateExpense(expense) {
  if (!expense.title || expense.title.trim().length < 2) return "Expense title must have at least 2 characters.";
  if (!["Rent", "Transport", "Salary", "Electricity", "Other"].includes(expense.category)) return "Select a valid expense category.";
  if (!Number.isFinite(expense.amount) || expense.amount <= 0) return "Amount must be greater than zero.";
  if (!isValidDate(expense.date)) return "Please enter a valid expense date.";
  if (!expense.description || expense.description.trim().length < 3) return "Description must have at least 3 characters.";
  return "";
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10));
}
