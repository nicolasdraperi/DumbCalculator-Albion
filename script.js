let recipes = {};
let selectedItem = null;
let currentCategory = "all";
let currentTier = "all";
let currentSubCategory = "all"; // pour outils


// -------------------------
// 🔹 Charger les recettes
// -------------------------
async function loadRecipes() {
  try {
    const response = await fetch("recipes.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    recipes = await response.json();
    populateFilters();
    populateTierFilter();
    populateTable();
  } catch (err) {
    console.error("Impossible de charger recipes.json:", err);
    document.getElementById("result").innerHTML =
        "<p style='color:#ff8080'>Erreur de chargement des recettes.</p>";
  }
}

// -------------------------
// 🔹 Génération des filtres par catégorie
// -------------------------
function populateFilters() {
  const filterContainer = document.getElementById("filters");
  filterContainer.innerHTML = "";

  const toolSubmenu = document.getElementById("toolSubmenu");
  const categories = new Set();

  for (let key in recipes) {
    const requirements = recipes[key].requires;
    if (requirements && Object.keys(requirements).length > 0 && recipes[key].category) {
      categories.add(recipes[key].category);
    }
  }

  // bouton "Tout"
  const allBtn = document.createElement("button");
  allBtn.textContent = "Tout";
  allBtn.addEventListener("click", () => {
    currentCategory = "all";
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
        populateTable();
      });
    } else {
      btn.addEventListener("click", () => {
        // juste ouvrir/fermer le menu dropdown
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
  tierContainer.innerHTML = ""; // reset pour éviter les doublons

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
    opt.value = i;
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
  tbody.innerHTML = ""; // reset

  for (let key in recipes) {
    const requirements = recipes[key].requires;
    const recipeTier = recipes[key]?.tier;

    if (requirements && Object.keys(requirements).length > 0) {
      // filtre par catégorie
      if (currentCategory !== "all" && recipes[key].category.toLowerCase() !== currentCategory) continue;

      // filtre sous-catégorie outils
      if (currentCategory === "outil" && currentSubCategory !== "all") {
        const sub = (recipes[key].subCategory || "").toLowerCase();
        if (sub !== currentSubCategory.toLowerCase()) continue;
      }



      // filtre par tier
      if (currentTier !== "all" && recipeTier !== parseInt(currentTier, 10)) continue;


      const tr = document.createElement("tr");

      // Icône
      const tdIcon = document.createElement("td");
      if (recipes[key]?.icon) {
        const img = document.createElement("img");
        img.src = recipes[key].icon;
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

      // dans populateTable(), après avoir créé `radio`
      radio.addEventListener("change", () => {
        selectedItem = key;
        document.getElementById("quantity").value = 1;
        // highlight
        document.querySelectorAll("#itemTable tbody tr").forEach(r => r.classList.remove("selected-row"));
        tr.classList.add("selected-row");
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
function buildTree(item, quantity) {
  if (!recipes[item]) return null;

  const node = {
    id: item,
    name: item.replace(/_/g, " "),
    quantity: quantity,
    children: []
  };

  const recipe = recipes[item].requires;

  for (let ingredient in recipe) {
    const needed = recipe[ingredient] * quantity;

    if (recipes[ingredient] && Object.keys(recipes[ingredient].requires).length > 0) {
      node.children.push(buildTree(ingredient, needed));
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
    if (recipes[key]?.icon) {
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
    tdQty.textContent = totals[key];
    tr.appendChild(tdQty);

    const tdTier = document.createElement("td");
    tdTier.textContent = recipes[key]?.tier ? `Tier ${recipes[key].tier}` : "-";
    tr.appendChild(tdTier);

    table.appendChild(tr);
  }

  return table;
}

// -------------------------
// 🔹 Event bouton calcul
// -------------------------
document.getElementById("calcBtn").addEventListener("click", () => {
  if (!selectedItem) return;

  const quantity = parseInt(document.getElementById("quantity").value, 10);
  const root = buildTree(selectedItem, quantity);
  const resultDiv = document.getElementById("result");
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

// -------------------------
// 🔹 Barre de recherche
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const table = document.getElementById("itemTable");
  const tbody = table.querySelector("tbody");

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
});
// -------------------------
// 🔹 Gestion du sous-menu Outils
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const toolSubmenu = document.getElementById("toolSubmenu");

  toolSubmenu.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;

    currentCategory = "outil";
    currentSubCategory = b.getAttribute("data-sub"); // doit matcher ton JSON
    toolSubmenu.style.display = "none";
    populateTable();
  });

});

// -------------------------
// 🔹 Charger au démarrage
// -------------------------
loadRecipes();
