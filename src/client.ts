// FruitShop Client – REST CRUD
// Erwartete API: GET/POST /api/products, PUT/DELETE /api/products/:id


interface Product {
    id: number | string;
    name: string;
    price: number;
    category?: string;
    stock?: number;
    description?: string;
}

interface ProductPayload {
    name: string;
    price: number;
    category: string;
    stock: number;
    description: string;
}

const API_URL = "http://localhost:8082/api/products";

const $ = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`HTML-Element #${id} wurde nicht gefunden.`);
    return element as T;
};


// DOM
const tableBody = $("productTableBody");
const searchInput = $("searchInput") as HTMLInputElement;
const categoryFilter = $("categoryFilter") as HTMLSelectElement;
const loadingState = $("loadingState");
const emptyState = $("emptyState");
const globalMessage = $("globalMessage");
const totalProductsElement = $("totalProducts");
const totalStockElement = $("totalStock");
const inventoryValueElement = $("inventoryValue");
const resultCountElement = $("resultCount");
const productDialog = $("productDialog") as HTMLDialogElement;
const productForm = $("productForm") as HTMLFormElement;
const productIdInput = $("productId") as HTMLInputElement;
const productNameInput = $("productName") as HTMLInputElement;
const productCategoryInput = $("productCategory") as HTMLInputElement;
const productPriceInput = $("productPrice") as HTMLInputElement;
const productStockInput = $("productStock") as HTMLInputElement;
const productDescriptionInput = $("productDescription") as HTMLTextAreaElement;
const dialogTitle = $("dialogTitle");
const dialogEyebrow = $("dialogEyebrow");
const formError = $("formError");
const saveButton = $("saveButton") as HTMLButtonElement;
const detailsDialog = $("detailsDialog") as HTMLDialogElement;
const detailsTitle = $("detailsTitle");
const detailsContent = $("detailsContent");


// State
let products: Product[] = [];
let editingId: Product["id"] | null = null;
let messageTimer: number | undefined;


// Helpers
function showMessage(message: string, type: "success" | "error"): void {
    globalMessage.textContent = message;
    globalMessage.className = `message ${type}`;
    globalMessage.hidden = false;
    if (messageTimer) window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => { globalMessage.hidden = true; }, 4500);
}

function hideMessage(): void {
    globalMessage.hidden = true;
    globalMessage.textContent = "";
}
function money(value: number): string {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}
function normalizedCategory(product: Product): string {
    return product.category?.trim() || "Ohne Kategorie";
}
function stockValue(product: Product): number {
    return Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
}
function safeNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function stockClass(stock: number): string {
    if (stock <= 0) return "stock-out";
    if (stock <= 5) return "stock-low";
    return "stock-ok";
}
function stockLabel(stock: number): string {
    if (stock <= 0) return "Ausverkauft";
    if (stock <= 5) return `Nur ${stock}`;
    return "Auf Lager";
}
function setFormError(message: string): void {
    formError.textContent = message;
    formError.hidden = !message;
}


// API
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T | null> {
    const response = await fetch(url, options);
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}${text ? ` – ${text}` : ""}`);
    }
    if (!text.trim()) return null;
    try { return JSON.parse(text) as T; }
    catch { return null; }
}
async function loadProducts(): Promise<void> {
    loadingState.hidden = false;
    emptyState.hidden = true;
    hideMessage();
    try {
        const result = await apiRequest<Product[]>(API_URL);
        products = Array.isArray(result) ? result : [];
        updateCategoryFilter();
        updateDashboard();
        renderProducts();
    } catch (error) {
        console.error("Produkte laden fehlgeschlagen:", error);
        showMessage(error instanceof Error ? error.message : "Produkte konnten nicht geladen werden. Prüfe API und Endpoint.", "error");
        products = [];
        updateDashboard();
        renderProducts();
    } finally {
        loadingState.hidden = true;
    }
}
async function createProduct(payload: ProductPayload): Promise<void> {
    await apiRequest(API_URL, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) });
    await loadProducts();
    showMessage("Produkt wurde erfolgreich hinzugefügt.", "success");
}
async function updateProduct(id: Product["id"], payload: ProductPayload): Promise<void> {
    await apiRequest(`${API_URL}/${encodeURIComponent(String(id))}`, { method: "PUT", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ id, ...payload }) });
    await loadProducts();
    showMessage("Produkt wurde aktualisiert.", "success");
}
async function deleteProduct(id: Product["id"]): Promise<void> {
    if (!confirm(`Möchtest du Produkt #${id} wirklich löschen?`)) return;
    try {
        await apiRequest(`${API_URL}/${encodeURIComponent(String(id))}`, { method: "DELETE" });
        await loadProducts();
        showMessage("Produkt wurde gelöscht.", "success");
    } catch (error) {
        console.error("Löschen fehlgeschlagen:", error);
        showMessage(error instanceof Error ? error.message : "Produkt konnte nicht gelöscht werden.", "error");
    }
}


