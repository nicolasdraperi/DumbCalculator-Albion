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
        name: ingredient.replace(/_/g, " "),
        quantity: needed,
        children: []
      });
    }
  }

  return node;
}

// -------------------------
// 🔹 Affichage en cascade
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

document.getElementById("calcBtn").addEventListener("click", () => {
  const item = document.getElementById("item").value;
  const quantity = parseInt(document.getElementById("quantity").value, 10);

  const root = buildTree(item, quantity);
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "<h3>Ressources nécessaires :</h3>";

  const ul = document.createElement("ul");
  displayTree(root, ul);
  resultDiv.appendChild(ul);
});

// -------------------------
// 🔹 Charger au démarrage
// -------------------------
loadRecipes();
