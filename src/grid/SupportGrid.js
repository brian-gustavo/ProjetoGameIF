/** GRADE SOBRE A QUAL O CAMPO DE JOGO SE POSICIONA */
export default class SupportGrid {
    constructor(numCols) {
        this.numCols = numCols;
        this._cells = new Set();
    }

    _key(col, y) {
        return `${col},${y}`;
    }

    // Adiciona um apoio na grade
    set(col, y) {
        this._cells.add(this._key(col, y));
    }

    // Remove um apoio da grade
    remove(col, y) {
        this._cells.delete(this._key(col, y));
    }

    // Verifica se existe apoio em uma determinada célula
    has(col, y) {
        return this._cells.has(this._key(col, y));
    }

    // Desloca todas as células uma linha pra baixo (a cada pulso), destruindo as que saírem da tela
    shiftDown(step, maxY) {
        const next = new Set();
        const removed = [];

        this._cells.forEach(key => {
            const [col, y] = key.split(',').map(Number);
            const newY = y + step;
            if (newY <= maxY) {
                next.add(this._key(col, newY));
            } else {
                removed.push({ col, y });
            }
        });

        this._cells = next;
        return removed;
    }

    /** MÉTODOS PARA DEBUG */

    // Retorna todas as colunas com apoio em determinada posição Y
    getColsAtY(y) {
        const cols = [];
        for (let col = 0; col < this.numCols; col++) {
            if (this.has(col, y)) cols.push(col);
        }
        return cols;
    }
}