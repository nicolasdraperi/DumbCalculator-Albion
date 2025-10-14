/** ---------------------------------------
 * Typages JSDoc pour WebStorm
 * ---------------------------------------
 * @typedef {Object} Recipe
 * @property {number=} tier
 * @property {string=} category
 * @property {string=} subCategory
 * @property {string=} icon
 * @property {Object.<string, number>} requires
 */

/** @type {Object.<string, Recipe>} */
let recipes = {};
let selectedItem = null;
/** @type {"all" | string} */
let currentCategory = "all";
/** @type {"all" | string} */
let currentTier = "all";
/** @type {"all" | string} */
let currentSubCategory = "all";


// -------------------------
// 🔹 Charger les recettes
// -------------------------
async function loadRecipes() {
    try {
        const response = await fetch("recipes.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        /** @type {Object.<string, Recipe>} */
        recipes = await response.json();
        populateFilters();
        populateTierFilter();
        populateTable();
    } catch (err) {
        console.error("Impossible de charger recipes.json:", err);
        const res = document.getElementById("result");
        if (res) {
            res.innerHTML = "<p style='color:#ff8080'>Erreur de chargement des recettes.</p>";
        }
    }
}

// -------------------------
// 🔹 Génération des filtres par catégorie
// -------------------------
function populateFilters() {
    const filterContainer = document.getElementById("filters");
    if (!filterContainer) return;
    filterContainer.innerHTML = "";

    /** @type {HTMLElement} */
    const toolSubmenu = document.getElementById("toolSubmenu");

    /** @type {Set<string>} */
    const categories = new Set();

    for (let key in recipes) {
        const r = recipes[key];
        if (r && r.requires && Object.keys(r.requires).length > 0 && r.category) {
            categories.add(r.category);
        }
    }

    // bouton "Tout"
    const allBtn = document.createElement("button");
    allBtn.textContent = "Tout";
    allBtn.addEventListener("click", () => {
        currentCategory = "all";
        currentSubCategory = "all";
        if (toolSubmenu) toolSubmenu.style.display = "none";
        populateTable();
    });
    filterContainer.appendChild(allBtn);

    // boutons par catégorie
    categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.textContent = cat;

        if (cat.toLowerCase() !== "outil") {
            btn.addEventListener("click", () => {
                currentCategory = cat.toLowerCase();
                currentSubCategory = "all";
                if (toolSubmenu) toolSubmenu.style.display = "none";
                populateTable();
            });
        } else {
            btn.addEventListener("click", () => {
                if (!toolSubmenu) return;
                // ouvrir/fermer le menu dropdown positionné sous le bouton
                const r = btn.getBoundingClientRect();
                toolSubmenu.style.left = `${r.left + window.scrollX}px`;
                toolSubmenu.style.top = `${r.bottom + window.scrollY + 6}px`;
                toolSubmenu.style.display = toolSubmenu.style.display === "block" ? "none" : "block";
            });
        }

        filterContainer.appendChild(btn);
    });
}

// -------------------------
// 🔹 Génération du filtre par tier
// -------------------------
function populateTierFilter() {
    const tierContainer = document.getElementById("tierFilter");
    if (!tierContainer) return;
    tierContainer.innerHTML = ""; // reset

    const label = document.createElement("label");
    label.setAttribute("for", "tierSelect");
    label.textContent = "Filtrer par Tier : ";
    label.style.marginRight = "8px";
    tierContainer.appendChild(label);

    const select = document.createElement("select");
    select.id = "tierSelect";

    // option "Tous"
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Tous";
    select.appendChild(allOption);

    // options T2 → T8
    for (let i = 2; i <= 8; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);             // <- cast string
        opt.textContent = `Tier ${i}`;
        select.appendChild(opt);
    }

    select.addEventListener("change", () => {
        currentTier = select.value;
        populateTable();
    });

    tierContainer.appendChild(select);
}

