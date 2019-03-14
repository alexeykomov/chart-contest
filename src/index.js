/*
 * Copyright (c) 2017. Whisp, Alex K.
 */

/**
 * @fileoverview Application entry point.
 * @author alexeykcontact@gmail.com (Alex K)
 */

import { data } from './data';

const chart = new Chart(0);
window.addEventListener('DOMContentLoaded', () => chart.onLoad(), false);
window.addEventListener('unload', () => chart.onUnLoad(), false);

class Chart {
  /**
   * @param {number} chartNumber
   */
  constructor(chartNumber) {
    /** @type {HTMLCanvasElement} */
    this.mainCanvas = null;
    /** @type {HTMLCanvasElement} */
    this.legendCanvas = null;
    /** @type {HTMLButtonElement} */
    this.buttonOk = null;
    /** @type {HTMLButtonElement} */
    this.buttonCancel = null;
    /** @type {CanvasRenderingContext2D} */
    this.context = null;
    /** @type {CanvasRenderingContext2D} */
    this.contextLegend = null;
    this.chartNumber = chartNumber;

    this.state = {
      mainCanvasWidth: 0,
      mainCanvasHeight: 100,
      legendCanvasWidth: 0,
      legendCanvasHeight: 100,

      linesMain: [],
      linesLegend: [],

      minXMain: 0,
      maxXMain: 0,
      minYMain: 0,
      maxYMain: 0,

      minXLegend: 0,
      maxXLegend: 0,
      minYLegend: 0,
      maxYLegend: 0,

      colors: [],
    };
    this.formatDataEntry(this.state, data[chartNumber]);
  }

  onLoad() {
    this.mainCanvas = document.querySelector(
      `main:nth-child(${this.chartNumber}) .main-canvas`,
    );
    this.legendCanvas = document.querySelector(
      `main:nth-child(${this.chartNumber}) .legend-canvas`,
    );
    this.context = this.setupCanvas(this.mainCanvas);
    this.contextLegend = this.setupCanvas(this.legendCanvas);

    this.state.mainCanvasWidth = this.mainCanvas.width;
    this.state.mainCanvasHeight = this.mainCanvas.height;
    this.state.legendCanvasWidth = this.legendCanvas.width;
    this.state.legendCanvasHeight = this.legendCanvas.height;

    this.maxXMain = this.mainCanvas.width;
    this.maxYMain = this.mainCanvas.height;
    this.maxXLegend = this.legendCanvas.width;
    this.maxYLegend = this.legendCanvas.height;

    this.render();
  }

  /**
   * @type {HTMLCanvasElement} canvasEl
   * @return {CanvasRenderingContext2D}
   * */
  setupCanvas(canvasEl) {
    const context = canvasEl.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    context.scale(dpr, dpr);
    return context;
  }

  onUnLoad() {}

  /**
   * @param {State} state
   * @param {DataEntry} entry
   * @return {State}
   */
  formatDataEntry(state, entry) {
    const linesMain = [];
    const linesLegend = [];
    entry.columns.forEach(col => {
      linesMain.push(col.slice(1));
      linesLegend.push(col.slice(1));
    });
    const colors = Object.keys(entry.colors).map(key => entry.colors[key]);

    state.linesMain = linesMain;
    state.linesLegend = linesLegend;
    state.colors = colors;

    return state;
  }

  normalizeLines() {
    this.normalizeEntry(
      this.state.mainCanvasWidth,
      this.state.mainCanvasHeight,
      this.state.linesMain,
    );
    this.normalizeEntry(
      this.state.mainCanvasWidth,
      this.state.mainCanvasHeight,
      this.state.linesMain,
    );
  }

  /**
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {Array.<Array<number>>} lines
   * @return {Array.<Array.<number>>}
   */
  normalizeEntry(canvasWidth, canvasHeight, lines) {
    const minX = lines[0][0];
    const maxX = lines[0][lines.length - 1];
    const maxY = lines
      .slice(1)
      .reduce((max, line) => Math.max(max, Math.max.apply(...line)), -Infinity);
    const minY = lines
      .slice(1)
      .reduce((max, line) => Math.min(max, Math.min.apply(...line)), +Infinity);

    return lines.map(vector => {
      return [
        this.normalizeValue(vector[0], minX, maxX, 0, canvasWidth, true),
      ].concat(
        vector
          .slice(1)
          .map(v =>
            this.normalizeValue(vector[0], minX, maxX, 0, canvasWidth, false),
          ),
      );
    });
  }

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
    const coordinate = Math.round(
      (value / (maxValue - minValue)) * (screenMax - screenMin),
    );
    return isY ? screenMax - coordinate : coordinate;
  }

  render() {
    requestAnimationFrame(() => {
      context.clearRect(
        0,
        0,
        this.state.mainCanvasWidth,
        this.state.mainCanvasHeight,
      );

      const normalizedLinesMain = this.normalizeEntry(
        this.state.mainCanvasWidth,
        this.state.mainCanvasHeight,
        this.state.linesMain,
      );
      this.renderLines(normalizedLinesMain);

      const normalizedLinesLegend = this.normalizeEntry(
        this.state.mainCanvasWidth,
        this.state.mainCanvasHeight,
        this.state.linesMain,
      );
      this.renderLines(normalizedLinesLegend);

      if (this.checkRender()) {
        this.render();
      }
    });
  }

  renderLines(context, lines) {
    const linesNumber = lines.length;
    for (let counter = 1; counter < linesNumber; counter++) {
      context.beginPath();
      context.strokeStyle = this.state.colors[counter - 1];
      context.strokeWidth = 2;
      lines[counter].forEach((y, index) => {
        context.lineTo(lines[0][index], y);
      });
      context.stroke();
    }
  }

  checkRender() {
    return true;
  }
}

/** @typedef {{
      linesMain: Array.<Array.<number>>,
      linesLegend: Array.<Array.<number>>,

      minXMain: number,
      maxXMain: number,
      minYMain: number,
      maxYMain: number,

      minXLegend: number,
      maxXLegend: number,
      minYLegend: number,
      maxYLegend: number,

      colors: Array.<string>

}} */
const State = {};
