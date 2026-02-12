import { TYPE_VAISSEAU } from '../entities/typeVaisseau.js';

export default class Boutique {
    constructor(player) {
        this.player = player;

        // Catalogue officiel de la boutique
        this.ships = [
            {
                id: TYPE_VAISSEAU.NORMAL,
                name: "Vaisseau normal",
                description: "Équilibré et fiable pour débuter.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.SPLIT,
                name: "Vaisseau split",
                description: "Tirs qui se divisent en 2 à l’impact.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.SPREAD,
                name: "Vaisseau spread",
                description: "Deux tirs simultanés.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.RICOCHET,
                name: "Vaisseau ricochet",
                description: "Tirs qui rebondissent sur les murs.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.PIERCE,
                name: "Vaisseau pierce",
                description: "Tirs qui traversent les météorites.",
                price: 0
            }
        ];
    }

    /* =============================
       GETTERS
    ============================= */

    getAllShips() {
        return this.ships;
    }

    getShipById(shipId) {
        return this.ships.find(ship => ship.id === shipId);
    }

    isOwned(shipId) {
        return this.player.hasShip(shipId);
    }

    isEquipped(shipId) {
        return this.player.getEquippedShip() === shipId;
    }

    /* =============================
       ACHAT
    ============================= */

    canBuy(shipId) {
        const ship = this.getShipById(shipId);
        if (!ship) return false;

        if (this.isOwned(shipId)) return false;

        return this.player.gold >= ship.price;
    }

    buy(shipId) {
        const ship = this.getShipById(shipId);

        if (!ship) {
            console.warn("Vaisseau inexistant :", shipId);
            return false;
        }

        if (this.isOwned(shipId)) {
            console.warn("Vaisseau déjà possédé");
            return false;
        }

        if (this.player.gold < ship.price) {
            console.warn("Pas assez de gold");
            return false;
        }

        this.player.spendGold(ship.price);
        this.player.addShip(shipId);

        console.log(`Achat réussi : ${ship.name}`);
        return true;
    }

    /* =============================
       ÉQUIPEMENT
    ============================= */

    equip(shipId) {
    if (!this.isOwned(shipId)) return false;
    this.player.equipShip(shipId);
    return true;
}

}

export class BoutiqueUI{
    constructor(player) {
        this.player = player;
        this.boutique = new Boutique(player);
        this.ships = this.boutique.getAllShips();
        this.currentIndex = this.getEquippedIndex();

        // DOM
        this.goldElement = document.querySelector('.shop-gold');
        this.shipName = document.querySelector('.ship-name');
        this.shipDesc = document.querySelector('.ship-description');
        this.shipStatus = document.querySelector('.ship-status');
        this.shipAction = document.querySelector('.ship-action');

        this.shipImgs = {
            left: document.querySelector('.ship.left'),
            center: document.querySelector('.ship.center'),
            right: document.querySelector('.ship.right')
        };

        this.btnLeft = document.querySelector('.shop-arrow.left');
        this.btnRight = document.querySelector('.shop-arrow.right');

        this.bindEvents();
        this.render();
    }

    updateGold(){
        this.goldElement.textContent = `💰 ${this.player.gold}`;
    }

    getEquippedIndex() {
        const equipped = this.player.getEquippedShip();
        const index = this.ships.findIndex(s => s.id === equipped);
        return index !== -1 ? index : 0;
    }

    bindEvents() {
        this.btnLeft.addEventListener('click', () => {
            this.currentIndex =
                (this.currentIndex - 1 + this.ships.length) % this.ships.length;
            this.render();
        });

        this.btnRight.addEventListener('click', () => {
            this.currentIndex =
                (this.currentIndex + 1) % this.ships.length;
            this.render();
        });

        this.shipAction.addEventListener('click', () => {
            this.onActionClick();
        });
    }

    onActionClick() {
        const ship = this.ships[this.currentIndex];

        if (!this.boutique.isOwned(ship.id)) {
            const success = this.boutique.buy(ship.id);
            if (!success) return;
        }
        else if (!this.boutique.isEquipped(ship.id)) {
            this.boutique.equip(ship.id);
            this.currentIndex = this.getEquippedIndex();
        }
        this.render();
    }


    render() {
        this.updateGold();
        this.updateShips();
        this.updateInfo();
    }

    updateShips() {
        const leftIndex = (this.currentIndex - 1 + this.ships.length) % this.ships.length;
        const rightIndex = (this.currentIndex + 1) % this.ships.length;

        this.setShipImage(this.shipImgs.left, this.ships[leftIndex], false);
        this.setShipImage(this.shipImgs.center, this.ships[this.currentIndex], true);
        this.setShipImage(this.shipImgs.right, this.ships[rightIndex], false);
    }

    setShipImage(img, ship, isActive) {
        img.src = `assets/img/vaisseaux/${ship.id}.png`; // adapte si besoin
        //img.src = "assets/img/vaisseau.png";
        if (isActive) {
            img.classList.add('active');
        } else {
            img.classList.remove('active');
        }
    }

    updateInfo() {
        const ship = this.ships[this.currentIndex];

        this.shipName.textContent = ship.name;
        this.shipDesc.textContent = ship.description;

        if (this.boutique.isEquipped(ship.id)) {
            this.shipStatus.textContent = "✔ Équipé";
            this.shipAction.textContent = "ÉQUIPÉ";
            this.shipAction.disabled = true;
        }
        else if (this.boutique.isOwned(ship.id)) {
            this.shipStatus.textContent = "✔ Possédé";
            this.shipAction.textContent = "ÉQUIPER";
            this.shipAction.disabled = false;
        }
        else {
            this.shipStatus.textContent = `💰 ${ship.price}`;
            this.shipAction.textContent = "ACHETER";
            this.shipAction.disabled = !this.boutique.canBuy(ship.id);
        }
    }
}

