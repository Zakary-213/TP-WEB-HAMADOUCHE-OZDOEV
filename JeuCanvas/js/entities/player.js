import { TYPE_VAISSEAU } from './types/typeVaisseau.js';

export default class Player {
    constructor() {
        this.gold = 0;

        // Vaisseaux possédés
        this.ownedShips = [ ]; 

        // Vaisseau équipé
        this.equippedShip = null;

        this.load();
    }

    /* =========================
       GOLD
    ========================= */

    addGold(amount) {
        this.gold += amount;
        this.save();
    }

    spendGold(amount) {
        if (this.gold < amount) return false;
        this.gold -= amount;
        this.save();
        return true;
    }

    /* =========================
       VAISSEAUX
    ========================= */

    hasShip(shipId) {
        return this.ownedShips.includes(shipId);
    }

    addShip(shipId) {
        if (!this.hasShip(shipId)) {
            this.ownedShips.push(shipId);
            this.save();
        }
    }

    equipShip(shipId) {
        if (!this.hasShip(shipId)) return false;
        this.equippedShip = shipId;
        this.save();
        return true;
    }

    getEquippedShip() {
        return this.equippedShip;
    }


    /* =========================
       SAVE / LOAD
    ========================= */

    save() {
        localStorage.setItem('playerData', JSON.stringify({
            gold: this.gold,
            ownedShips: this.ownedShips,
            equippedShip: this.equippedShip
        }));
    }

    load() {
    const data = JSON.parse(localStorage.getItem('playerData'));
    if (!data) {
        // 👇 DEFAULT ABSOLU
        this.gold = 0;
        this.ownedShips = [TYPE_VAISSEAU.NORMAL];
        this.equippedShip = TYPE_VAISSEAU.NORMAL;
        this.save();
        return;
    }

    this.gold = data.gold ?? 0;
    this.ownedShips = data.ownedShips ?? [TYPE_VAISSEAU.NORMAL];
    this.equippedShip = data.equippedShip ?? TYPE_VAISSEAU.NORMAL;
}

}
