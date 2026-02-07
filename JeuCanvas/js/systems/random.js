export function pickByWeight(weightTable) {
    const total = weightTable.reduce((sum, e) => sum + e.weight, 0);
    let rand = Math.random() * total;

    for (const entry of weightTable) {
        if (rand < entry.weight) return entry.type;
        rand -= entry.weight;
    }
}
