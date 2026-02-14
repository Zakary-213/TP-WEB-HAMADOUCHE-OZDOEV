/**
 * @module random
 * @description Utilitaires pour la génération de nombres aléatoires et la sélection pondérée.
 * Permet de gérer les probabilités d'apparition des objets (loot, ennemis, etc.).
 */

/**
 * Sélectionne un type d'élément dans un tableau en fonction de son poids (probabilité).
 * Plus le poids est élevé par rapport au total, plus l'élément a de chances d'être choisi.
 * * @param {Array<{type: string, weight: number}>} weightTable - Tableau d'objets contenant le type et son poids.
 * @returns {string} Le type de l'élément sélectionné.
 * * @example
 * const loot = [ {type: 'GOLD', weight: 80}, {type: 'DIAMOND', weight: 20} ];
 * pickByWeight(loot); // Retournera 'GOLD' dans 80% des cas.
 */
export function pickByWeight(weightTable) {
    /**
     * 1. Calcul de la somme totale des poids.
     * On additionne toutes les valeurs 'weight' pour définir l'étendue de notre tirage.
     */
    const total = weightTable.reduce((sum, e) => sum + e.weight, 0);

    /**
     * 2. Tirage d'un nombre aléatoire entre 0 et le total des poids.
     */
    let rand = Math.random() * total;

    /**
     * 3. Parcours de la table pour trouver l'intervalle correspondant.
     * On soustrait successivement le poids de chaque entrée au nombre tiré. 
     * Dès que le nombre devient inférieur au poids de l'entrée actuelle, on a trouvé notre gagnant.
     */
    for (const entry of weightTable) {
        if (rand < entry.weight) {
            return entry.type;
        }
        rand -= entry.weight;
    }
    
    // Fallback de sécurité (retourne le dernier type si aucun n'est choisi suite à une erreur de calcul)
    return weightTable[weightTable.length - 1].type;
}