// Dashboard and filtering
function updateDashboard(): void {
    const totalStock = products.reduce((sum, product) => sum + stockValue(product), 0);
    const inventoryValue = products.reduce((sum, product) => sum + safeNumber(product.price) * stockValue(product), 0);
    totalProductsElement.textContent = String(products.length);
    totalStockElement.textContent = totalStock.toLocaleString("de-DE");
    inventoryValueElement.textContent = money(inventoryValue);
}
function updateCategoryFilter(): void {
    const current = categoryFilter.value;
    const categories = [...new Set(products.map(normalizedCategory))].sort((a, b) => a.localeCompare(b, "de"));
    categoryFilter.replaceChildren(new Option("Alle Kategorien", "all"));
    for (const category of categories) categoryFilter.add(new Option(category, category));
    if (categories.includes(current)) categoryFilter.value = current;
}
function getFilteredProducts(): Product[] {
    const term = searchInput.value.trim().toLocaleLowerCase("de-DE");
    const category = categoryFilter.value;
    return products.filter(product => {
        const matchesTerm = `${product.name} ${normalizedCategory(product)} ${product.description ?? ""}`.toLocaleLowerCase("de-DE").includes(term);
        const matchesCategory = category === "all" || normalizedCategory(product) === category;
        return matchesTerm && matchesCategory;
    });
}
function renderProducts(): void {
    const filtered = getFilteredProducts();
    tableBody.replaceChildren();
    resultCountElement.textContent = `${filtered.length} von ${products.length}`;
    emptyState.hidden = filtered.length > 0;
    if (products.length === 0) emptyState.textContent = "Noch keine Produkte vorhanden. Lege über „Neues Produkt“ den ersten Eintrag an.";
    else emptyState.textContent = "Keine Produkte entsprechen deiner Suche.";

    for (const product of filtered) {
        const row = document.createElement("tr");
        const idCell = document.createElement("td");
        idCell.textContent = String(product.id);
        const nameCell = document.createElement("td");
        const name = document.createElement("strong");
        name.className = "product-name";
        name.textContent = product.name;
        const description = document.createElement("small");
        description.className = "product-subtitle";
        description.textContent = product.description?.trim() || "Keine Beschreibung";
        nameCell.append(name, description);
        const categoryCell = document.createElement("td");
        const category = document.createElement("span");
        category.className = "category-badge";
        category.textContent = normalizedCategory(product);
        categoryCell.appendChild(category);
        const priceCell = document.createElement("td");
        priceCell.className = "price";
        priceCell.textContent = money(safeNumber(product.price));
        const stock = stockValue(product);
        const stockCell = document.createElement("td");
        stockCell.textContent = String(stock);
        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = `stock-badge ${stockClass(stock)}`;
        status.textContent = stockLabel(stock);
        statusCell.appendChild(status);
        const actionsCell = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "action-group";
        const detailBtn = actionButton("Details", "small-action", () => openDetails(product));
        const editBtn = actionButton("Bearbeiten", "small-action", () => openEditDialog(product));
        const deleteBtn = actionButton("Löschen", "small-action delete", () => void deleteProduct(product.id));
        actionGroup.append(detailBtn, editBtn, deleteBtn);
        actionsCell.appendChild(actionGroup);
        row.append(idCell, nameCell, categoryCell, priceCell, stockCell, statusCell, actionsCell);
        tableBody.appendChild(row);
    }
}
function actionButton(label: string, className: string, action: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
}


