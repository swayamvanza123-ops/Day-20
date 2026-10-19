
import { getRecords, saveRecords, createId } from "./storage.js";
import { validateExpense } from "./validation.js";

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function resetExpenseForm() {
  $("expenseForm").reset();
  $("expenseId").value = "";
  $("expenseDate").value = localToday();
  $("expenseFormTitle").textContent = "Add Expense";
  $("saveExpenseBtn").textContent = "＋ Save Expense";
  $("cancelExpenseEdit").hidden = true;
}

function renderExpenses() {
  const query = $("expenseSearch").value.trim().toLowerCase();
  const category = $("expenseCategoryFilter").value;
  const date = $("expenseDateFilter").value;

  const filtered = getRecords("expenses").filter(e =>
    e.title.toLowerCase().includes(query) &&
    (!category || e.category === category) &&
    (!date || e.date === date)
  );

  $("expenseTableBody").innerHTML = filtered.map(e => `
    <tr>
      <td><strong>${safe(e.title)}</strong></td>
      <td><span class="category-badge">${safe(e.category)}</span></td>
      <td><strong>${money(e.amount)}</strong></td>
      <td>${safe(e.date)}</td>
      <td>${safe(e.description)}</td>
      <td><div class="card-actions">
        <button class="btn light" data-edit-expense="${safe(e.id)}">Edit</button>
        <button class="btn danger" data-delete-expense="${safe(e.id)}">Delete</button>
      </div></td>
    </tr>`).join("");

  $("expenseEmpty").hidden = filtered.length > 0;
}

function renderExpenseSummary() {
  const expenses = getRecords("expenses");
  const now = new Date();

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const monthly = expenses.filter(e => {
    const d = new Date(`${e.date}T00:00:00`);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).reduce((sum, e) => sum + Number(e.amount), 0);

  $("totalExpenses").textContent = money(total);
  $("monthlyExpenses").textContent = money(monthly);
  $("expenseCount").textContent = expenses.length;
}

export function initializeExpenses() {
  $("expenseDate").value = localToday();

  $("expenseForm").addEventListener("submit", event => {
    event.preventDefault();

    const editingId = $("expenseId").value;
    const expense = {
      id: editingId || createId("EXP"),
      title: $("expenseTitle").value.trim(),
      category: $("expenseCategory").value,
      amount: Number($("expenseAmount").value),
      date: $("expenseDate").value,
      description: $("expenseDescription").value.trim()
    };

    const error = validateExpense(expense);
    if (error) {
      $("expenseMessage").textContent = error;
      $("expenseMessage").className = "message error";
      return;
    }

    const records = getRecords("expenses");
    const updated = editingId
      ? records.map(e => e.id === editingId ? expense : e)
      : [...records, expense];

    if (saveRecords("expenses", updated)) {
      resetExpenseForm();
      $("expenseMessage").textContent = "Expense saved successfully.";
      $("expenseMessage").className = "message success";
      renderExpenses();
      renderExpenseSummary();
    }
  });

  $("cancelExpenseEdit").addEventListener("click", resetExpenseForm);
  $("expenseSearch").addEventListener("input", renderExpenses);
  $("expenseCategoryFilter").addEventListener("change", renderExpenses);
  $("expenseDateFilter").addEventListener("change", renderExpenses);

  $("expenseTableBody").addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-expense]");
    const del = event.target.closest("[data-delete-expense]");
    const expenses = getRecords("expenses");

    if (edit) {
      const e = expenses.find(item => item.id === edit.dataset.editExpense);
      if (!e) return;
      $("expenseId").value = e.id;
      $("expenseTitle").value = e.title;
      $("expenseCategory").value = e.category;
      $("expenseAmount").value = e.amount;
      $("expenseDate").value = e.date;
      $("expenseDescription").value = e.description;
      $("expenseFormTitle").textContent = "Edit Expense";
      $("saveExpenseBtn").textContent = "Save Changes";
      $("cancelExpenseEdit").hidden = false;
      $("expenseForm").scrollIntoView({ behavior: "smooth" });
    }

    if (del) {
      const e = expenses.find(item => item.id === del.dataset.deleteExpense);
      if (!e || !confirm(`Delete expense "${e.title}"?`)) return;
      if (saveRecords("expenses", expenses.filter(item => item.id !== e.id))) {
        renderExpenses();
        renderExpenseSummary();
      }
    }
  });

  window.addEventListener("inventory-data-changed", event => {
    if (event.detail?.type === "expenses") {
      renderExpenses();
      renderExpenseSummary();
    }
  });

  renderExpenses();
  renderExpenseSummary();
}
