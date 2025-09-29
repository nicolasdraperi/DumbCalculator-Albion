let recipes = {};

async function loadRecipes() {
  const response = await fetch("recipes.json");
  recipes = await response.json();
  populateDropdown();
}

function populateDropdown() {
  const select = document.getElementById("item");
  select.innerHTML = ""; // reset

  for (let key in recipes) {
    const requirements = recipes[key].requires;
    if (requirements && Object.keys(requirements).length > 0) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key.replace(/_/g, " ");
      select.appendChild(option);
    }
  }
}

// -------------------------
// 🔹 Construction de l'arbre
// -------------------------
function buildTree(item, quantity) {
  if (!recipes[item]) return null;

  const node = {
    id: item, // garder la clé technique pour retrouver icône/tier
    name: item.replace(/_/g, " "),
    quantity: quantity,
    children: []
  };

  const recipe = recipes[item].requires;

  for (let ingredient in recipe) {
    const needed = recipe[ingredient] * quantity;

    if (recipes[ingredient] && Object.keys(recipes[ingredient].requires).length > 0) {
      // Recette craftable → descente récursive
      node.children.push(buildTree(ingredient, needed));
    } else {
      // Ressource brute → feuille
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
// 🔹 Affichage en cascade (arbre)
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
// 🔹 Affichage des totaux (tableau)
// -------------------------
function displayTotals(totals) {
  const table = document.createElement("table");
  table.classList.add("totals-table");

  // en-tête
  const header = document.createElement("tr");
  ["Icône", "Nom de l'item", "Quantité", "Tier"].forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    header.appendChild(th);
  });
  table.appendChild(header);

  // lignes
  for (let key in totals) {
    const tr = document.createElement("tr");

    // icône
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

    // nom
    const tdName = document.createElement("td");
    tdName.textContent = key.replace(/_/g, " ");
    tr.appendChild(tdName);

    // quantité
    const tdQty = document.createElement("td");
    tdQty.textContent = totals[key];
    tr.appendChild(tdQty);

    // tier
    const tdTier = document.createElement("td");
    tdTier.textContent = recipes[key]?.tier ? `Tier ${recipes[key].tier}` : "-";
    tr.appendChild(tdTier);

    table.appendChild(tr);
  }

  return table;
}

// -------------------------
// 🔹 Event bouton
// -------------------------
document.getElementById("calcBtn").addEventListener("click", () => {
  const item = document.getElementById("item").value;
  const quantity = parseInt(document.getElementById("quantity").value, 10);

  const root = buildTree(item, quantity);
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<h3>Ressources nécessaires :</h3>";

  // arbre
  const ul = document.createElement("ul");
  displayTree(root, ul);
  resultDiv.appendChild(ul);

  // totaux
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