// Dialogs
function openCreateDialog(): void {
    editingId = null;
    productForm.reset();
    productIdInput.value = "";
    dialogEyebrow.textContent = "NEUES PRODUKT";
    dialogTitle.textContent = "Produkt hinzufügen";
    saveButton.textContent = "Produkt erstellen";
    setFormError("");
    productDialog.showModal();
    productNameInput.focus();
}
function openEditDialog(product: Product): void {
    editingId = product.id;
    productForm.reset();
    productIdInput.value = String(product.id);
    productNameInput.value = product.name;
    productCategoryInput.value = product.category ?? "";
    productPriceInput.value = String(product.price);
    productStockInput.value = String(stockValue(product));
    productDescriptionInput.value = product.description ?? "";
    dialogEyebrow.textContent = `PRODUKT #${product.id}`;
    dialogTitle.textContent = "Produkt bearbeiten";
    saveButton.textContent = "Änderungen speichern";
    setFormError("");
    productDialog.showModal();
}
function closeProductDialog(): void {
    productDialog.close();
    setFormError("");
}
function openDetails(product: Product): void {
    detailsTitle.textContent = product.name;
    detailsContent.replaceChildren();
    const entries: [string, string][] = [
        ["Produkt-ID", String(product.id)],
        ["Kategorie", normalizedCategory(product)],
        ["Preis", money(safeNumber(product.price))],
        ["Bestand", `${stockValue(product)} Einheiten`],
        ["Lagerstatus", stockLabel(stockValue(product))],
        ["Beschreibung", product.description?.trim() || "Keine Beschreibung vorhanden"]
    ];
    for (const [label, value] of entries) {
        const item = document.createElement("div");
        item.className = `detail-item${label === "Beschreibung" ? " detail-description" : ""}`;
        const labelEl = document.createElement("span");
        labelEl.textContent = label;
        const valueEl = document.createElement("strong");
        valueEl.textContent = value;
        item.append(labelEl, valueEl);
        detailsContent.appendChild(item);
    }
    detailsDialog.showModal();
}


// Events
$("addProductButton").addEventListener("click", openCreateDialog);
$("refreshButton").addEventListener("click", () => void loadProducts());
$("dialogX").addEventListener("click", closeProductDialog);
$("cancelButton").addEventListener("click", closeProductDialog);
$("detailsX").addEventListener("click", () => detailsDialog.close());
$("detailsClose").addEventListener("click", () => detailsDialog.close());
searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);

productForm.addEventListener("submit", async event => {
    event.preventDefault();
    setFormError("");
    const name = productNameInput.value.trim();
    const price = Number(productPriceInput.value);
    const stock = Number(productStockInput.value);
    if (!name) return setFormError("Bitte gib einen Produktnamen ein.");
    if (!Number.isFinite(price) || price < 0) return setFormError("Bitte einen gültigen Preis eingeben.");
    if (!Number.isInteger(stock) || stock < 0) return setFormError("Der Bestand muss eine positive ganze Zahl oder 0 sein.");
    const payload: ProductPayload = {
        name,
        price,
        category: productCategoryInput.value.trim(),
        stock,
        description: productDescriptionInput.value.trim()
    };
    saveButton.disabled = true;
    saveButton.textContent = "Speichert …";
    try {
        if (editingId === null) await createProduct(payload);
        else await updateProduct(editingId, payload);
        closeProductDialog();
    } catch (error) {
        console.error("Speichern fehlgeschlagen:", error);
        setFormError(error instanceof Error ? error.message : "Speichern fehlgeschlagen. Prüfe API und Datenformat.");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = editingId === null ? "Produkt erstellen" : "Änderungen speichern";
    }
});

// Start
void loadProducts();
