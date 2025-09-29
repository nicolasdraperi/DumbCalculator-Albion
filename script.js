let recipes = {};
let selectedItem = null;

// -------------------------
// 🔹 Charger les recettes
// -------------------------
async function loadRecipes() {
  const response = await fetch("recipes.json");
  recipes = await response.json();
  populateFilters();
  populateTable("all"); // afficher tout par défaut
}

// -------------------------
// 🔹 Génération des filtres
// -------------------------
function populateFilters() {
  const filterContainer = document.getElementById("filters");
  filterContainer.innerHTML = "";

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
  allBtn.addEventListener("click", () => populateTable("all"));
  filterContainer.appendChild(allBtn);

  // boutons par catégorie
  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.addEventListener("click", () => populateTable(cat));
    filterContainer.appendChild(btn);
  });
}

// -------------------------
// 🔹 Tableau d’items
// -------------------------
function populateTable(category = "all") {
  const tbody = document.querySelector("#itemTable tbody");
  tbody.innerHTML = ""; // reset

  for (let key in recipes) {
    const requirements = recipes[key].requires;

    if (requirements && Object.keys(requirements).length > 0) {
      // si un filtre est actif, on skip les autres catégories
      if (category !== "all" && recipes[key].category !== category) continue;

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
      tdTier.textContent = recipes[key]?.tier ? `Tier ${recipes[key].tier}` : "-";
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
        document.getElementById("quantity").value = 1;
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
  if (!selectedItem) {
    return; // rien choisi → rien à calculer
  }

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
// 🔹 Charger au démarrage
// -------------------------
loadRecipes();