// -------------------------
// 🔹 Tableau d’items
// -------------------------
function populateTable() {
    const tbody = document.querySelector("#itemTable tbody");
    if (!tbody) return;
    tbody.innerHTML = ""; // reset

    for (let key in recipes) {
        const rec = recipes[key];
        if (!rec) continue;

        const requirements = rec.requires;
        const recipeTier = rec.tier;

        if (requirements && Object.keys(requirements).length > 0) {
            // filtre par catégorie (sécurisé si category absent)
            const cat = (rec.category || "").toLowerCase();
            if (currentCategory !== "all" && cat !== currentCategory) continue;

            // filtre sous-catégorie outils
            if (currentCategory === "outil" && currentSubCategory !== "all") {
                const sub = (rec.subCategory || "").toLowerCase();
                if (sub !== String(currentSubCategory).toLowerCase()) continue;
            }

            // filtre par tier
            if (currentTier !== "all" && recipeTier !== parseInt(String(currentTier), 10)) continue;

            const tr = document.createElement("tr");

            // Icône
            const tdIcon = document.createElement("td");
            if (rec.icon) {
                const img = document.createElement("img");
                img.src = rec.icon;
                img.alt = key;
                img.style.width = "40px";
                img.style.height = "40px";
                tdIcon.appendChild(img);
            }
            tr.appendChild(tdIcon);

            // Nom
            const tdName = document.createElement("td");
            tdName.textContent = key.replace(/_/g, " ");
            tr.appendChild(tdName);

            // Tier
            const tdTier = document.createElement("td");
            tdTier.textContent = recipeTier ? `Tier ${recipeTier}` : "-";
            tr.appendChild(tdTier);

            // Radio choisir
            const tdAction = document.createElement("td");
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "selectedItem";
            radio.classList.add("item-radio");
            radio.value = key;

            radio.addEventListener("change", () => {
                selectedItem = key;
                const qty = document.getElementById("quantity");
                if (qty) qty.value = "1";
                // highlight
                document.querySelectorAll("#itemTable tbody tr")
                    .forEach(r => r.classList.remove("selected-row"));
                tr.classList.add("selected-row");
                // activer le bouton calcul
                const btn = document.getElementById("calcBtn");
                if (btn) btn.disabled = false;
            });

            tdAction.appendChild(radio);
            tr.appendChild(tdAction);

            tbody.appendChild(tr);
        }
    }
}

// -------------------------
// 🔹 Construction de l'arbre
// -------------------------
/**
 * @typedef {Object} TreeNode
 * @property {string} id
 * @property {string} name
 * @property {number} quantity
 * @property {Array<TreeNode>} children
 * @param {string} item
 * @param {number} quantity
 * @returns {(TreeNode|null)}
 */
function buildTree(item, quantity) {
    if (!recipes[item]) return null;

    /** @type {TreeNode} */
    const node = {
        id: item,
        name: item.replace(/_/g, " "),
        quantity: quantity,
        children: []
    };

    const recipe = recipes[item].requires;
    for (let ingredient in recipe) {
        const needed = recipe[ingredient] * quantity;

        if (recipes[ingredient] && recipes[ingredient].requires &&
            Object.keys(recipes[ingredient].requires).length > 0) {
            const child = buildTree(ingredient, needed);
            if (child) node.children.push(child);
        } else {
            node.children.push({
                id: ingredient,
                name: ingredient.replace(/_/g, " "),
                quantity: needed,
                children: []
            });
        }
    }

    return node;
}


// -------------------------
// 🔹 Calcul des totaux
// -------------------------
/**
 * @param {{id:string,quantity:number,children:Array}} node
 * @param {Object.<string, number>} [totals]
 * @returns {Object.<string, number>}
 */
function calculateTotals(node, totals = {}) {
    if (node.children.length === 0) {
        totals[node.id] = (totals[node.id] || 0) + node.quantity;
    } else {
        node.children.forEach(child => calculateTotals(child, totals));
    }
    return totals;
}

// -------------------------
// 🔹 Affichage arbre
// -------------------------
function displayTree(node, container) {
    const li = document.createElement("li");
    li.textContent = `${node.name} : ${node.quantity}`;

    if (node.children.length > 0) {
        const ul = document.createElement("ul");
        node.children.forEach(child => displayTree(child, ul));
        li.appendChild(ul);
    }

    container.appendChild(li);
}

