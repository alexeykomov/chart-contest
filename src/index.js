/*
 * Copyright (c) 2017. Whisp, Alex K.
 */

/**
 * @fileoverview Application entry point.
 * @author alexeykcontact@gmail.com (Alex K)
 */

import {data} from './data';

const app = new App();
window.addEventListener('DOMContentLoaded', () => app.onLoad(), false);
window.addEventListener('unload', () => app.onUnLoad(), false);

class Chart {
  constructor() {

    /** @type {State} */
    this.state = {
      lines: [],
      min: 0,
      max: 0,
      colors: [],
    };

    /** @type {HTMLCanvasElement} */
    this.mainCanvas;
    this.legendCanvas;
    this.buttonOk;
    this.buttonCancel;
    /** @type {CanvasRenderingContext2D} */
    this.context;
    this.canvasWidth = 100;
    this.canvasHeight = 100;
  }

  onLoad() {
    this.mainCanvas = document.querySelector('.main-canvas');
    this.legendCanvas = document.querySelector('legend-canvas');
    this.context = mainCanvas.getContext('2d');
  }

  onUnLoad() {
  }

  /**
   * @param {{
    columns: Array.<Array.<string|number>>,
    colors: Array.<string>
   }} entry
   * @return {State}
   */
  formatDataEntry(entry) {
    const lines = [];
    entry.columns.forEach(col => {
      lines.push(col.slice(1));
    });
    const colors = Object.keys(entry.colors)
        .map(key => entry.colors[key]);
    return {
      lines,
      colors,
    };
  };

  /**
   * @param {number} width
   * @param {number} height
   * @param {Array.<Array<number>>} entry
   * @return {Array.<Array.<number>>}
   */
  normalizeEntry(width, height, entry) {
    const minX = entry[0];
    const maxX = entry[entry.length - 1];
    const maxY = entry.slice(1).reduce((max, line) => Math.max(max,
        Math.max.apply(...line)), -Infinity);
    const minY = entry.slice(1).reduce((max, line) => Math.min(max,
        Math.min.apply(...line)), +Infinity);

    return entry.map(vector => {
      return [
        normalizeValue(vector[0], minX, maxX, 0, canvasWidth, true)
      ].concat(vector.slice(1).map(v => this.normalizeValue(vector[0],
          minX, maxX, 0, canvasWidth, false)
      ))
    });
  };

  /**
   * @param {number} value
   * @param {number} minValue
   * @param {number} maxValue
   * @param {number} screenMin
   * @param {number} screenMax
   * @param {boolean} isY
   * @return {number}
   * */
  normalizeValue(value, minValue, maxValue, screenMin, screenMax, isY) {
    const coordinate = Math.round(value / (maxValue - minValue) * (screenMax - screenMin));
    return isY ? screenMax - coordinate : coordinate;
  }


  render() {
    requestAnimationFrame(() => {
      this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      const linesNumber = this.state.lines.length;
      for (let counter = 1; counter < linesNumber; counter++) {
        this.context.beginPath();
        this.context.strokeStyle = this.state.colors[counter - 1];
        this.context.strokeWidth = 2;
        this.state.lines[counter].forEach((y, index) => {
          this.context.lineTo(this.state.lines[0][index], y);
        });
        this.context.stroke();
      }

      if (this.checkRender()) {
        this.render();
      }
    });
  }

  checkRender() {
    return true
  }
}

/**
 * @typedef {State}
 */
const State = {
  lines: [],
  colors: [],
  currentMin: 0,
  currentMax: 0,
};