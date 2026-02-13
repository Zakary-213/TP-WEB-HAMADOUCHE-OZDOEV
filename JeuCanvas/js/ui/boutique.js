import { TYPE_VAISSEAU } from '../entities/types/typeVaisseau.js';

export default class Boutique {
    constructor(player) {
        this.player = player;

        // Catalogue officiel de la boutique
        this.ships = [
            {
                id: TYPE_VAISSEAU.NORMAL,
                name: "Vaisseau Classique",
                description: "Équilibré et fiable pour débuter.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.PHASE,
                name: "Vaisseau Phase",
                description: "Traverse certaines météorites.",
                price: 0
            },
            {
                id: TYPE_VAISSEAU.SPLIT,
                name: "Vaisseau Split",
                description: "Tirs qui se divisent à l’impact.",
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
        return true;
    }

    equip(shipId) {
        return this.player.equipShip(shipId);
    }
}

export class BoutiqueUI{
    constructor(player){
        this.player = player;
        this.currentShipIndex = 0;
        this.buyButton = document.querySelector('.ship-action');
        this.shopGold = document.querySelector('.shop-gold');
        this.shopShips = document.querySelectorAll('.ship');
        this.shopName = document.querySelector('.ship-name');
        this.shopDescription = document.querySelector('.ship-description');
        this.shopStatus = document.querySelector('.ship-status');

        this.carouselLeftButton = document.querySelector('.shop-arrow.left');
        this.carouselRightButton = document.querySelector('.shop-arrow.right');

        this.updateGold();
        this.updateShipInfo();

        this.carouselLeftButton.addEventListener('click', () => {
            const total = this.player.ownedShips.length;
            if (total === 0) return;
            this.currentShipIndex = (this.currentShipIndex - 1 + total) % total;
            this.updateShipInfo();
        });

        this.carouselRightButton.addEventListener('click', () => {
            const total = this.player.ownedShips.length;
            if (total === 0) return;
            this.currentShipIndex = (this.currentShipIndex + 1) % total;
            this.updateShipInfo();
        });

        this.buyButton.addEventListener('click', () => {
            const currentShipId = this.player.ownedShips[this.currentShipIndex];
            if(this.player.getEquippedShip() === currentShipId){
                return;
            }
            this.player.equipShip(currentShipId);
            this.updateShipInfo();
        });
    }

    updateGold(){
        this.shopGold.textContent = `💰 ${this.player.gold}`;
    }

    updateShipInfo(){
        const owned = this.player.ownedShips;
        const total = owned.length;
        if (total === 0) return;

        const currentShipId = owned[this.currentShipIndex];

        // Nom + description simples selon le type de vaisseau
        let name = currentShipId;
        let description = "Description du vaisseau à définir";
        switch (currentShipId) {
            case TYPE_VAISSEAU.NORMAL:
                name = "Vaisseau Classique";
                description = "Équilibré et fiable pour débuter.";
                break;
            case TYPE_VAISSEAU.PHASE:
                name = "Vaisseau Phase";
                description = "Traverse certaines météorites.";
                break;
            case TYPE_VAISSEAU.SPLIT:
                name = "Vaisseau Split";
                description = "Tirs qui se divisent à l’impact.";
                break;
        }

        this.shopName.textContent = name;
        this.shopDescription.textContent = description;
        this.shopStatus.textContent = this.player.getEquippedShip() === currentShipId ? "✔ Équipé" : "➕ Cliquer pour équiper";

        // Calcul des index pour gauche / centre / droite (carousel circulaire)
        const prevIndex = (this.currentShipIndex - 1 + total) % total;
        const nextIndex = (this.currentShipIndex + 1) % total;

        const mapShipIdToImage = (shipId) => {
            switch (shipId) {
                case TYPE_VAISSEAU.NORMAL:
                    return 'assets/img/vaisseaux/NORMAL.png';
                case TYPE_VAISSEAU.PHASE:
                    return 'assets/img/vaisseaux/PHASE.png';
                case TYPE_VAISSEAU.SPLIT:
                    return 'assets/img/vaisseaux/SPLIT.png';
                case TYPE_VAISSEAU.SPREAD:
                    return 'assets/img/vaisseaux/SPREAD.png';
                case TYPE_VAISSEAU.RICOCHET:
                    return 'assets/img/vaisseaux/RICOCHET.png';
                case TYPE_VAISSEAU.PIERCE:
                    return 'assets/img/vaisseaux/PIERCE.png';
                default:
                    return 'assets/img/vaisseau.png';
            }
        };

        const slots = [
            { el: this.shopShips[0], shipIndex: prevIndex, position: 'left' },
            { el: this.shopShips[1], shipIndex: this.currentShipIndex, position: 'center' },
            { el: this.shopShips[2], shipIndex: nextIndex, position: 'right' }
        ];

        slots.forEach(slot => {
            if (!slot.el) return;
            const shipId = owned[slot.shipIndex];
            slot.el.src = mapShipIdToImage(shipId);
            slot.el.classList.remove('left', 'center', 'right');
            slot.el.classList.add(slot.position);
        });
    }
}