// -------------------------
// 🔹 Affichage totaux
// -------------------------
/**
 * @param {Object.<string, number>} totals
 * @returns {HTMLTableElement}
 */
function displayTotals(totals) {
    const table = document.createElement("table");
    table.classList.add("totals-table");

    const header = document.createElement("tr");
    ["Icône", "Nom de l'item", "Quantité", "Tier"].forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        header.appendChild(th);
    });
    table.appendChild(header);

    for (let key in totals) {
        const tr = document.createElement("tr");

        const tdIcon = document.createElement("td");
        if (recipes[key] && recipes[key].icon) {
            const img = document.createElement("img");
            img.src = recipes[key].icon;
            img.alt = key;
            img.style.width = "32px";
            img.style.height = "32px";
            tdIcon.appendChild(img);
        } else {
            tdIcon.textContent = "❓";
        }
        tr.appendChild(tdIcon);

        const tdName = document.createElement("td");
        tdName.textContent = key.replace(/_/g, " ");
        tr.appendChild(tdName);

        const tdQty = document.createElement("td");
        tdQty.textContent = String(totals[key]); // <- cast string
        tr.appendChild(tdQty);

        const tdTier = document.createElement("td");
        tdTier.textContent = (recipes[key] && recipes[key].tier) ? `Tier ${recipes[key].tier}` : "-";
        tr.appendChild(tdTier);

        table.appendChild(tr);
    }

    return table;
}

// -------------------------
// 🔹 Listeners DOM
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search");
    const table = document.getElementById("itemTable");
    const tbody = table ? table.querySelector("tbody") : null;
    /** @type {HTMLElement} */
    const toolSubmenu = document.getElementById("toolSubmenu");
    const calcBtn = document.getElementById("calcBtn");

    // recherche live
    if (searchInput && tbody) {
        searchInput.addEventListener("input", () => {
            const filter = searchInput.value.toLowerCase();
            const rows = tbody.getElementsByTagName("tr");

            for (let row of rows) {
                const nameCell = row.cells[1];
                if (nameCell) {
                    const txtValue = nameCell.textContent || nameCell.innerText;
                    row.style.display = txtValue.toLowerCase().includes(filter) ? "" : "none";
                }
            }
        });
    }

    // sous-menu outils (clic sur une sous-catégorie)
    if (toolSubmenu) {
        toolSubmenu.addEventListener("click", (e) => {
            const b = e.target.closest("button");
            if (!b) return;

            currentCategory = "outil";
            currentSubCategory = b.getAttribute("data-sub"); // doit matcher ton JSON
            toolSubmenu.style.display = "none";
            populateTable();
        });

        // fermer au clic extérieur
        document.addEventListener("click", (e) => {
            if (!toolSubmenu.contains(e.target) && !e.target.closest("#filters")) {
                toolSubmenu.style.display = "none";
            }
        });
    }

    // bouton calcul
    if (calcBtn) {
        calcBtn.disabled = !selectedItem;
        calcBtn.addEventListener("click", () => {
            if (!selectedItem) return;

            const quantity = parseInt(String(document.getElementById("quantity").value), 10);
            const root = buildTree(selectedItem, quantity);
            if (!root) return;

            const resultDiv = document.getElementById("result");
            if (!resultDiv) return;

            resultDiv.innerHTML = "<h3>Ressources nécessaires :</h3>";

            const ul = document.createElement("ul");
            displayTree(root, ul);
            resultDiv.appendChild(ul);

            const totals = calculateTotals(root);
            const totalsDiv = document.createElement("div");
            totalsDiv.innerHTML = "<h3>Totaux bruts :</h3>";
            totalsDiv.appendChild(displayTotals(totals));
            resultDiv.appendChild(totalsDiv);
        });
    }
});

// -------------------------
// 🔹 Charger au démarrage
// -------------------------
void loadRecipes();
